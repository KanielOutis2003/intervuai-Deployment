"""Groq AI service for interview coaching."""
import json
import re
import logging
from groq import Groq
from app.config.config import Config

logger = logging.getLogger(__name__)

# In-memory session store: { session_id: [{'role': 'user'/'assistant', 'content': '...'}] }
_sessions: dict[str, list[dict]] = {}
# Per-session custom system prompts (set when interview type is known)
_session_prompts: dict[str, str] = {}

_BASE_SYSTEM_PROMPT = """You are a senior hiring manager conducting a real one-on-one job interview. You are NOT a chatbot or coach — you are the interviewer. Behave exactly like a real human interviewer would in a professional interview setting.

PERSONALITY & TONE:
- Professional yet approachable — mirror a real corporate interview
- Use natural conversational language, not robotic prompts
- Occasionally acknowledge the candidate's answer before asking the next question (e.g. "That's interesting.", "I see.", "Good point.")
- If the candidate gives a vague answer, follow up and probe deeper — just like a real interviewer would
- If the candidate goes off-topic, gently redirect them back to the question
- Vary your question style — don't always start with "Tell me about..." or "Can you describe..."

INTERVIEW FLOW:
1. Opening (1-2 questions): Warm greeting, ask candidate to introduce themselves, ask why they're interested in this role
2. Technical/Role-specific (3-4 questions): Core skills, experience, domain knowledge relevant to the role
3. Behavioral (2-3 questions): Past experiences using STAR method, teamwork, conflict resolution, leadership
4. Closing (1 question): Ask if they have questions, thank them professionally

DIFFICULTY PROGRESSION:
- Opening: Easy, warm-up questions to put the candidate at ease
- Early technical: Moderate difficulty — foundational knowledge
- Mid technical/behavioral: Higher difficulty — ask for specific examples, deeper reasoning, follow-up probes
- Late behavioral/closing: Challenging — complex scenarios, edge cases, "what would you do differently" reflections
- Increase difficulty naturally based on how well the candidate answers — strong answers earn harder follow-ups

RAMBLING & BREVITY DETECTION:
- If the candidate's answer is very short (under 20 words), note it as "too_brief" in answer_length_feedback
- If the candidate rambles (over 200 words without clear structure), note it as "too_long" in answer_length_feedback
- Ideal answers are 50-150 words, well-structured with examples — note as "good_length"

When you receive "START_INTERVIEW. Role:", greet the candidate as if they just walked into your office. Be warm but professional. Ask them to introduce themselves. Do NOT evaluate the start trigger.

After EACH candidate answer, respond STRICTLY in this JSON format (no text outside the JSON):
{
  "next_question": "Your natural interviewer response + next question",
  "evaluation": {
    "grammar_score": 0-100,
    "relevance_score": 0-100,
    "overall_quality": 0-100,
    "confidence_score": 0-100,
    "clarity_score": 0-100,
    "structure_score": 0-100,
    "engagement_score": 0-100,
    "feedback": "Brief specific feedback as if writing interview notes",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["area to improve 1", "area to improve 2"],
    "answer_length_feedback": "too_brief or good_length or too_long",
    "star_usage": true or false,
    "used_examples": true or false
  },
  "interview_phase": "opening or technical or behavioral or closing",
  "difficulty_level": "easy or moderate or challenging",
  "is_complete": false
}

EVALUATION CRITERIA:
- grammar_score: Sentence structure, word choice, professional vocabulary
- relevance_score: How well the answer addresses the question asked
- overall_quality: Depth of answer, use of examples, STAR structure for behavioral questions
- confidence_score: Assertiveness, directness, avoiding filler words (um, uh, like)
- clarity_score: Organization of thoughts, coherence, conciseness
- structure_score: How well-organized the answer is — did they use a clear framework (STAR for behavioral, problem-solution-result for technical)? Logical flow? Clear beginning, middle, end?
- engagement_score: Did the candidate show enthusiasm, provide thoughtful responses, ask clarifying questions? Does the answer feel genuine and engaged vs. generic and rehearsed?

When you have asked 8-10 questions total and received all answers, set is_complete to true:
{
  "next_question": "Thank the candidate naturally and professionally — as a real interviewer would wrap up",
  "evaluation": { ... },
  "interview_phase": "closing",
  "is_complete": true,
  "final_summary": {
    "overall_readiness_score": 0-100,
    "communication_score": 0-100,
    "technical_readiness": 0-100,
    "behavioral_readiness": 0-100,
    "key_observations": ["observation 1", "observation 2", "observation 3"],
    "top_strengths": ["strength 1", "strength 2", "strength 3"],
    "areas_for_improvement": ["area 1", "area 2", "area 3"],
    "hiring_recommendation": "strong_hire or hire or maybe or no_hire",
    "summary_paragraph": "A 2-3 sentence overall assessment of the candidate",
    "coaching_tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
  }
}

For the START_INTERVIEW trigger only:
{
  "next_question": "Your warm, natural greeting and opening question",
  "evaluation": null,
  "interview_phase": "opening",
  "difficulty_level": "easy",
  "is_complete": false
}

IMPORTANT: Always respond with valid JSON only. Never include text outside the JSON object."""

_TYPE_GUIDANCE = {
    'technical': (
        "INTERVIEW TYPE: Technical\n"
        "Focus exclusively on technical skills, problem-solving approaches, system design, "
        "coding concepts, architecture decisions, and technology-specific knowledge relevant "
        "to the role. Progress from fundamentals to advanced topics. Ask candidates to walk "
        "through their technical reasoning step by step."
    ),
    'behavioral': (
        "INTERVIEW TYPE: Behavioral\n"
        "Use the STAR method (Situation, Task, Action, Result) for every question. Ask about "
        "past real experiences: how the candidate handled conflict, demonstrated leadership, "
        "overcame failure, collaborated with teams, and showed professional growth. "
        "Probe for specifics — push for concrete examples, not hypotheticals."
    ),
    'situational': (
        "INTERVIEW TYPE: Situational\n"
        "Pose hypothetical 'What would you do if...' scenarios to test judgment, "
        "decision-making under pressure, ethical reasoning, and problem-solving. "
        "Each question should present a realistic workplace challenge relevant to the role. "
        "Evaluate how the candidate thinks through ambiguous situations."
    ),
    'mixed': (
        "INTERVIEW TYPE: Mixed\n"
        "Balance your 8-10 questions across all types: 2-3 technical questions about role "
        "skills, 2-3 behavioral STAR questions about past experiences, 2-3 situational "
        "hypothetical scenarios, and 1-2 opening/culture-fit questions."
    ),
    'general': (
        "INTERVIEW TYPE: General\n"
        "Mix opening introduction questions, role-specific questions about skills and experience, "
        "a few behavioral questions using the STAR method, and a closing discussion. "
        "Tailor depth to the role:\n"
        "- Technology roles: technical skills, problem-solving, system design\n"
        "- Healthcare roles: patient care, protocols, clinical reasoning\n"
        "- BPO roles: communication, problem resolution, empathy\n"
        "- Finance roles: analytical skills, compliance, attention to detail\n"
        "- Any other role: adapt naturally to domain"
    ),
}


class GroqService:

    @staticmethod
    def build_prompt(interview_type: str = 'general', seed_questions: list = None) -> str:
        """
        Build a per-session system prompt combining the base prompt, interview-type
        guidance, and optional seed questions from the question bank.
        """
        type_key = interview_type.lower() if interview_type else 'general'
        guidance = _TYPE_GUIDANCE.get(type_key, _TYPE_GUIDANCE['general'])
        prompt = _BASE_SYSTEM_PROMPT + '\n\n' + guidance

        if seed_questions:
            prompt += (
                '\n\nREFERENCE QUESTION BANK — use these questions directly or as close '
                'variations during the interview (prioritise these over generic questions):\n'
            )
            for i, q in enumerate(seed_questions, 1):
                prompt += f'{i}. {q}\n'

        return prompt

    @staticmethod
    def set_session_prompt(session_id: str, prompt: str) -> None:
        """Store a custom system prompt for a session (called on START_INTERVIEW)."""
        _session_prompts[session_id] = prompt

    @staticmethod
    def _build_messages(session_id: str, user_message: str) -> list:
        """Build the full messages list for a session (shared by chat and stream_chat)."""
        if session_id not in _sessions:
            _sessions[session_id] = []
        history = _sessions[session_id]
        system_prompt = _session_prompts.get(session_id) or _BASE_SYSTEM_PROMPT
        return [
            {'role': 'system', 'content': system_prompt},
            *history,
            {'role': 'user', 'content': user_message},
        ]

    @staticmethod
    def chat(session_id: str, user_message: str) -> dict:
        """
        Send a message in a session and return the AI response.

        Uses the model/token/temperature settings from Config for easy tuning.
        Maintains per-session conversation history so Groq can follow the
        interview flow across multiple turns.
        """
        client = Groq(api_key=Config.GROQ_API_KEY)
        messages = GroqService._build_messages(session_id, user_message)

        try:
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=messages,
                max_tokens=Config.GROQ_MAX_TOKENS,
                temperature=Config.GROQ_TEMPERATURE,
            )
            assistant_text = response.choices[0].message.content

            _sessions[session_id].append({'role': 'user', 'content': user_message})
            _sessions[session_id].append({'role': 'assistant', 'content': assistant_text})

            logger.info('Groq response for session %s: %d chars (model=%s)',
                        session_id, len(assistant_text), Config.GROQ_MODEL)
            return {'text': assistant_text}

        except Exception as exc:
            logger.error('Groq API error for session %s: %s', session_id, str(exc))
            raise

    @staticmethod
    def stream_chat(session_id: str, user_message: str):
        """
        Generator that streams Groq response tokens as SSE-formatted lines.

        Yields:
            str: SSE 'data: <json>\\n\\n' lines — either a chunk or a done signal.

        The caller (Flask route) should wrap this in stream_with_context and
        return it as a text/event-stream Response.
        """
        client = Groq(api_key=Config.GROQ_API_KEY)
        messages = GroqService._build_messages(session_id, user_message)
        accumulated = ''

        try:
            stream = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=messages,
                max_tokens=Config.GROQ_MAX_TOKENS,
                temperature=Config.GROQ_TEMPERATURE,
                stream=True,
            )
            for chunk in stream:
                delta = (chunk.choices[0].delta.content or '') if chunk.choices else ''
                if delta:
                    accumulated += delta
                    yield f'data: {json.dumps({"chunk": delta})}\n\n'

            # Persist complete exchange to in-memory history
            if session_id not in _sessions:
                _sessions[session_id] = []
            _sessions[session_id].append({'role': 'user', 'content': user_message})
            _sessions[session_id].append({'role': 'assistant', 'content': accumulated})

            logger.info('Groq stream complete for session %s: %d chars', session_id, len(accumulated))
            yield f'data: {json.dumps({"done": True, "full_text": accumulated})}\n\n'

        except Exception as exc:
            logger.error('Groq stream error for session %s: %s', session_id, str(exc))
            yield f'data: {json.dumps({"error": str(exc)})}\n\n'

    @staticmethod
    def clear_session(session_id: str) -> None:
        """Remove conversation history and custom prompt for a session."""
        _sessions.pop(session_id, None)
        _session_prompts.pop(session_id, None)
        logger.info('Cleared Groq session: %s', session_id)

    @staticmethod
    def parse_response(raw_text: str) -> dict:
        """
        Parse Groq's response text into a structured dict.

        Handles: plain JSON, markdown-fenced JSON, JSON embedded in prose.
        Falls back to { next_question: rawText } on parse failure.
        """
        try:
            cleaned = re.sub(r'```json\s*|```', '', raw_text).strip()
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            if start != -1 and end != -1:
                return json.loads(cleaned[start:end + 1])
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            return {
                'next_question': raw_text,
                'evaluation': None,
                'interview_phase': 'unknown',
                'is_complete': False,
                'parse_error': True,
            }

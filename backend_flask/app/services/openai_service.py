"""OpenAI service for AI-powered features."""
import json
from typing import List, Dict
from openai import OpenAI
from app.config.config import Config
from app.utils.responses import APIError


_openai_client: OpenAI | None = None

def get_openai_client():
    """Get or create a reusable OpenAI client instance."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=Config.OPENAI_API_KEY)
    return _openai_client


class OpenAIService:
    """Service for OpenAI integrations."""

    @staticmethod
    def analyze_feedback(
        question_text: str,
        user_response: str,
        expected_keywords: List[str],
        job_role: str
    ) -> Dict:
        """Analyze user's interview response using GPT-4."""
        prompt = f"""You are an expert interview coach analyzing a candidate's response for a {job_role} position.

Question: "{question_text}"

Candidate's Response: "{user_response}"

Expected Keywords: {', '.join(expected_keywords)}

Please analyze the response and provide:
1. Relevance Score (0-100): How well does the response answer the question?
2. Grammar Score (0-100): Quality of grammar and communication
3. Confidence Score (0-100): How confident and clear is the response?
4. Keywords Matched: Which expected keywords were mentioned?
5. Detailed Feedback: What did they do well and what could be improved?
6. Suggestions: 2-3 actionable suggestions for improvement

Return your analysis in the following JSON format:
{{
  "relevanceScore": <number>,
  "grammarScore": <number>,
  "confidenceScore": <number>,
  "keywordsMatched": [<array of matched keywords>],
  "feedback": "<detailed feedback>",
  "suggestions": [<array of suggestions>]
}}"""

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert interview coach. Provide constructive, helpful feedback in JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = completion.choices[0].message.content
            if not content:
                raise APIError('No response from OpenAI', 500)

            analysis = json.loads(content)
            return analysis

        except Exception as e:
            raise APIError(f'Failed to analyze feedback: {str(e)}', 500)

    @staticmethod
    def generate_questions(
        job_role: str,
        count: int = 5,
        difficulty: str = 'medium'
    ) -> List[Dict]:
        """Generate interview questions for a specific job role."""
        prompt = f"""Generate {count} {difficulty} interview questions for a {job_role} position.

For each question, provide:
1. The question text
2. Category (e.g., Technical, Behavioral, Problem-Solving, etc.)
3. Difficulty level
4. 3-5 expected keywords that a good answer should include

Return your response in the following JSON format:
{{
  "questions": [
    {{
      "questionText": "<question>",
      "category": "<category>",
      "difficulty": "<difficulty>",
      "expectedKeywords": [<array of keywords>]
    }}
  ]
}}"""

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert technical interviewer. Generate thoughtful, role-specific interview questions in JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                response_format={"type": "json_object"}
            )

            content = completion.choices[0].message.content
            if not content:
                raise APIError('No response from OpenAI', 500)

            result = json.loads(content)
            return result.get('questions', [])

        except Exception as e:
            raise APIError(f'Failed to generate questions: {str(e)}', 500)

    @staticmethod
    def generate_interview_report(
        job_role: str,
        overall_score: float,
        verbal_score: float,
        non_verbal_score: float,
        feedback_list: List[Dict]
    ) -> str:
        """Generate a comprehensive interview report."""
        feedback_summary = '\n'.join([
            f"{i + 1}. Question: {f['question']}\n"
            f"   Response: {f['response']}\n"
            f"   Score: {f['score']}/100\n"
            f"   Feedback: {f['feedback']}\n"
            for i, f in enumerate(feedback_list)
        ])

        prompt = f"""Generate a comprehensive interview performance report for a {job_role} candidate.

Overall Score: {overall_score}/100
Verbal Score: {verbal_score}/100
Non-Verbal Score: {non_verbal_score}/100

Question-by-Question Performance:
{feedback_summary}

Please provide:
1. Executive Summary
2. Key Strengths (3-4 points)
3. Areas for Improvement (3-4 points)
4. Specific Recommendations for preparation
5. Overall assessment and next steps

Format the report in a professional, encouraging tone."""

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert career coach providing comprehensive interview feedback reports."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7
            )

            report = completion.choices[0].message.content
            if not report:
                raise APIError('No response from OpenAI', 500)

            return report

        except Exception as e:
            raise APIError(f'Failed to generate report: {str(e)}', 500)

    @staticmethod
    def generate_interview_response(
        job_role: str,
        current_question: str,
        user_message: str,
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Generate AI interviewer response during live interview session.

        Args:
            job_role: The job role being interviewed for
            current_question: The current interview question
            user_message: The user's latest message
            conversation_history: Previous messages in the conversation

        Returns:
            AI interviewer's response as a string

        Raises:
            APIError: If response generation fails
        """
        system_prompt = f"""You are an AI interviewer conducting an interview for a {job_role} position.
Be professional, encouraging, and helpful. Ask follow-up questions when appropriate,
provide gentle guidance if the candidate seems stuck, and maintain a conversational but professional tone.
Keep your responses concise (2-3 sentences typically)."""

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)

        # Add context about current question
        context_message = f"Current question being discussed: {current_question}"
        messages.append({"role": "system", "content": context_message})

        # Add user's latest message
        messages.append({"role": "user", "content": user_message})

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.8,
                max_tokens=200
            )

            response = completion.choices[0].message.content
            if not response:
                raise APIError('No response from OpenAI', 500)

            return response

        except Exception as e:
            raise APIError(f'Failed to generate interview response: {str(e)}', 500)

    @staticmethod
    def analyze_nlp(text: str) -> Dict:
        """Analyze text for NLP metrics (sentiment, filler words, clarity, vocabulary)."""
        prompt = f"""Analyze the following interview response text for NLP metrics:

Text: "{text}"

Provide the following analysis in JSON format:
{{
  "sentiment": "<positive/neutral/negative>",
  "sentimentScore": <0-100>,
  "fillerWords": [<list of detected filler words like "um", "uh", "like", "you know">],
  "fillerWordCount": <count>,
  "clarityScore": <0-100>,
  "vocabularyScore": <0-100>,
  "grammarScore": <0-100>,
  "paceScore": <0-100>,
  "feedback": "<brief feedback on communication quality>"
}}"""

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an NLP analysis expert. Analyze text and return metrics in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = completion.choices[0].message.content
            if not content:
                raise APIError('No response from OpenAI', 500)

            return json.loads(content)

        except Exception as e:
            raise APIError(f'Failed to analyze NLP: {str(e)}', 500)

    @staticmethod
    def generate_session_summary(interview_data: Dict) -> Dict:
        """Generate a comprehensive session summary."""
        prompt = f"""Generate a comprehensive interview session summary based on the following data:

Job Role: {interview_data.get('job_role', 'Unknown')}
Overall Score: {interview_data.get('overall_score', 'N/A')}/100
Verbal Score: {interview_data.get('verbal_score', 'N/A')}/100
Non-Verbal Score: {interview_data.get('non_verbal_score', 'N/A')}/100
Feedback Count: {interview_data.get('feedback_count', 0)}
Messages Exchanged: {interview_data.get('message_count', 0)}

Return a JSON object with:
{{
  "summaryText": "<2-3 paragraph summary of the session>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "overallAssessment": "<1-2 sentence overall assessment>",
  "scoreBreakdown": {{
    "communication": <0-100>,
    "content": <0-100>,
    "confidence": <0-100>,
    "professionalism": <0-100>
  }}
}}"""

        try:
            client = get_openai_client()
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a career coach generating detailed interview session summaries in JSON format."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = completion.choices[0].message.content
            if not content:
                raise APIError('No response from OpenAI', 500)

            return json.loads(content)

        except Exception as e:
            raise APIError(f'Failed to generate session summary: {str(e)}', 500)

"""Analysis service for NLP analysis, AI feedback, and session summaries."""

from typing import Dict, Any, List, Optional
from app.config.supabase_client import supabase_admin
from app.services.openai_service import OpenAIService
from app.utils.responses import APIError


class AnalysisService:
    """Service class for NLP analysis, AI feedback, and session summaries."""

    @staticmethod
    def analyze_nlp(interview_id: str, text: str, question_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Run NLP analysis on a user's response text.

        Args:
            interview_id: The interview ID
            text: Text to analyze
            question_id: Optional question ID

        Returns:
            Dict containing NLP analysis results

        Raises:
            APIError: If analysis fails
        """
        try:
            # Call OpenAI for NLP analysis
            analysis = OpenAIService.analyze_nlp(text)

            # Save analysis to database
            analysis_insert = {
                'interview_id': interview_id,
                'question_id': question_id,
                'sentiment': analysis.get('sentiment', 'neutral'),
                'sentiment_score': analysis.get('sentimentScore', 0),
                'filler_words': analysis.get('fillerWords', []),
                'filler_word_count': analysis.get('fillerWordCount', 0),
                'clarity_score': analysis.get('clarityScore', 0),
                'vocabulary_score': analysis.get('vocabularyScore', 0),
                'grammar_score': analysis.get('grammarScore', 0),
                'pace_score': analysis.get('paceScore', 0),
                'analysis_data': analysis
            }

            response = supabase_admin.table('nlp_analyses').insert(analysis_insert).execute()

            if not response.data:
                raise APIError("Failed to save NLP analysis", 500)

            saved = response.data[0]
            return {
                "id": saved['id'],
                "interviewId": saved['interview_id'],
                "questionId": saved.get('question_id'),
                "sentiment": saved.get('sentiment'),
                "sentimentScore": saved.get('sentiment_score'),
                "fillerWords": saved.get('filler_words', []),
                "fillerWordCount": saved.get('filler_word_count', 0),
                "clarityScore": saved.get('clarity_score'),
                "vocabularyScore": saved.get('vocabulary_score'),
                "grammarScore": saved.get('grammar_score'),
                "paceScore": saved.get('pace_score'),
                "analysisData": saved.get('analysis_data', {}),
                "createdAt": saved['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to perform NLP analysis: {str(e)}", 500)

    @staticmethod
    def get_interview_analyses(interview_id: str) -> List[Dict[str, Any]]:
        """
        Get all NLP analyses for an interview.

        Args:
            interview_id: The interview ID

        Returns:
            List of NLP analysis dicts
        """
        try:
            response = supabase_admin.table('nlp_analyses').select('*').eq('interview_id', interview_id).order('created_at', desc=True).execute()

            analyses = []
            for a in response.data:
                analyses.append({
                    "id": a['id'],
                    "interviewId": a['interview_id'],
                    "questionId": a.get('question_id'),
                    "sentiment": a.get('sentiment'),
                    "sentimentScore": a.get('sentiment_score'),
                    "fillerWords": a.get('filler_words', []),
                    "fillerWordCount": a.get('filler_word_count', 0),
                    "clarityScore": a.get('clarity_score'),
                    "vocabularyScore": a.get('vocabulary_score'),
                    "grammarScore": a.get('grammar_score'),
                    "paceScore": a.get('pace_score'),
                    "analysisData": a.get('analysis_data', {}),
                    "createdAt": a['created_at']
                })

            return analyses
        except Exception as e:
            raise APIError(f"Failed to fetch NLP analyses: {str(e)}", 500)

    @staticmethod
    def generate_ai_feedback(interview_id: str, question_id: str, question_text: str, user_response: str, job_role: str, expected_keywords: List[str] = None) -> Dict[str, Any]:
        """
        Generate AI feedback for a user's response.

        Args:
            interview_id: The interview ID
            question_id: The question ID
            question_text: The interview question text
            user_response: The user's response text
            job_role: The job role
            expected_keywords: Optional expected keywords

        Returns:
            Dict containing AI feedback

        Raises:
            APIError: If feedback generation fails
        """
        try:
            # Generate feedback via OpenAI
            feedback = OpenAIService.analyze_feedback(
                question_text=question_text,
                user_response=user_response,
                expected_keywords=expected_keywords or [],
                job_role=job_role
            )

            # Save feedback to database
            feedback_insert = {
                'interview_id': interview_id,
                'question_id': question_id,
                'user_response': user_response,
                'relevance_score': feedback.get('relevanceScore'),
                'grammar_score': feedback.get('grammarScore'),
                'confidence_score': feedback.get('confidenceScore'),
                'keywords_matched': feedback.get('keywordsMatched', []),
                'ai_feedback': feedback.get('feedback', '')
            }

            response = supabase_admin.table('feedback').insert(feedback_insert).execute()

            return {
                "feedback": feedback,
                "saved": bool(response.data)
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to generate AI feedback: {str(e)}", 500)

    @staticmethod
    def generate_session_summary(interview_id: str) -> Dict[str, Any]:
        """
        Generate a comprehensive session summary for an interview.

        Args:
            interview_id: The interview ID

        Returns:
            Dict containing session summary

        Raises:
            APIError: If summary generation fails
        """
        try:
            # Get interview data
            interview_response = supabase_admin.table('interviews').select('*').eq('id', interview_id).execute()
            if not interview_response.data:
                raise APIError("Interview not found", 404)

            interview = interview_response.data[0]

            # Get feedback data
            feedback_response = supabase_admin.table('feedback').select('*').eq('interview_id', interview_id).execute()
            feedback_list = feedback_response.data or []

            # Get NLP analyses
            nlp_response = supabase_admin.table('nlp_analyses').select('*').eq('interview_id', interview_id).execute()
            nlp_list = nlp_response.data or []

            # Get chat messages
            chat_response = supabase_admin.table('chat_messages').select('*').eq('interview_id', interview_id).order('timestamp', desc=False).execute()
            chat_messages = chat_response.data or []

            # Build interview data for OpenAI
            interview_data = {
                'job_role': interview.get('job_role', 'Unknown'),
                'overall_score': interview.get('overall_score', 0),
                'verbal_score': interview.get('verbal_score', 0),
                'non_verbal_score': interview.get('non_verbal_score', 0),
                'feedback_count': len(feedback_list),
                'message_count': len(chat_messages),
                'nlp_analyses': nlp_list
            }

            # Generate summary via OpenAI
            summary = OpenAIService.generate_session_summary(interview_data)

            # Save or update summary in database
            summary_insert = {
                'interview_id': interview_id,
                'summary_text': summary.get('summaryText', ''),
                'strengths': summary.get('strengths', []),
                'improvements': summary.get('improvements', []),
                'recommendations': summary.get('recommendations', []),
                'overall_assessment': summary.get('overallAssessment', ''),
                'score_breakdown': summary.get('scoreBreakdown', {})
            }

            # Try insert, if exists update
            existing = supabase_admin.table('session_summaries').select('id').eq('interview_id', interview_id).execute()

            if existing.data:
                response = supabase_admin.table('session_summaries').update(summary_insert).eq('interview_id', interview_id).execute()
            else:
                response = supabase_admin.table('session_summaries').insert(summary_insert).execute()

            if not response.data:
                raise APIError("Failed to save session summary", 500)

            saved = response.data[0]
            return {
                "id": saved['id'],
                "interviewId": saved['interview_id'],
                "summaryText": saved.get('summary_text'),
                "strengths": saved.get('strengths', []),
                "improvements": saved.get('improvements', []),
                "recommendations": saved.get('recommendations', []),
                "overallAssessment": saved.get('overall_assessment'),
                "scoreBreakdown": saved.get('score_breakdown', {}),
                "createdAt": saved['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to generate session summary: {str(e)}", 500)

    @staticmethod
    def get_session_summary(interview_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session summary for an interview.

        Args:
            interview_id: The interview ID

        Returns:
            Dict containing session summary or None

        Raises:
            APIError: If fetch fails
        """
        try:
            response = supabase_admin.table('session_summaries').select('*').eq('interview_id', interview_id).execute()

            if not response.data:
                return None

            s = response.data[0]
            return {
                "id": s['id'],
                "interviewId": s['interview_id'],
                "summaryText": s.get('summary_text'),
                "strengths": s.get('strengths', []),
                "improvements": s.get('improvements', []),
                "recommendations": s.get('recommendations', []),
                "overallAssessment": s.get('overall_assessment'),
                "scoreBreakdown": s.get('score_breakdown', {}),
                "createdAt": s['created_at'],
                "updatedAt": s.get('updated_at')
            }
        except Exception as e:
            raise APIError(f"Failed to fetch session summary: {str(e)}", 500)

    # ── Groq config mirrors (kept in sync with groq_service.py) ──────────────
    _GROQ_TEMP       = 0.5
    _GROQ_MAX_TOKENS = 700

    @staticmethod
    def _hiring_recommendation(total_score: float) -> str:
        """Map a 0-100 composite score to a hiring recommendation label.

        Thresholds chosen to match Groq temperature=0.5 / max_tokens=700
        scoring behaviour (conservative, rarely above 90).

        Weighted formula:
            TotalScore = (GroqVerbalAvg × 0.7) + (MediaPipeNonVerbalAvg × 0.3)
        """
        if total_score >= 80:
            return 'strong_hire'
        if total_score >= 65:
            return 'hire'
        if total_score >= 45:
            return 'maybe'
        return 'no_hire'

    @staticmethod
    def record_mediapipe_and_score(
        interview_id: str,
        eye_contact_ratio: Optional[float],
        posture_score: Optional[float],
        sample_count: int,
        groq_verbal_avg: Optional[float],
        session_buffer: Optional[list],
    ) -> Dict[str, Any]:
        """Persist MediaPipe non-verbal data and compute weighted composite score.

        Formula (from master guide):
            TotalScore = (GroqVerbalAvg × 0.7) + (MediaPipeNonVerbalAvg × 0.3)

        If groq_verbal_avg is not provided by the frontend, it is derived from
        the feedback table (averages of the 7 Groq-scored dimensions).

        Args:
            interview_id      — interview UUID
            eye_contact_ratio — fraction 0.0-1.0 (MediaPipe average)
            posture_score     — 0-100 (MediaPipe average)
            sample_count      — number of 30-second windows sampled
            groq_verbal_avg   — pre-computed Groq verbal average (optional)
            session_buffer    — list of 30-second snapshots (optional, for storage)

        Returns dict with overallScore, verbalScore, nonVerbalScore,
        hiringRecommendation, and breakdown.
        """
        try:
            import logging
            logger = logging.getLogger(__name__)

            # ── 1. Compute MediaPipe non-verbal average ──────────────────────
            nv_components = []
            if eye_contact_ratio is not None:
                eye_score = round(eye_contact_ratio * 100, 2)
                nv_components.append(eye_score)
            if posture_score is not None:
                nv_components.append(round(posture_score, 2))

            non_verbal_avg = round(sum(nv_components) / len(nv_components), 2) if nv_components else 0.0

            # ── 2. Persist aggregated non-verbal metrics ─────────────────────
            nv_row = {
                'interview_id':     interview_id,
                'eye_contact_avg':  round(eye_contact_ratio * 100, 2) if eye_contact_ratio is not None else None,
                'posture_score':    round(posture_score, 2) if posture_score is not None else None,
                'sample_count':     sample_count,
                'session_buffer':   session_buffer or [],
            }
            # Upsert: update if row exists, insert otherwise
            existing = supabase_admin.table('non_verbal_metrics').select('id').eq('interview_id', interview_id).execute()
            if existing.data:
                supabase_admin.table('non_verbal_metrics').update(nv_row).eq('interview_id', interview_id).execute()
            else:
                supabase_admin.table('non_verbal_metrics').insert(nv_row).execute()

            # ── 3. Groq verbal average ───────────────────────────────────────
            if groq_verbal_avg is not None:
                verbal_avg = round(groq_verbal_avg, 2)
            else:
                # Derive from feedback table (7 Groq-scored dimensions)
                fb = supabase_admin.table('feedback').select(
                    'relevance_score, grammar_score, confidence_score'
                ).eq('interview_id', interview_id).execute()
                fb_data = fb.data or []
                all_scores = []
                for row in fb_data:
                    for col in ('relevance_score', 'grammar_score', 'confidence_score'):
                        val = row.get(col)
                        if val is not None:
                            all_scores.append(float(val))
                verbal_avg = round(sum(all_scores) / len(all_scores), 2) if all_scores else 0.0

            # ── 4. Weighted composite: Groq 70% + MediaPipe 30% ─────────────
            total_score = round(verbal_avg * 0.7 + non_verbal_avg * 0.3, 2)

            # ── 5. Hiring recommendation ─────────────────────────────────────
            recommendation = AnalysisService._hiring_recommendation(total_score)

            # ── 6. Persist to interviews table ───────────────────────────────
            supabase_admin.table('interviews').update({
                'overall_score':      total_score,
                'verbal_score':       verbal_avg,
                'non_verbal_score':   non_verbal_avg,
                'hiring_recommendation': recommendation,
            }).eq('id', interview_id).execute()

            logger.info(
                '[AnalysisService] interview=%s verbal=%.1f non_verbal=%.1f total=%.1f rec=%s',
                interview_id, verbal_avg, non_verbal_avg, total_score, recommendation,
            )

            return {
                'interviewId':          interview_id,
                'overallScore':         total_score,
                'verbalScore':          verbal_avg,
                'nonVerbalScore':       non_verbal_avg,
                'hiringRecommendation': recommendation,
                'breakdown': {
                    'groqVerbalWeight':      0.7,
                    'mediaPipeNonVerbalWeight': 0.3,
                    'eyeContactScore':       round(eye_contact_ratio * 100, 2) if eye_contact_ratio is not None else None,
                    'postureScore':          round(posture_score, 2) if posture_score is not None else None,
                    'sampleCount':           sample_count,
                },
            }
        except APIError:
            raise
        except Exception as exc:
            raise APIError(f'Failed to record MediaPipe scores: {str(exc)}', 500)

    @staticmethod
    def calculate_comprehensive_scores(interview_id: str) -> Dict[str, Any]:
        """
        Calculate comprehensive scores combining verbal, non-verbal, and NLP scores.

        Args:
            interview_id: The interview ID

        Returns:
            Dict containing comprehensive score breakdown

        Raises:
            APIError: If calculation fails
        """
        try:
            # Get feedback scores
            feedback_response = supabase_admin.table('feedback').select('relevance_score, grammar_score, confidence_score').eq('interview_id', interview_id).execute()

            # Get NLP scores
            nlp_response = supabase_admin.table('nlp_analyses').select('clarity_score, vocabulary_score, grammar_score, pace_score').eq('interview_id', interview_id).execute()

            # Get non-verbal metrics
            non_verbal_response = supabase_admin.table('non_verbal_metrics').select('eye_contact, posture_angle').eq('interview_id', interview_id).execute()

            # Calculate averages
            feedback_data = feedback_response.data or []
            nlp_data = nlp_response.data or []
            non_verbal_data = non_verbal_response.data or []

            # Verbal scores (from feedback)
            verbal_scores = {}
            if feedback_data:
                relevance_scores = [f.get('relevance_score', 0) for f in feedback_data if f.get('relevance_score')]
                grammar_scores = [f.get('grammar_score', 0) for f in feedback_data if f.get('grammar_score')]
                confidence_scores = [f.get('confidence_score', 0) for f in feedback_data if f.get('confidence_score')]

                verbal_scores = {
                    "relevance": round(sum(relevance_scores) / len(relevance_scores), 2) if relevance_scores else 0,
                    "grammar": round(sum(grammar_scores) / len(grammar_scores), 2) if grammar_scores else 0,
                    "confidence": round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else 0
                }

            # NLP scores
            nlp_scores = {}
            if nlp_data:
                clarity = [n.get('clarity_score', 0) for n in nlp_data if n.get('clarity_score')]
                vocab = [n.get('vocabulary_score', 0) for n in nlp_data if n.get('vocabulary_score')]
                nlp_grammar = [n.get('grammar_score', 0) for n in nlp_data if n.get('grammar_score')]
                pace = [n.get('pace_score', 0) for n in nlp_data if n.get('pace_score')]

                nlp_scores = {
                    "clarity": round(sum(clarity) / len(clarity), 2) if clarity else 0,
                    "vocabulary": round(sum(vocab) / len(vocab), 2) if vocab else 0,
                    "grammar": round(sum(nlp_grammar) / len(nlp_grammar), 2) if nlp_grammar else 0,
                    "pace": round(sum(pace) / len(pace), 2) if pace else 0
                }

            # Non-verbal scores
            non_verbal_scores = {}
            if non_verbal_data:
                eye_contact_true = sum(1 for nv in non_verbal_data if nv.get('eye_contact'))
                eye_contact_pct = round((eye_contact_true / len(non_verbal_data)) * 100, 2)
                posture_angles = [nv.get('posture_angle', 0) for nv in non_verbal_data if nv.get('posture_angle')]
                avg_posture = round(sum(posture_angles) / len(posture_angles), 2) if posture_angles else 0

                non_verbal_scores = {
                    "eyeContact": eye_contact_pct,
                    "postureAngle": avg_posture,
                    "postureScore": max(0, min(100, 100 - abs(avg_posture) * 2))
                }

            # Calculate overall scores
            verbal_avg = 0
            if verbal_scores:
                verbal_vals = [v for v in verbal_scores.values() if v > 0]
                verbal_avg = round(sum(verbal_vals) / len(verbal_vals), 2) if verbal_vals else 0

            nlp_avg = 0
            if nlp_scores:
                nlp_vals = [v for v in nlp_scores.values() if v > 0]
                nlp_avg = round(sum(nlp_vals) / len(nlp_vals), 2) if nlp_vals else 0

            non_verbal_avg = 0
            if non_verbal_scores:
                non_verbal_avg = round(
                    (non_verbal_scores.get('eyeContact', 0) + non_verbal_scores.get('postureScore', 0)) / 2, 2
                )

            # Weighted overall: verbal 40%, NLP 30%, non-verbal 30%
            overall = round(verbal_avg * 0.4 + nlp_avg * 0.3 + non_verbal_avg * 0.3, 2)

            # Update interview scores
            supabase_admin.table('interviews').update({
                'overall_score': overall,
                'verbal_score': verbal_avg,
                'non_verbal_score': non_verbal_avg
            }).eq('id', interview_id).execute()

            return {
                "interviewId": interview_id,
                "overallScore": overall,
                "verbalScore": verbal_avg,
                "nlpScore": nlp_avg,
                "nonVerbalScore": non_verbal_avg,
                "breakdown": {
                    "verbal": verbal_scores,
                    "nlp": nlp_scores,
                    "nonVerbal": non_verbal_scores
                }
            }
        except Exception as e:
            raise APIError(f"Failed to calculate scores: {str(e)}", 500)

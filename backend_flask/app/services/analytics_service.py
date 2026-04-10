"""Analytics service for performance tracking and reporting."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError


class AnalyticsService:
    """Service class for analytics and reporting operations."""

    @staticmethod
    def get_performance_analytics(user_id: str, period: str = 'all') -> Dict[str, Any]:
        """Get performance analytics for a user."""
        try:
            # Order ASC so chart renders oldest → newest left → right
            query = supabase_admin.table('interviews').select('*').eq('user_id', user_id).eq('status', 'completed').order('created_at', desc=False)

            # Use Python datetime for reliable period filtering (avoids raw SQL strings)
            if period == '7d':
                cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
                query = query.gte('created_at', cutoff)
            elif period == '30d':
                cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
                query = query.gte('created_at', cutoff)
            elif period == '90d':
                cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
                query = query.gte('created_at', cutoff)

            response = query.execute()
            interviews = response.data or []

            scores_over_time = []
            for i in interviews:
                scores_over_time.append({
                    "date": i['created_at'],
                    "overallScore": i.get('overall_score', 0),
                    "verbalScore": i.get('verbal_score', 0),
                    "nonVerbalScore": i.get('non_verbal_score', 0),
                    "jobRole": i.get('job_role')
                })

            overall_scores = [i.get('overall_score', 0) for i in interviews if i.get('overall_score')]
            avg_score = round(sum(overall_scores) / len(overall_scores), 2) if overall_scores else 0
            best_score = max(overall_scores) if overall_scores else 0

            return {
                "totalCompleted": len(interviews),
                "averageScore": avg_score,
                "bestScore": best_score,
                "scoresOverTime": scores_over_time,
                "period": period
            }
        except Exception as e:
            raise APIError(f"Failed to get performance analytics: {str(e)}", 500)

    @staticmethod
    def get_progress_data(user_id: str) -> Dict[str, Any]:
        """Get progress tracking data for a user."""
        try:
            response = supabase_admin.table('interviews').select('overall_score, verbal_score, non_verbal_score, created_at, job_role').eq('user_id', user_id).eq('status', 'completed').order('created_at', desc=False).execute()

            interviews = response.data or []

            if len(interviews) < 2:
                return {
                    "totalSessions": len(interviews),
                    "improvement": 0,
                    "trend": "insufficient_data",
                    "milestones": []
                }

            first_half = interviews[:len(interviews)//2]
            second_half = interviews[len(interviews)//2:]

            first_avg = sum(i.get('overall_score', 0) for i in first_half if i.get('overall_score')) / max(len(first_half), 1)
            second_avg = sum(i.get('overall_score', 0) for i in second_half if i.get('overall_score')) / max(len(second_half), 1)

            improvement = round(second_avg - first_avg, 2)
            trend = "improving" if improvement > 0 else "declining" if improvement < 0 else "stable"

            milestones = []
            for i, interview in enumerate(interviews):
                score = interview.get('overall_score', 0)
                if score and score >= 80 and (i == 0 or interviews[i-1].get('overall_score', 0) < 80):
                    milestones.append({"type": "high_score", "score": score, "date": interview['created_at']})

            return {
                "totalSessions": len(interviews),
                "improvement": improvement,
                "trend": trend,
                "firstHalfAvg": round(first_avg, 2),
                "secondHalfAvg": round(second_avg, 2),
                "milestones": milestones
            }
        except Exception as e:
            raise APIError(f"Failed to get progress data: {str(e)}", 500)

    @staticmethod
    def get_trends(user_id: str) -> Dict[str, Any]:
        """Get trend data for improvement areas."""
        try:
            response = supabase_admin.table('interviews').select('job_role, overall_score, verbal_score, non_verbal_score').eq('user_id', user_id).eq('status', 'completed').execute()

            interviews = response.data or []

            role_scores = {}
            for i in interviews:
                role = i.get('job_role', 'Unknown')
                if role not in role_scores:
                    role_scores[role] = []
                role_scores[role].append(i.get('overall_score', 0))

            role_averages = {}
            for role, scores in role_scores.items():
                valid = [s for s in scores if s]
                role_averages[role] = round(sum(valid) / len(valid), 2) if valid else 0

            verbal_scores = [i.get('verbal_score', 0) for i in interviews if i.get('verbal_score')]
            non_verbal_scores = [i.get('non_verbal_score', 0) for i in interviews if i.get('non_verbal_score')]

            return {
                "rolePerformance": role_averages,
                "averageVerbal": round(sum(verbal_scores) / len(verbal_scores), 2) if verbal_scores else 0,
                "averageNonVerbal": round(sum(non_verbal_scores) / len(non_verbal_scores), 2) if non_verbal_scores else 0,
                "strongestArea": "verbal" if (sum(verbal_scores) / max(len(verbal_scores), 1)) > (sum(non_verbal_scores) / max(len(non_verbal_scores), 1)) else "non_verbal",
                "totalDataPoints": len(interviews)
            }
        except Exception as e:
            raise APIError(f"Failed to get trends: {str(e)}", 500)

    @staticmethod
    def get_score_distribution(user_id: str) -> Dict[str, Any]:
        """Get score distribution data for visualization."""
        try:
            response = supabase_admin.table('interviews').select('overall_score').eq('user_id', user_id).eq('status', 'completed').execute()

            scores = [i.get('overall_score', 0) for i in response.data if i.get('overall_score')]

            distribution = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
            for score in scores:
                if score <= 20: distribution["0-20"] += 1
                elif score <= 40: distribution["21-40"] += 1
                elif score <= 60: distribution["41-60"] += 1
                elif score <= 80: distribution["61-80"] += 1
                else: distribution["81-100"] += 1

            return {"distribution": distribution, "totalScores": len(scores)}
        except Exception as e:
            raise APIError(f"Failed to get score distribution: {str(e)}", 500)

    @staticmethod
    def get_timeline_data(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get timeline data for visualization."""
        try:
            response = supabase_admin.table('interviews').select('id, job_role, overall_score, verbal_score, non_verbal_score, status, created_at').eq('user_id', user_id).order('created_at', desc=True).limit(limit).execute()

            return [{
                "id": i['id'],
                "jobRole": i.get('job_role'),
                "overallScore": i.get('overall_score'),
                "verbalScore": i.get('verbal_score'),
                "nonVerbalScore": i.get('non_verbal_score'),
                "status": i.get('status'),
                "date": i['created_at']
            } for i in response.data]
        except Exception as e:
            raise APIError(f"Failed to get timeline data: {str(e)}", 500)

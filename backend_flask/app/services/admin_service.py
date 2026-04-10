"""Admin service for managing system configuration, users, and question bank."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError


class AdminService:
    """Service class for admin operations."""

    # ── Dashboard ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_dashboard_metrics() -> Dict[str, Any]:
        """Get admin dashboard metrics including avg score and weekly counts."""
        try:
            users_resp       = supabase_admin.table('user_profiles').select('id', count='exact').execute()
            interviews_resp  = supabase_admin.table('interviews').select('id', count='exact').execute()
            completed_resp   = supabase_admin.table('interviews').select('id', count='exact').eq('status', 'completed').execute()

            # Average overall score across all completed interviews
            scores_resp = supabase_admin.table('interviews').select('overall_score').eq('status', 'completed').execute()
            scores = [r['overall_score'] for r in scores_resp.data if r.get('overall_score') and r['overall_score'] > 0]
            avg_score = round(sum(scores) / len(scores), 1) if scores else 0

            # Interviews created in the last 7 days
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            week_resp = supabase_admin.table('interviews').select('id', count='exact').gte('created_at', week_ago).execute()

            return {
                "totalUsers":          users_resp.count or 0,
                "totalInterviews":     interviews_resp.count or 0,
                "completedInterviews": completed_resp.count or 0,
                "avgScore":            avg_score,
                "interviewsThisWeek":  week_resp.count or 0,
            }
        except Exception as e:
            raise APIError(f"Failed to get dashboard metrics: {str(e)}", 500)

    # ── User Management ───────────────────────────────────────────────────────

    @staticmethod
    def list_users(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """List all users with profiles, enriched with auth emails."""
        try:
            response = supabase_admin.table('user_profiles').select(
                '*', count='exact'
            ).order('created_at', desc=True).range(offset, offset + limit - 1).execute()

            # Attempt to fetch emails from Supabase Auth admin API
            email_map: Dict[str, str] = {}
            try:
                auth_resp = supabase_admin.auth.admin.list_users()
                raw = auth_resp if isinstance(auth_resp, list) else getattr(auth_resp, 'users', [])
                email_map = {
                    str(getattr(u, 'id', '')): getattr(u, 'email', '')
                    for u in (raw or [])
                }
            except Exception:
                pass  # Email enrichment is best-effort

            # Get interview counts per user (best-effort)
            interview_counts: Dict[str, int] = {}
            try:
                for u in response.data:
                    uid = u.get('user_id')
                    if uid:
                        cnt = supabase_admin.table('interviews').select('id', count='exact').eq('user_id', uid).execute()
                        interview_counts[str(uid)] = cnt.count or 0
            except Exception:
                pass

            # Build a set of user_ids that have an active paid subscription
            # so admin panel always reflects the effective role even if the DB write lagged
            premium_user_ids: set = set()
            try:
                subs_resp = supabase_admin.table('user_subscriptions').select(
                    'user_id, subscription_plans(price)'
                ).eq('status', 'active').execute()
                for sub in (subs_resp.data or []):
                    plan = sub.get('subscription_plans') or {}
                    price = float(plan.get('price', 0))
                    if price > 0:
                        premium_user_ids.add(str(sub['user_id']))
                        # Also fix the DB role while we're here if it's wrong
                        uid = str(sub['user_id'])
                        matching = [p for p in response.data if str(p.get('user_id', '')) == uid]
                        if matching and matching[0].get('role') not in ('premium', 'admin'):
                            try:
                                supabase_admin.table('user_profiles').update({'role': 'premium'}).eq('user_id', uid).execute()
                                matching[0]['role'] = 'premium'  # patch in-memory so response is immediate
                            except Exception:
                                pass
            except Exception:
                pass

            users = [{
                "id":             u['id'],
                "userId":         u['user_id'],
                "fullName":       u.get('full_name') or '',
                "email":          email_map.get(str(u.get('user_id', '')), ''),
                # Use active subscription as override if DB role is still 'user'
                "role":           'premium' if str(u.get('user_id', '')) in premium_user_ids and u.get('role') not in ('premium', 'admin') else u.get('role', 'user'),
                "isBlocked":      u.get('is_blocked', False),
                "lastActiveAt":   u.get('last_active_at'),
                "interviewCount": interview_counts.get(str(u.get('user_id', '')), 0),
                "createdAt":      u['created_at'],
            } for u in response.data]

            return {"users": users, "total": response.count or len(users)}
        except Exception as e:
            raise APIError(f"Failed to list users: {str(e)}", 500)

    @staticmethod
    def update_user_role(user_id: str, role: str) -> Dict[str, Any]:
        """Update a user's role."""
        try:
            if role not in ['user', 'admin', 'premium']:
                raise APIError("Invalid role. Must be one of: user, admin, premium", 400)

            response = supabase_admin.table('user_profiles').update({'role': role}).eq('user_id', user_id).execute()
            if not response.data:
                raise APIError("User not found", 404)

            u = response.data[0]
            return {"userId": u['user_id'], "fullName": u.get('full_name'), "role": u['role']}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update user role: {str(e)}", 500)

    @staticmethod
    def toggle_block(user_id: str, blocked: bool) -> Dict[str, Any]:
        """Block or unblock a user."""
        try:
            response = supabase_admin.table('user_profiles').update({
                'is_blocked': blocked
            }).eq('user_id', user_id).execute()
            if not response.data:
                raise APIError("User not found", 404)
            return {
                "userId": user_id,
                "isBlocked": blocked,
                "message": f"User {'blocked' if blocked else 'unblocked'} successfully"
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update block status: {str(e)}", 500)

    @staticmethod
    def delete_user(user_id: str) -> Dict[str, str]:
        """Permanently delete a user account (auth + profile)."""
        try:
            # Delete from Supabase Auth — cascades to profile via DB trigger/RLS
            supabase_admin.auth.admin.delete_user(user_id)
            # Explicit profile cleanup as fallback
            supabase_admin.table('user_profiles').delete().eq('user_id', user_id).execute()
            return {"message": "User deleted successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to delete user: {str(e)}", 500)

    @staticmethod
    def update_user_details(user_id: str, full_name: Optional[str] = None, email: Optional[str] = None, password: Optional[str] = None) -> Dict[str, Any]:
        """Update a user's name, email, or password as an admin."""
        try:
            # 1. Update Profile (Name)
            profile_data = {}
            if full_name is not None:
                profile_data['full_name'] = full_name
            
            if profile_data:
                supabase_admin.table('user_profiles').update(profile_data).eq('user_id', user_id).execute()

            # 2. Update Auth (Email/Password)
            auth_data = {}
            if email:
                auth_data['email'] = email
            if password:
                auth_data['password'] = password

            if auth_data:
                supabase_admin.auth.admin.update_user_by_id(user_id, auth_data)

            return {
                "userId": user_id,
                "fullName": full_name,
                "email": email,
                "message": "User details updated successfully"
            }
        except Exception as e:
            raise APIError(f"Failed to update user details: {str(e)}", 500)

    # ── Interview Management ──────────────────────────────────────────────────

    @staticmethod
    def list_all_interviews(status: Optional[str] = None, job_role: Optional[str] = None,
                            limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """List all interviews across all users for admin review."""
        try:
            query = supabase_admin.table('interviews').select(
                'id, user_id, job_role, status, overall_score, verbal_score, non_verbal_score, created_at',
                count='exact'
            )
            if status:   query = query.eq('status', status)
            if job_role: query = query.ilike('job_role', f'%{job_role}%')

            response = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()

            interviews = [{
                "id":            iv['id'],
                "userId":        (iv.get('user_id') or '')[:8] + '…',
                "fullUserId":    iv.get('user_id') or '',
                "jobRole":       iv.get('job_role') or 'General',
                "status":        iv.get('status', 'pending'),
                "overallScore":  iv.get('overall_score'),
                "verbalScore":   iv.get('verbal_score'),
                "nonVerbalScore": iv.get('non_verbal_score'),
                "createdAt":     iv.get('created_at'),
            } for iv in response.data]

            return {"interviews": interviews, "total": response.count or len(interviews)}
        except Exception as e:
            raise APIError(f"Failed to list interviews: {str(e)}", 500)

    @staticmethod
    def delete_interview(interview_id: str) -> Dict[str, str]:
        """Delete a single interview record."""
        try:
            response = supabase_admin.table('interviews').delete().eq('id', interview_id).execute()
            if not response.data:
                raise APIError("Interview not found", 404)
            return {"message": "Interview deleted successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to delete interview: {str(e)}", 500)

    # ── Platform Analytics ────────────────────────────────────────────────────

    @staticmethod
    def get_platform_analytics() -> Dict[str, Any]:
        """Compute platform-wide analytics: score distribution and top roles."""
        try:
            completed = supabase_admin.table('interviews').select(
                'overall_score, verbal_score, non_verbal_score, job_role, created_at'
            ).eq('status', 'completed').execute()

            scores = [r['overall_score'] for r in completed.data
                      if r.get('overall_score') and r['overall_score'] > 0]
            avg_score = round(sum(scores) / len(scores), 1) if scores else 0

            # Score distribution buckets
            buckets = {'0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0}
            for s in scores:
                if   s <= 20: buckets['0-20']   += 1
                elif s <= 40: buckets['21-40']  += 1
                elif s <= 60: buckets['41-60']  += 1
                elif s <= 80: buckets['61-80']  += 1
                else:         buckets['81-100'] += 1

            # Top job roles by interview count
            role_counts: Dict[str, int] = {}
            for r in completed.data:
                role = r.get('job_role') or 'General'
                role_counts[role] = role_counts.get(role, 0) + 1
            top_roles = sorted(role_counts.items(), key=lambda x: x[1], reverse=True)[:6]

            return {
                "avgScore":          avg_score,
                "scoreDistribution": buckets,
                "topRoles":          [{"role": r, "count": c} for r, c in top_roles],
                "totalCompleted":    len(completed.data),
            }
        except Exception as e:
            raise APIError(f"Failed to get platform analytics: {str(e)}", 500)

    @staticmethod
    def get_platform_timeseries(role: Optional[str] = None,
                                start_date: Optional[str] = None,
                                end_date: Optional[str] = None,
                                range_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Return time-series for:
          - interviewsPerDay (last 30 days)
          - activeUsersPerWeek (last 10 weeks; distinct users with any interview)
          - completionRateByWeek (last 10 weeks; completed / created)
          - hourHistogram (0-23) for peak hours within range
        """
        try:
            from datetime import datetime, timedelta, date
            # Determine date range
            utc_today = datetime.utcnow().date()
            if start_date and end_date:
                start_dt = datetime.fromisoformat(start_date).date()
                end_dt = datetime.fromisoformat(end_date).date()
            elif range_key in ('90d',):
                end_dt = utc_today
                start_dt = utc_today - timedelta(days=89)
            else:
                end_dt = utc_today
                start_dt = utc_today - timedelta(days=29)

            # Interviews per day in range
            iv_query = supabase_admin.table('interviews').select('id, user_id, status, job_role, created_at') \
                .gte('created_at', start_dt.isoformat()) \
                .lte('created_at', (datetime.combine(end_dt, datetime.max.time())).isoformat())
            if role:
                iv_query = iv_query.eq('job_role', role)
            iv_resp = iv_query.execute()
            per_day = {}
            days_span = (end_dt - start_dt).days + 1
            for i in range(days_span):
                d = (start_dt + timedelta(days=i)).isoformat()
                per_day[d] = 0
            for r in iv_resp.data or []:
                d = str(r['created_at'])[:10]
                if d in per_day:
                    per_day[d] += 1

            # Last 10 weeks: define week buckets by ISO week starting Mondays
            def week_key(dt: datetime) -> str:
                y, w, _ = dt.isocalendar()
                return f"{y}-W{str(w).zfill(2)}"

            # Use start_dt as baseline but ensure at least 10 buckets for consistent charting
            ref = datetime.combine(end_dt, datetime.min.time())
            start_10w = ref - timedelta(weeks=9)
            wk_query = supabase_admin.table('interviews').select('user_id, status, job_role, created_at') \
                .gte('created_at', min(start_10w, datetime.combine(start_dt, datetime.min.time())).isoformat()) \
                .lte('created_at', (datetime.combine(end_dt, datetime.max.time())).isoformat())
            if role:
                wk_query = wk_query.eq('job_role', role)
            iv_weeks = wk_query.execute()

            users_by_week: dict[str, set] = {}
            created_by_week: dict[str, int] = {}
            completed_by_week: dict[str, int] = {}
            # Initialize buckets
            week_keys = []
            for i in range(10):
                dt = ref - timedelta(weeks=9 - i)
                key = week_key(dt)
                week_keys.append(key)
                users_by_week[key] = set()
                created_by_week[key] = 0
                completed_by_week[key] = 0

            for r in iv_weeks.data or []:
                try:
                    dt = datetime.fromisoformat(str(r['created_at']).replace('Z', '+00:00'))
                except Exception:
                    continue
                key = week_key(dt)
                if key not in users_by_week:
                    # For out-of-range, skip
                    continue
                users_by_week[key].add(r.get('user_id') or '')
                created_by_week[key] += 1
                if (r.get('status') or '') == 'completed':
                    completed_by_week[key] += 1

            active_users = [{ "week": k, "count": len(users_by_week[k]) } for k in week_keys]
            completion_rate = [{
                "week": k,
                "created": created_by_week[k],
                "completed": completed_by_week[k],
                "rate": round((completed_by_week[k] / created_by_week[k]) * 100, 1) if created_by_week[k] > 0 else 0.0
            } for k in week_keys]

            # Peak hours histogram (UTC hours 0-23)
            hour_hist = [0] * 24
            for r in iv_resp.data or []:
                try:
                    dt = datetime.fromisoformat(str(r['created_at']).replace('Z', '+00:00'))
                    hour_hist[dt.hour] += 1
                except Exception:
                    pass

            return {
                "interviewsPerDay": [{"date": d, "count": per_day[d]} for d in per_day.keys()],
                "activeUsersPerWeek": active_users,
                "completionRateByWeek": completion_rate,
                "hourHistogram": [{"hour": i, "count": hour_hist[i]} for i in range(24)],
            }
        except Exception as e:
            raise APIError(f"Failed to get platform time-series: {str(e)}", 500)

    # ── Question Bank ─────────────────────────────────────────────────────────

    @staticmethod
    def list_bank_questions(category: Optional[str] = None, difficulty: Optional[str] = None,
                            job_role: Optional[str] = None, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """List questions from the question bank."""
        try:
            query = supabase_admin.table('question_bank').select('*', count='exact')
            if category:   query = query.eq('category', category)
            if difficulty: query = query.eq('difficulty', difficulty)
            if job_role:   query = query.ilike('job_role', f'%{job_role}%')

            response = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()

            questions = [{
                "id":               q['id'],
                "questionText":     q['question_text'],
                "category":         q['category'],
                "difficulty":       q['difficulty'],
                "jobRole":          q.get('job_role'),
                "tags":             q.get('tags', []),
                "expectedKeywords": q.get('expected_keywords', []),
                "isActive":         q.get('is_active', True),
                "createdAt":        q['created_at'],
            } for q in response.data]

            return {"questions": questions, "total": response.count or len(questions)}
        except Exception as e:
            raise APIError(f"Failed to list bank questions: {str(e)}", 500)

    @staticmethod
    def add_bank_question(question_text: str, category: str, difficulty: str,
                          job_role: str = None, tags: list = None,
                          expected_keywords: list = None, created_by: str = None) -> Dict[str, Any]:
        """Add a question to the question bank."""
        try:
            response = supabase_admin.table('question_bank').insert({
                'question_text': question_text, 'category': category, 'difficulty': difficulty,
                'job_role': job_role, 'tags': tags or [], 'expected_keywords': expected_keywords or [],
                'created_by': created_by,
            }).execute()
            if not response.data:
                raise APIError("Failed to add question", 500)
            q = response.data[0]
            return {"id": q['id'], "questionText": q['question_text'], "category": q['category'], "difficulty": q['difficulty']}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to add bank question: {str(e)}", 500)

    @staticmethod
    def update_bank_question(question_id: str, **kwargs) -> Dict[str, Any]:
        """Update a question in the question bank."""
        try:
            field_map = {
                'questionText': 'question_text', 'jobRole': 'job_role',
                'expectedKeywords': 'expected_keywords', 'isActive': 'is_active',
            }
            update_data = {field_map.get(k, k): v for k, v in kwargs.items() if v is not None}
            if not update_data:
                raise APIError("No update data provided", 400)

            response = supabase_admin.table('question_bank').update(update_data).eq('id', question_id).execute()
            if not response.data:
                raise APIError("Question not found", 404)
            return {"id": response.data[0]['id'], "message": "Question updated"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update bank question: {str(e)}", 500)

    @staticmethod
    def delete_bank_question(question_id: str) -> Dict[str, str]:
        """Delete a question from the question bank."""
        try:
            response = supabase_admin.table('question_bank').delete().eq('id', question_id).execute()
            if not response.data:
                raise APIError("Question not found", 404)
            return {"message": "Question deleted successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to delete bank question: {str(e)}", 500)

    # ── Job Roles ─────────────────────────────────────────────────────────────

    @staticmethod
    def list_job_roles(category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all active job roles."""
        try:
            query = supabase_admin.table('job_roles').select('*').eq('is_active', True)
            if category: query = query.eq('category', category)
            response = query.order('title').execute()

            return [{
                "id":              r['id'],
                "title":           r['title'],
                "description":     r.get('description'),
                "category":        r.get('category'),
                "requiredSkills":  r.get('required_skills', []),
                "difficultyLevels": r.get('difficulty_levels', []),
            } for r in response.data]
        except Exception as e:
            raise APIError(f"Failed to list job roles: {str(e)}", 500)

    @staticmethod
    def create_job_role(title: str, description: str = None, category: str = None,
                        required_skills: list = None) -> Dict[str, Any]:
        """Create a new job role."""
        try:
            response = supabase_admin.table('job_roles').insert({
                'title': title, 'description': description,
                'category': category, 'required_skills': required_skills or [],
            }).execute()
            if not response.data:
                raise APIError("Failed to create job role", 500)
            r = response.data[0]
            return {"id": r['id'], "title": r['title'], "category": r.get('category')}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to create job role: {str(e)}", 500)

    @staticmethod
    def update_job_role(role_id: str, **kwargs) -> Dict[str, Any]:
        """Update a job role."""
        try:
            field_map = {
                'requiredSkills': 'required_skills',
                'difficultyLevels': 'difficulty_levels',
                'isActive': 'is_active',
            }
            update_data = {field_map.get(k, k): v for k, v in kwargs.items() if v is not None}
            if not update_data:
                raise APIError("No update data provided", 400)

            response = supabase_admin.table('job_roles').update(update_data).eq('id', role_id).execute()
            if not response.data:
                raise APIError("Job role not found", 404)
            return {"id": response.data[0]['id'], "message": "Job role updated"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update job role: {str(e)}", 500)

    @staticmethod
    def delete_job_role(role_id: str) -> Dict[str, str]:
        """Delete a job role."""
        try:
            response = supabase_admin.table('job_roles').delete().eq('id', role_id).execute()
            if not response.data:
                raise APIError("Job role not found", 404)
            return {"message": "Job role deleted successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to delete job role: {str(e)}", 500)

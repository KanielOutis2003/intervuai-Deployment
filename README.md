# IntervuAI — AI-Powered Interview Coaching Platform

An AI-powered mock interview platform that conducts real-time interview sessions,
evaluates answers with per-question scoring, and provides structured feedback.
Built with React (frontend), Flask (backend), Supabase (database/auth), and Groq (AI).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Python 3.11+, Flask, Flask-CORS |
| Database & Auth | Supabase (PostgreSQL + Supabase Auth) |
| Primary AI | Groq — `llama-3.1-8b-instant` (SSE streaming) |
| Audio Transcription | OpenAI Whisper (optional) |
| Encryption | Fernet AES-128 (opt-in, for chat messages at rest) |

---

## Project Structure

```
IntervuAI_App/
├── backend_flask/              # Flask backend (port 5000)
│   ├── app/
│   │   ├── config/             # App config + Supabase client
│   │   ├── middleware/         # JWT auth + audit log decorators
│   │   ├── routes/             # 12 API blueprints (84+ endpoints)
│   │   ├── services/           # Business logic (15 service modules)
│   │   └── utils/              # Validation, responses, encryption
│   ├── migrations/             # 11 SQL migration files (run in Supabase)
│   ├── tests/                  # Pytest test suite
│   ├── requirements.txt
│   ├── run.py                  # Flask entry point
│   └── .env.example
├── frontend/                   # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── pages/              # 10 page components
│   │   ├── services/           # 9 API service modules
│   │   ├── components/         # ProtectedRoute, AdminRoute, ErrorBoundary
│   │   └── context/            # AuthContext (JWT state)
│   ├── package.json
│   └── .env.example
├── README.md
└── SETUP_GUIDE.md
```

---

## Architecture

```
Browser (localhost:5173)
    |
    └── /api/*  ──────────────────► Flask (localhost:5000)
                                        |
                                        ├── Groq API (AI responses + SSE streaming)
                                        |
                                        └── Supabase
                                              ├── Auth (JWT)
                                              ├── interviews, sessions, messages
                                              ├── analytics, resources, feedback
                                              └── admin, subscriptions, audit_logs
```

**Interview Flow:**
1. User selects job role + interview type → `POST /api/interviews` creates record
2. Chat page sends `START_INTERVIEW. Role: <role>. Type: <type>` to `/api/ai/predict/stream`
3. Backend injects seed questions from `question_bank` into Groq system prompt
4. Groq streams first question via SSE → typewriter effect in browser
5. User answers → next question + JSON evaluation streamed back
6. Evaluation (grammar, relevance, overall score, feedback, strengths, improvements) shown live
7. After 8–10 questions → `is_complete: true` → session ends → report page

---

## Completed Features

### Backend
- [x] Full auth — register, login, logout, refresh, forgot/reset password
- [x] Interview CRUD — create, list, get, update status/scores, delete
- [x] Session management — start, end (auto-score), idempotent
- [x] Groq AI — `llama-3.1-8b-instant`, SSE streaming, per-session history
- [x] Question bank — admin-managed questions seeded into Groq prompt per role/type
- [x] Feedback service — per-answer scoring (grammar, relevance, overall quality)
- [x] Non-verbal metrics recording (video interview)
- [x] Analytics — scores over time, progress tracking, trend analysis, role performance
- [x] Resource hub — read count tracking, tips, personalized tips by user weakness
- [x] Subscription system — plans, subscribe, cancel (DB-only, no payment gateway yet)
- [x] Admin panel — metrics, users, interviews, question bank, job roles, plans, audit logs
- [x] Data retention — `RetentionService` + `POST /api/admin/data/cleanup`
- [x] Fernet encryption — optional AES-128 for chat messages at rest
- [x] 12 blueprints, 84+ endpoints, 15 service modules, 11 migrations

### Frontend
- [x] Landing page
- [x] Auth — Login (T&C checkbox) + Register
- [x] Dashboard — KPI cards, job role modal, interview types, settings modal
- [x] Chat Interview — SSE streaming typewriter, live evaluation sidebar
- [x] Video Interview — camera simulation, face detection display, audio UI
- [x] Interview Report — Q&A rounds, per-answer scores, final readiness score
- [x] Analytics — SVG charts (score over time, distribution), AI insights
- [x] Resource Hub — YouTube embed, template copy/download, tips carousel
- [x] Admin Dashboard — 7 tabs (dashboard, users, interviews, questions, roles, plans, audit)
- [x] Protected routes + AdminRoute guard
- [x] Accessibility settings (high contrast, large font, reduced motion)

---

## System Audit — Status & Critical Gaps

### Production-Ready

| Area | Status |
|---|---|
| Auth flow | Ready |
| Chat interview with Groq SSE streaming | Ready |
| Per-question evaluation + live sidebar | Ready |
| Interview report page | Ready |
| Analytics charts + insights | Ready |
| Admin dashboard (all 7 tabs) | Ready |
| Resource Hub (videos, templates, tips) | Ready |
| Data retention + admin cleanup endpoint | Ready |
| Fernet encryption | Ready — disabled by default |

### Critical Gaps — Must Fix

| Priority | Issue | Fix |
|---|---|---|
| **HIGH** | SQL migrations 010 + 010b not applied in Supabase | Run in Supabase SQL Editor in order |
| **HIGH** | Encryption disabled | Set `ENABLE_ENCRYPTION=true` + generate `ENCRYPTION_KEY` in `.env` |
| **HIGH** | `POST /api/analytics/report/generate` calls OpenAI — fails without key | Add `OPENAI_API_KEY` or migrate to Groq |
| **HIGH** | Personalized tips returns 0 results | Fix `get_tips()` category filter (`verbal`/`non-verbal` don’t exist in DB) |

### Medium Gaps

| Priority | Issue | Fix |
|---|---|---|
| **MEDIUM** | Settings modal “Edit” (Profile tab) does nothing | Wire to `PATCH /api/users/me` |
| **MEDIUM** | No payment gateway for subscriptions | Add Stripe or PayMongo |
| **MEDIUM** | Production CORS not configured | Update `CORS_ORIGINS` in `config.py` |
| **MEDIUM** | Video interview score saving unconfirmed | Verify `PATCH /api/interviews/:id/scores` on session end |

### Low / Future

- `email_notifications` not wired to actual email sending
- `pg_cron` for automated retention (Supabase Pro)
- Better loading states in Resource Hub + Analytics
- Real payment gateway integration

---

## Environment Variables

### `backend_flask/.env`

```env
FLASK_APP=run.py
FLASK_ENV=development
PORT=5000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Required — free key at https://console.groq.com
GROQ_API_KEY=gsk_your_groq_key_here

# Optional — Whisper audio transcription only
OPENAI_API_KEY=sk-your-openai-key

JWT_SECRET=your-random-secret-key-here

# Groq tuning (optional — defaults shown)
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=700
GROQ_TEMPERATURE=0.5

# Encryption (opt-in)
ENABLE_ENCRYPTION=false
ENCRYPTION_KEY=

# Retention
DATA_RETENTION_DAYS=90
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running Locally

```bash
# Terminal 1 — Flask backend
cd backend_flask
python -m venv venv
venv\Scripts\activate        # Windows  |  source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # Fill in Supabase + Groq keys
python run.py
# → http://localhost:5000

# Terminal 2 — React frontend
cd frontend
npm install
cp .env.example .env          # Set VITE_API_URL=http://localhost:5000/api
npm run dev
# → http://localhost:5173
```

Health check: `curl http://localhost:5000/health`

---

## Database Migrations

Run each file **in order** in the [Supabase SQL Editor](https://supabase.com/dashboard):

| File | Description |
|---|---|
| `001_auth_and_profiles.sql` | User profiles + preferences |
| `002_sessions.sql` | Interviews, sessions, messages, transcriptions |
| `003_analysis.sql` | Questions, feedback, non-verbal metrics |
| `004_analytics.sql` | Analytics snapshots |
| `005_resources.sql` | Learning resources table |
| `006_admin.sql` | Subscription plans, audit logs, admin config |
| `007_interview_type.sql` | Interview type column + question bank |
| `008_seed_job_roles_and_questions.sql` | Seed job roles + question bank data |
| `009_data_retention.sql` | `cleanup_old_interviews()` Postgres function |
| `010_resources_enhance.sql` | Rich content (videos, templates, guides) |
| `010b_deduplicate_resources.sql` | Deduplicate + UNIQUE(title) constraint |

---

## Repository

**GitHub:** https://github.com/elijahpaul27/IntervuAI_App

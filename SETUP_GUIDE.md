# IntervuAI Setup Guide

Complete setup instructions for running IntervuAI locally.

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A [Groq](https://console.groq.com/) API key (free)
- (Optional) An OpenAI API key — only needed for audio transcription via Whisper

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/elijahpaul27/IntervuAI_App.git
cd IntervuAI_App
```

---

## Step 2 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com/) and create a new project.
2. Navigate to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
3. Open the **SQL Editor** in your Supabase dashboard and run **each migration file in order**
   from `backend_flask/migrations/`:

   ```
   001_auth_and_profiles.sql
   002_sessions.sql
   003_analysis.sql
   004_analytics.sql
   005_resources.sql
   006_admin.sql
   007_interview_type.sql
   008_seed_job_roles_and_questions.sql
   009_data_retention.sql
   010_resources_enhance.sql
   010b_deduplicate_resources.sql   (run immediately after 010)
   ```

   > Copy each file’s content, paste it into the SQL Editor, click **Run**.

---

## Step 3 — Get a Groq API Key

1. Sign up at [console.groq.com](https://console.groq.com/) (free tier available).
2. Go to **API Keys** and create a new key.
3. Copy the key — it starts with `gsk_`.

---

## Step 4 — Backend Setup (Flask)

```bash
cd backend_flask

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

Edit `backend_flask/.env` and fill in your values:

```env
FLASK_APP=run.py
FLASK_ENV=development
PORT=5000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

GROQ_API_KEY=gsk_your_groq_key_here

# Optional — only needed for Whisper audio transcription
OPENAI_API_KEY=sk-your-openai-key

JWT_SECRET=any-random-string-at-least-32-chars

# Optional — leave defaults unless tuning AI behaviour
GROQ_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=700
GROQ_TEMPERATURE=0.5

# Optional — enable to encrypt chat messages at rest
ENABLE_ENCRYPTION=false
ENCRYPTION_KEY=

# Optional — days before completed interviews are eligible for cleanup
DATA_RETENTION_DAYS=90
```

**To generate a secure JWT_SECRET:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**To generate an ENCRYPTION_KEY (if enabling encryption):**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Start the backend:

```bash
python run.py
# Flask running on http://localhost:5000
```

Verify it’s working:
```bash
curl http://localhost:5000/health
# {"success": true, "message": "IntervuAI Flask Backend is running", ...}
```

---

## Step 5 — Frontend Setup (React)

```bash
cd frontend

npm install

cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
# Running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Step 6 — Create an Admin User

To access the Admin Dashboard at `/admin`, your user must have `role = admin` in the `profiles` table.

**Option A — Run the helper script:**
```bash
cd backend_flask
python create_admin.py
```

**Option B — Supabase SQL Editor:**
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

---

## Running Both Services

```bash
# Terminal 1 — backend
cd backend_flask && venv\Scripts\activate && python run.py

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**

---

## Troubleshooting

### “Missing required environment variables” on startup
- Check that all four required vars are set in `backend_flask/.env`:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`
- Restart Flask after editing `.env`

### CORS errors in browser
- Confirm `VITE_API_URL` in `frontend/.env` matches the running Flask port (`5000`)
- Check `CORS_ORIGINS` in `backend_flask/app/config/config.py` includes `http://localhost:5173`

### AI responses not streaming / chat not working
- Verify `GROQ_API_KEY` is valid at [console.groq.com](https://console.groq.com/)
- Check Flask logs for `AI predict error`

### Resource Hub shows no content
- Migration `010_resources_enhance.sql` may not have been applied — run it in Supabase SQL Editor
- Then run `010b_deduplicate_resources.sql`

### Port already in use
```bash
# Windows — kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

---

## API Reference

Base URL: `http://localhost:5000/api`

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` |
| Users | `GET/PATCH /users/me`, `GET/PATCH /users/me/preferences`, `GET /users/me/dashboard` |
| Interviews | `POST/GET /interviews`, `GET/PATCH/DELETE /interviews/:id`, `GET /interviews/job-roles` |
| Sessions | `POST /sessions/start`, `POST /sessions/:id/end`, `POST /sessions/:id/message`, `GET /sessions/:id/messages` |
| AI | `POST /ai/predict`, `POST /ai/predict/stream` (SSE), `DELETE /ai/session/:id` |
| Analytics | `GET /analytics/performance`, `/analytics/progress`, `/analytics/trends`, `/analytics/visualization/scores` |
| Resources | `GET /resources`, `POST /resources/:id/read`, `GET /resources/tips`, `GET /resources/tips/personalized` |
| Subscriptions | `GET /subscriptions/plans`, `POST /subscriptions/subscribe`, `POST /subscriptions/cancel` |
| Admin | `GET /admin/dashboard`, `/admin/users`, `/admin/interviews`, `/admin/questions`, `/admin/job-roles`, `/admin/plans`, `/admin/audit-logs`, `POST /admin/data/cleanup` |

---

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [Groq Docs](https://console.groq.com/docs)
- [Flask Docs](https://flask.palletsprojects.com/)
- [Vite Docs](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)

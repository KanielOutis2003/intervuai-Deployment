# IntervuAI Deployment Guide

Deploy the frontend on **Vercel**, backend on **Render**, database on **Supabase**, and custom domain via **Hostinger**.

---

## Architecture Overview

```
Browser → Vercel (React frontend)
              ↓ HTTPS
         Render (Flask backend)
              ↓
         Supabase (PostgreSQL + Auth)
```

---

## Step 1: Deploy Backend on Render

### 1.1 Push your code to GitHub
Make sure your repo is up to date on GitHub with the latest changes (including `render.yaml` and `Procfile`).

### 1.2 Create a Render Web Service
1. Go to [render.com](https://render.com) and sign up / log in.
2. Click **"New +"** → **"Web Service"**.
3. Connect your GitHub repo: `intervuai-Deployment`.
4. Configure the service:
   - **Name:** `intervuai-backend`
   - **Region:** Singapore (or closest to your users)
   - **Root Directory:** `backend_flask`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn run:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Instance Type:** Free (or Starter $7/mo for no spin-down)

### 1.3 Set Environment Variables on Render
Go to your service → **Environment** tab → add these:

| Key | Value |
|-----|-------|
| `FLASK_ENV` | `production` |
| `SUPABASE_URL` | `https://xjxexwrttxhosgrykwya.supabase.co` |
| `SUPABASE_ANON_KEY` | *(your Supabase anon key)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(your Supabase service role key)* |
| `GROQ_API_KEY` | *(your Groq API key)* |
| `OPENAI_API_KEY` | *(your OpenAI key — optional)* |
| `JWT_SECRET` | *(generate a random 64-char hex string)* |
| `CORS_ORIGINS` | `https://intervuai.vercel.app` |
| `PYTHON_VERSION` | `3.11.7` |

> **Important:** Update `CORS_ORIGINS` later when you have your custom domain.
> Example: `https://intervuai.vercel.app,https://www.intervuai.com`

### 1.4 Verify Backend
After deployment completes, visit:
```
https://intervuai-backend.onrender.com/health
```
You should see: `{"success": true, "message": "IntervuAI Flask Backend is running", "environment": "production"}`

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Import Project on Vercel
1. Go to [vercel.com](https://vercel.com) and sign up / log in with GitHub.
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repo: `intervuai-Deployment`.
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 2.2 Set Environment Variables on Vercel
In Project Settings → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://intervuai-backend.onrender.com/api` |

> Replace `intervuai-backend` with whatever name Render gave your service.

### 2.3 Deploy
Click **"Deploy"**. Vercel will build and deploy your frontend automatically.

### 2.4 Verify Frontend
Visit the Vercel URL (e.g., `https://intervuai.vercel.app`) and confirm:
- The landing page loads
- Login/register works
- API calls succeed (check browser DevTools → Network tab)

### 2.5 Update Backend CORS
Now go back to **Render** and update the `CORS_ORIGINS` env var to include your Vercel URL:
```
https://intervuai.vercel.app
```

---

## Step 3: Connect Custom Domain from Hostinger

### 3.1 Buy a Domain on Hostinger
1. Go to [hostinger.com](https://hostinger.com) → **Domains** → Search and purchase your domain (e.g., `intervuai.com`).

### 3.2 Point Domain to Vercel (Frontend)
1. In **Vercel** → Project Settings → **Domains** → Add your domain (e.g., `www.intervuai.com` and `intervuai.com`).
2. Vercel will show you DNS records to configure. Usually:
   - **A Record:** `76.76.21.21` (for root domain `intervuai.com`)
   - **CNAME Record:** `cname.vercel-dns.com` (for `www.intervuai.com`)
3. In **Hostinger** → **DNS / Zone Editor** for your domain:
   - Delete any existing A records for `@`
   - Add **A Record:** Host = `@`, Points to = `76.76.21.21`
   - Add **CNAME Record:** Host = `www`, Points to = `cname.vercel-dns.com`
4. Wait for DNS propagation (usually 5-30 minutes, can take up to 48 hours).

### 3.3 (Optional) Subdomain for Backend API
If you want `api.intervuai.com` instead of `intervuai-backend.onrender.com`:
1. In **Render** → your service → **Settings** → **Custom Domains** → Add `api.intervuai.com`.
2. Render will give you a CNAME target.
3. In **Hostinger** DNS → Add **CNAME Record:** Host = `api`, Points to = *(Render's CNAME target)*.
4. Update your Vercel env var: `VITE_API_URL=https://api.intervuai.com/api`

### 3.4 Update CORS for Custom Domain
Go to **Render** → Environment Variables → Update `CORS_ORIGINS`:
```
https://intervuai.vercel.app,https://www.intervuai.com,https://intervuai.com
```

---

## Step 4: Supabase Production Checklist

Your database is already on Supabase. Verify these settings:

1. **Authentication** → **URL Configuration:**
   - Set **Site URL** to your production frontend URL: `https://www.intervuai.com`
   - Add redirect URLs: `https://www.intervuai.com/**`, `https://intervuai.com/**`

2. **API Settings:**
   - Ensure your anon key and service role key match what's in Render env vars.

3. **Database:**
   - Confirm all migrations have been run (check tables exist).

---

## Quick Reference: Environment Variables

### Vercel (Frontend)
| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://api.intervuai.com/api` |

### Render (Backend)
| Variable | Example |
|----------|---------|
| `FLASK_ENV` | `production` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `GROQ_API_KEY` | `gsk_...` |
| `OPENAI_API_KEY` | `sk-...` |
| `JWT_SECRET` | *(random 64-char hex)* |
| `CORS_ORIGINS` | `https://www.intervuai.com,https://intervuai.com` |
| `PYTHON_VERSION` | `3.11.7` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors in browser | Update `CORS_ORIGINS` on Render with your exact frontend URL (no trailing slash) |
| 502 on Render | Check Render logs — likely a missing env var or import error |
| Blank page on Vercel | Check that Root Directory is set to `frontend` |
| API calls fail | Verify `VITE_API_URL` on Vercel points to your Render URL with `/api` suffix |
| Render spins down (free tier) | First request after idle takes ~30s. Upgrade to Starter ($7/mo) to avoid this |
| Domain not working | DNS propagation can take up to 48h. Use `nslookup yourdomain.com` to check |

# Deployment Guide

This guide covers deploying the Localization Auditor application:
- **Backend** (FastAPI) → Railway
- **Frontend** (Next.js) → Vercel

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel         │────▶│  Railway        │────▶│  PostgreSQL     │
│  (Frontend)     │     │  (Backend API)  │     │  (Database)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Anthropic API  │
                        │  (Claude)       │
                        └─────────────────┘
```

---

## Prerequisites

- GitHub account (repo pushed)
- [Railway](https://railway.app) account
- [Vercel](https://vercel.com) account
- Anthropic API key

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose the `localization_auditor` repository

### 1.2 Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create the database

### 1.3 Configure Backend Service ✅

1. Click on the backend service (created from GitHub)
2. Go to **Settings** tab:
   - Set **Root Directory** to `backend`
   - Railway will auto-detect the Dockerfile

3. Go to **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (click "Add Reference") |
| `SECRET_KEY` | Generate a secure random string (32+ chars) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `CORS_ORIGINS` | `https://your-app.vercel.app` (update after Vercel deploy) |
| `DEBUG` | `false` |

### 1.4 Deploy

1. Railway will automatically build and deploy using the Dockerfile
2. Wait for the build to complete (may take 5-10 minutes due to Playwright)
3. Once deployed, get your Railway URL from the **Settings** tab
   - Example: `https://localization-auditor-production.up.railway.app`

### 1.5 Verify Backend

Visit `https://your-railway-url.up.railway.app/docs` to see the API documentation.

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New..."** → **"Project"**
3. Import the `localization_auditor` repository

### 2.2 Configure Build Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

### 2.3 Add Environment Variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-railway-url.up.railway.app/api` |

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Get your Vercel URL (e.g., `https://localization-auditor.vercel.app`)

---

## Step 3: Update CORS Settings

After getting your Vercel URL, update the Railway backend:

1. Go to Railway → Your project → Backend service → **Variables**
2. Update `CORS_ORIGINS`:
   ```
   https://localization-auditor.vercel.app,https://your-custom-domain.com
   ```
3. Railway will automatically redeploy

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing key (keep secret!) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `DEBUG` | No | Set to `false` in production |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (with `/api` suffix) |

---

## Custom Domain Setup

### Vercel (Frontend)

1. Go to your project → **Settings** → **Domains**
2. Add your custom domain
3. Configure DNS as instructed by Vercel

### Railway (Backend)

1. Go to your service → **Settings** → **Networking**
2. Click **"Generate Domain"** or add custom domain
3. Configure DNS as instructed by Railway

---

## Monitoring & Logs

### Railway
- View logs: Project → Service → **Logs** tab
- Metrics: Project → Service → **Metrics** tab

### Vercel
- View logs: Project → **Logs** tab
- Analytics: Project → **Analytics** tab (if enabled)

---

## Troubleshooting

### Backend won't start
- Check logs in Railway for error messages
- Verify all environment variables are set correctly
- Ensure DATABASE_URL is using the Railway reference `${{Postgres.DATABASE_URL}}`

### CORS errors
- Verify `CORS_ORIGINS` includes your frontend URL
- Make sure there are no trailing slashes in the URLs
- Check that the protocol matches (https vs http)

### Database connection issues
- Ensure PostgreSQL addon is provisioned
- Check that DATABASE_URL variable is properly referenced

### Playwright/Scraping issues
- The Dockerfile includes Chromium dependencies
- If scraping fails, check Railway logs for browser errors

---

## Cost Estimates

### Railway
- **Starter plan**: $5/month includes:
  - 500 hours of compute
  - 1GB RAM per service
  - PostgreSQL included

### Vercel
- **Hobby plan**: Free includes:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Serverless functions

---

## Security Checklist

- [ ] `SECRET_KEY` is a strong random string (not the default)
- [ ] `DEBUG` is set to `false` in production
- [ ] `ANTHROPIC_API_KEY` is kept secret
- [ ] CORS is configured for specific domains (not `*`)
- [ ] HTTPS is enforced (automatic on Railway/Vercel)

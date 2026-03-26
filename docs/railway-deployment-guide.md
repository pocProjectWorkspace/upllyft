# Railway Deployment Guide — Upllyft API

> Deploy the NestJS backend to Railway with WebSockets, cron jobs, and auto-deploy from GitHub.

**Cost:** ~$5-20/month | **Deploy time:** ~5 minutes setup

---

## Quick Start (5 Steps)

### Step 1: Create a Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **Login with GitHub**
3. Authorize Railway to access your GitHub account

### Step 2: Create a New Project

1. Click **New Project** → **Deploy from GitHub Repo**
2. Select the **upllyft** repository
3. Railway will detect the repo — click **Deploy Now**

### Step 3: Configure the Service

After the project is created, configure the service settings:

1. Click on your service → **Settings**
2. Set **Root Directory**: leave empty (repo root — needed for monorepo)
3. Set **Build Config**: Railway will auto-detect the `railway.toml`
4. Set **Deploy Branch**: `main`

> **NOTE:** Railway reads the `railway.toml` file which points to `apps/api/Dockerfile`.
> The Docker build context is the repo root so monorepo workspace files are accessible.

### Step 4: Add Environment Variables

Go to your service → **Variables** tab → **Add Variable** (or use **RAW Editor** for bulk paste):

```env
# ── Core ──
NODE_ENV=production
PORT=3001

# ── Database ──
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DIRECT_URL=postgresql://user:pass@host:5432/dbname

# ── Auth ──
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# ── Email ──
SENDGRID_API_KEY=your-sendgrid-key

# ── Payments ──
STRIPE_SECRET_KEY=your-stripe-secret-key

# ── Supabase (file storage) ──
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# ── Firebase (push notifications) ──
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# ── AI ──
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# ── Google OAuth ──
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-app.railway.app/api/auth/google/callback
```

> **IMPORTANT:** Replace all placeholder values with your actual secrets.
> Railway encrypts all variables at rest.

### Step 5: Deploy

Railway auto-deploys when you push to `main`. For the first deploy:

1. Push your code: `git push origin main`
2. Watch the build in Railway dashboard → **Deployments** tab
3. Build takes ~3-5 minutes the first time

---

## Verify Deployment

Once deployed, Railway gives you a public URL like `https://upllyft-api-production.up.railway.app`.

### Test Endpoints

```bash
# Health check
curl https://YOUR-APP.railway.app/health

# Swagger docs
# Open in browser: https://YOUR-APP.railway.app/api/docs

# API endpoint
curl https://YOUR-APP.railway.app/api/users -H "Authorization: Bearer YOUR_TOKEN"
```

### Test WebSockets

Your frontend needs to point to the Railway URL for socket.io:
```javascript
const socket = io('https://YOUR-APP.railway.app/messaging', {
  auth: { token: 'your-jwt-token' }
});
```

---

## Custom Domain (Optional)

1. Go to **Service → Settings → Domains**
2. Click **Add Custom Domain**
3. Enter: `api.upllyft.com`
4. Add the CNAME record Railway gives you to your DNS:

| Type | Name | Value |
|------|------|-------|
| CNAME | `api` | `your-service.railway.app` |

Railway auto-provisions a free SSL certificate.

---

## How CI/CD Works

Railway's built-in CI/CD replaces GitHub Actions:

```
git push origin main
    │
    ▼
Railway detects push
    │
    ▼
Builds Docker image (from apps/api/Dockerfile)
    │
    ▼
Health check passes (/health)
    │
    ▼
Traffic switches to new container (zero-downtime)
    │
    ▼
Old container removed
```

- **Auto-deploy**: Every push to `main` triggers a deploy
- **Build logs**: Visible in Railway dashboard
- **Rollback**: Click any previous deployment to roll back instantly
- **Preview deployments**: Enable for PR branches (optional)

---

## Railway Database (Optional)

If you don't have a database yet, Railway can provision one:

1. In your project, click **+ New** → **Database** → **PostgreSQL**
2. Railway creates a managed Postgres instance
3. Copy the `DATABASE_URL` from the database service
4. Add it to your API service variables
5. Redeploy

**Cost:** ~$5/month for a small PostgreSQL instance.

---

## Scaling & Monitoring

### View Logs
- Go to **Service → Deployments → Latest → View Logs**
- Live-streamed logs from your container

### Metrics
Railway dashboard shows:
- CPU / Memory usage
- Network traffic
- Request count

### Scale Up
- Go to **Service → Settings**
- Increase memory/CPU limits as needed
- Railway charges based on usage (not fixed tiers)

---

## Cost Breakdown

| Usage | Estimated Cost |
|-------|---------------|
| Hobby plan (512MB, shared CPU) | **$5/month** |
| Pro plan (better performance) | **$20/month** |
| Database (if using Railway Postgres) | **$5-10/month** |
| **Total** | **$5-30/month** |

Railway pricing is usage-based: ~$0.000231/min per vCPU, ~$0.000231/min per GB RAM.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails at `pnpm install` | Check `pnpm-lock.yaml` is committed and up to date |
| Health check timeout | Increase timeout in `railway.toml` (currently 90s) |
| Container crashes on start | Check logs in Railway dashboard for errors |
| WebSocket not connecting | Ensure frontend uses `wss://` (not `ws://`) with the Railway URL |
| Prisma errors | Ensure `DATABASE_URL` is correct and database is accessible |
| Out of memory | Upgrade to Pro plan or increase memory limit |

---

## Files Created for Railway

| File | Location | Purpose |
|------|----------|---------|
| `Dockerfile` | `apps/api/Dockerfile` | Multi-stage Docker build |
| `.dockerignore` | `.dockerignore` (repo root) | Excludes unnecessary files from build |
| `railway.toml` | `railway.toml` (repo root) | Railway-specific configuration |
| This guide | `docs/railway-deployment-guide.md` | Documentation |

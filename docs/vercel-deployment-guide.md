# Vercel Deployment Guide — Upllyft Frontends

> Deploy all 7 frontend apps to Vercel from a single monorepo using Vercel CLI.

**Backend URL:** `https://upllyftapi-production.up.railway.app`

---

## Prerequisites

### Step 1: Install Vercel CLI

```powershell
npm install -g vercel
```

### Step 2: Login to Vercel

```powershell
vercel login
```
This opens a browser window — login with your GitHub account (same one linked to the repo).

### Step 3: Verify Login

```powershell
vercel whoami
# Should print: cpsutharsan-gma...
```

---

## Deploy All Frontends

### Step 4: Link & Deploy Each App

Run these commands **from the repo root** (`c:\Users\udaya.finesse\Git\upllyft\upllyft`).

Each command does 3 things: links the app to a new Vercel project, sets the env var, and deploys to production.

#### 4.1: Deploy web-main

```powershell
cd apps/web-main
vercel link
```
When prompted:
- **Set up and develop?** → `Y`
- **Which scope?** → Select your team/account
- **Link to existing project?** → `N` (create new)
- **Project name?** → `upllyft-web-main`
- **Root directory?** → `./` (current, which is apps/web-main)

Then set env var and deploy:
```powershell
vercel env add NEXT_PUBLIC_API_URL production
# When prompted for value, paste: https://upllyftapi-production.up.railway.app

vercel --prod
```

Go back to root:
```powershell
cd ../..
```

#### 4.2: Deploy web-admin

```powershell
cd apps/web-admin
vercel link
# Project name → upllyft-web-admin

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

#### 4.3: Deploy web-booking

```powershell
cd apps/web-booking
vercel link
# Project name → upllyft-web-booking

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

#### 4.4: Deploy web-cases

```powershell
cd apps/web-cases
vercel link
# Project name → upllyft-web-cases

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

#### 4.5: Deploy web-community

```powershell
cd apps/web-community
vercel link
# Project name → upllyft-web-community

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

#### 4.6: Deploy web-resources

```powershell
cd apps/web-resources
vercel link
# Project name → upllyft-web-resources

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

#### 4.7: Deploy web-screening

```powershell
cd apps/web-screening
vercel link
# Project name → upllyft-web-screening

vercel env add NEXT_PUBLIC_API_URL production
# Value → https://upllyftapi-production.up.railway.app

vercel --prod
cd ../..
```

---

## Add Custom Domains (Optional)

After all projects are deployed, add your custom domains:

```powershell
# web-main
cd apps/web-main
vercel domains add app.safehaven-upllyft.com
cd ../..

# web-admin
cd apps/web-admin
vercel domains add admin.safehaven-upllyft.com
cd ../..

# web-booking
cd apps/web-booking
vercel domains add booking.safehaven-upllyft.com
cd ../..

# web-community
cd apps/web-community
vercel domains add community.safehaven-upllyft.com
cd ../..

# web-resources
cd apps/web-resources
vercel domains add resources.safehaven-upllyft.com
cd ../..

# web-screening
cd apps/web-screening
vercel domains add screening.safehaven-upllyft.com
cd ../..
```

Then update **Cloudflare DNS** for each subdomain:

| Subdomain | Type | Value (from Vercel) |
|-----------|------|---------------------|
| `app` | CNAME | `cname.vercel-dns.com` |
| `admin` | CNAME | `cname.vercel-dns.com` |
| `booking` | CNAME | `cname.vercel-dns.com` |
| `community` | CNAME | `cname.vercel-dns.com` |
| `resources` | CNAME | `cname.vercel-dns.com` |
| `screening` | CNAME | `cname.vercel-dns.com` |

> **IMPORTANT:** In Cloudflare, set the proxy status to **DNS only** (grey cloud), NOT **Proxied** (orange cloud). Vercel manages its own SSL.

---

## Auto-Deploy on Git Push

After the initial setup, **every `git push` to `main` automatically deploys all 7 projects.** Vercel detects changes in the repo and triggers builds for each connected project.

No GitHub Actions workflow needed — Vercel handles it.

---

## Verify Deployments

After all deploys complete, test each app:

| App | Vercel URL | Custom Domain |
|-----|-----------|---------------|
| web-main | `upllyft-web-main.vercel.app` | `app.safehaven-upllyft.com` |
| web-admin | `upllyft-web-admin.vercel.app` | `admin.safehaven-upllyft.com` |
| web-booking | `upllyft-web-booking.vercel.app` | `booking.safehaven-upllyft.com` |
| web-cases | `upllyft-web-cases.vercel.app` | — |
| web-community | `upllyft-web-community.vercel.app` | `community.safehaven-upllyft.com` |
| web-resources | `upllyft-web-resources.vercel.app` | `resources.safehaven-upllyft.com` |
| web-screening | `upllyft-web-screening.vercel.app` | `screening.safehaven-upllyft.com` |

Test API connectivity on each:
```
https://upllyft-web-main.vercel.app/api/health
→ Should return {"status":"ok"} (proxied from Railway)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `vercel link` fails | Run `vercel login` again |
| Build fails with pnpm error | Ensure `installCommand` in `vercel.json` is correct |
| API calls return 502 | Check `NEXT_PUBLIC_API_URL` is set in Vercel env vars |
| Custom domain not working | Check Cloudflare DNS CNAME points to `cname.vercel-dns.com` |
| CORS errors on API calls | Verify `main.ts` CORS includes `\.vercel\.app$` pattern |

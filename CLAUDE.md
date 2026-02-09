# CLAUDE.md

## Project Overview

Upllyft is a multi-app monorepo for a neurodivergent community platform, built with Turborepo + pnpm workspaces.

## Monorepo Structure

```
upllyft/
├── apps/
│   ├── api/                    # NestJS 11 backend (port 3001)
│   ├── web-main/               # Main hub: dashboard, feed, profile, settings, admin (port 3000)
│   ├── web-community/          # Community: posts, Q&A, events, crisis, providers (port 3002)
│   ├── web-screening/          # Screening: UFMF assessments, reports (port 3003)
│   ├── web-booking/            # Booking: therapist marketplace, sessions, Stripe (port 3004)
│   ├── web-resources/          # Learning: AI worksheets, assignments, community library (port 3005)
│   ├── web-cases/              # Cases: therapist case management, IEPs, milestones (port 3006)
│   └── mobile/                 # Expo 54 React Native app (iOS + Android)
├── packages/
│   ├── ui/                     # @upllyft/ui — 31 shared React components (web only)
│   ├── api-client/             # @upllyft/api-client — axios client, token refresh, AuthProvider
│   ├── types/                  # @upllyft/types — shared TypeScript types
│   └── config/                 # @upllyft/config — shared tsconfig, eslint, tailwind
└── turbo.json
```

## Common Commands

```bash
pnpm install                # Install all dependencies
pnpm build                  # Build all packages and apps
pnpm dev                    # Start all apps in dev mode (parallel)
pnpm lint                   # Lint all packages and apps
pnpm type-check             # Type-check all packages and apps
```

### Run specific apps:

```bash
# Single app
pnpm --filter @upllyft/web-main dev
pnpm --filter @upllyft/api dev

# Multiple apps (API + one frontend)
pnpm --filter @upllyft/api --filter @upllyft/web-main dev

# Mobile
cd apps/mobile && pnpm start
```

### API-specific commands:

```bash
pnpm --filter @upllyft/api prisma:generate   # Generate Prisma client
pnpm --filter @upllyft/api prisma:migrate    # Run migrations
pnpm --filter @upllyft/api prisma:studio     # Open Prisma Studio
pnpm --filter @upllyft/api db:seed:all       # Seed database
pnpm --filter @upllyft/api test              # Run unit tests
```

## Running the Full Stack

### Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL with pgvector extension
- Redis (optional, for caching)

### First-time setup:
```bash
git clone <repo>
cd upllyft
pnpm install

# Set up API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your database URL, JWT secrets, API keys

# Generate Prisma client
pnpm --filter @upllyft/api prisma:generate

# Run migrations
pnpm --filter @upllyft/api prisma:migrate

# Seed data (optional)
pnpm --filter @upllyft/api db:seed:all
```

### Start development:
```bash
# Option 1: Start everything
pnpm dev

# Option 2: Start API + one frontend (recommended for development)
pnpm --filter @upllyft/api --filter @upllyft/web-main dev

# Option 3: Mobile app
cd apps/mobile
cp .env.example .env
# Edit .env with your local IP for device testing
pnpm start
```

### Port map:
| App | Port | URL |
|-----|------|-----|
| web-main | 3000 | http://localhost:3000 |
| API | 3001 | http://localhost:3001 |
| web-community | 3002 | http://localhost:3002 |
| web-screening | 3003 | http://localhost:3003 |
| web-booking | 3004 | http://localhost:3004 |
| web-resources | 3005 | http://localhost:3005 |
| web-cases | 3006 | http://localhost:3006 |

## Deployment

### Vercel (Web Apps)

Each web app has a `vercel.json` configured for monorepo deployment. To deploy:

1. Connect your GitHub repo to Vercel
2. Create a separate Vercel project for each web app
3. Set the **Root Directory** to the app folder (e.g., `apps/web-main`)
4. Vercel will use the `vercel.json` build command to run Turborepo
5. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` — your deployed API URL

### API Deployment

The API can be deployed to any Node.js host (Railway, Render, AWS, etc.):

```bash
cd apps/api
pnpm build
pnpm start:prod
```

Required environment variables: see `apps/api/.env.example`

### Mobile Deployment

```bash
cd apps/mobile
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit
```

### Production Architecture

For production, all web apps should be served under a single domain to share authentication:

```
upllyft.com          → web-main
community.upllyft.com → web-community
screening.upllyft.com → web-screening
booking.upllyft.com   → web-booking
resources.upllyft.com → web-resources
cases.upllyft.com     → web-cases
api.upllyft.com       → API
```

**Auth note:** In development, auth tokens are shared across ports via cookies on `localhost`. In production with subdomains, cookies are scoped to `.upllyft.com` domain for seamless cross-app authentication.

## Architecture

### Backend (NestJS 11 + Fastify + Prisma)
- Modular architecture: each feature is a NestJS module in `src/<feature>/`
- **Prisma ORM** with PostgreSQL + pgvector for embeddings
- **Auth**: JWT + Passport (local, Google OAuth strategies)
- **Real-time**: Socket.IO WebSockets
- **AI**: OpenAI (GPT-5, DALL-E 3, embeddings) + Anthropic Claude (worksheets)
- **Payments**: Stripe Connect with escrow
- **Storage**: Supabase (PDFs, images)
- **Email**: MailerSend / SendGrid / AWS SES (configurable)
- **Push**: Firebase Cloud Messaging
- **Logging**: Custom logger with optional AWS CloudWatch
- Swagger docs at `/api/docs`

### Frontend (Next.js 16 + React 19)
- All web apps use the same stack: Next.js App Router + Tailwind v4 + Radix UI
- **Shared packages**: @upllyft/ui (components), @upllyft/api-client (auth + API), @upllyft/types
- **State**: TanStack Query for server state, React Hook Form + Zod for forms
- **API proxy**: Next.js rewrites `/api/:path*` → `localhost:3001/api/:path*`
- **Auth**: `<AuthProvider>` from @upllyft/api-client wraps each app

### Mobile (Expo 54 + React Native 0.81)
- Expo Router for file-based navigation
- Own axios API client with token refresh (not @upllyft/api-client)
- expo-secure-store for token storage (Keychain/EncryptedSharedPreferences)
- Biometric authentication (Face ID / fingerprint)
- Role-based tab navigation (parent vs therapist)

### Key Patterns
- **Package manager**: pnpm with workspace protocol
- **Build system**: Turborepo with caching
- **Roles**: USER, THERAPIST, EDUCATOR, ORGANIZATION, ADMIN, MODERATOR (parents use USER role)
- **Auth flow**: JWT in response body, refresh via POST /auth/refresh
- **API proxy**: All web apps proxy /api/* to the backend via Next.js rewrites
- **Brand**: Teal gradient (teal-400 to teal-600), rounded corners, subtle shadows

### @upllyft/ui Component API
- **Avatar**: `<Avatar src={url} name={name} size="md" />` (no sub-components)
- **Card**: Simple div wrapper (no CardHeader/CardTitle/CardContent)
- **Badge**: `color` prop (green, blue, yellow, red, gray, purple) — not `variant`
- **Button**: variants: primary, secondary, outline, ghost (no "destructive")

## Troubleshooting

### Build fails with memory error
The API build allocates 4GB: `node --max-old-space-size=4096`. Ensure you have enough RAM.

### Prisma migration fails (pgvector)
Shadow database creation fails due to pgvector extension. Create migrations manually:
```bash
pnpm --filter @upllyft/api prisma:migrate --create-only
# Edit the SQL, then apply
```

### TypeScript errors in web-cases
`web-cases` uses `ignoreBuildErrors: true` in next.config.ts due to complex type casting. TypeScript strict mode still runs on other apps.

### Mobile can't reach API
For physical device testing, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's local IP (not localhost):
```
EXPO_PUBLIC_API_URL=http://192.168.1.x:3001
```

### Cross-app auth in development
Auth tokens are stored in both cookies and localStorage. Cookies on `localhost` are shared across all ports, so logging in on `:3000` automatically authenticates you on `:3006`, `:3004`, etc. If auth issues arise, clear cookies for `localhost` in your browser.

## Adding a New Web App

1. Create `apps/<app-name>/` with package.json named `@upllyft/<app-name>`
2. Add dependencies: `@upllyft/ui`, `@upllyft/api-client`, `@upllyft/types` as `workspace:*`
3. Copy from existing app: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `globals.css`
4. Set `transpilePackages` in `next.config.ts`
5. Create `vercel.json` for deployment
6. Wrap app in `<AuthProvider baseURL="/api">` in providers

## Adding a New Package

1. Create `packages/<pkg-name>/` with package.json named `@upllyft/<pkg-name>`
2. Export via `main`, `types`, and `exports` fields in package.json
3. Add to consuming apps as `"@upllyft/<pkg-name>": "workspace:*"`

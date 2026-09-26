# Upllyft Platform

A multi-app monorepo for the neurodivergent community — connecting parents, therapists, educators, and organizations.

## Architecture

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  app.safehaven-upllyft.com  (apps/web-main, port 3000)               │
   │  /            dashboard, feed, profile, settings, /admin console     │
   │  /community   posts, Q&A, events, crisis                             │
   │  /screening   developmental screenings, reports                      │
   │  /booking     therapist marketplace, sessions, Stripe                │
   │  /resources   AI worksheets, assignments, library                    │
   │  /cases       case management, IEPs, nursery                         │
   │  /clinic      clinic administration                                  │
   └───────────────────────────────┬──────────────────────────────────────┘
                                   │  /api/* proxied
                                   ▼
                         ┌──────────────────┐        ┌────────────────┐
                         │    NestJS API    │◄──────►│  Postgres +    │
                         │   (apps/api)     │        │  pgvector,     │
                         │     :3001        │        │  Redis (opt.)  │
                         └──────────────────┘        └────────────────┘
   apps/landing (:3008) marketing site · apps/mobile Expo app (own API client)
```

The six former standalone web apps (community, screening, booking, resources, cases, clinic admin) were merged into web-main; their old subdomains redirect to the matching hub prefix.

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm
pnpm install
pnpm dev
```

## Shared Packages

| Package | Description |
|---------|-------------|
| `@upllyft/ui` | Shared React components (Button, Card, Avatar, etc.) |
| `@upllyft/api-client` | Axios-based API client with auth + token refresh |
| `@upllyft/types` | Shared TypeScript types and enums |
| `@upllyft/config` | Shared tsconfig, ESLint, and Tailwind configs |

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Backend**: NestJS 11, Prisma, PostgreSQL
- **Mobile**: Expo, React Native
- **AI**: OpenAI (DALL-E), Anthropic (Claude)

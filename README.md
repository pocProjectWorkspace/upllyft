# Upllyft Platform

A multi-app monorepo for the neurodivergent community — connecting parents, therapists, educators, and organizations.

## Architecture

```
                         ┌──────────────────┐
                         │   upllyft.com    │
                         │   (web-main)     │
                         └────────┬─────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Community  │ │ Screening  │ │  Booking   │ │ Resources  │ │   Cases    │
   │  :3001     │ │   :3002    │ │   :3003    │ │   :3004    │ │   :3005    │
   └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘
          │           │           │           │           │
          └───────────┴───────────┼───────────┴───────────┘
                                  ▼
                         ┌──────────────────┐
                         │    NestJS API    │
                         │     :3001        │
                         └──────────────────┘
```

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

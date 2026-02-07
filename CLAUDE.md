# CLAUDE.md

## Project Overview

Upllyft is a multi-app monorepo for a neurodivergent community platform, built with Turborepo.

## Monorepo Structure

```
upllyft/
├── apps/
│   ├── api/                    # NestJS backend (placeholder)
│   ├── web-main/               # Main hub dashboard (port 3000)
│   ├── web-community/          # Community module (port 3001)
│   ├── web-screening/          # Screening module (port 3002)
│   ├── web-booking/            # Booking module (port 3003)
│   ├── web-resources/          # Learning resources (port 3004)
│   ├── web-cases/              # Case management (port 3005)
│   └── mobile/                 # Expo React Native app (placeholder)
├── packages/
│   ├── ui/                     # @upllyft/ui — shared React components
│   ├── api-client/             # @upllyft/api-client — shared API client + auth
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

### Run a specific app:
```bash
pnpm --filter @upllyft/web-main dev      # Just the dashboard
pnpm --filter @upllyft/web-community dev  # Just community
```

## Adding a New App

1. Create `apps/<app-name>/` with package.json named `@upllyft/<app-name>`
2. Add `@upllyft/ui`, `@upllyft/api-client`, `@upllyft/types` as workspace dependencies
3. Set `transpilePackages` in `next.config.ts`
4. Copy `tsconfig.json`, `postcss.config.mjs`, and `globals.css` from an existing app

## Adding a New Package

1. Create `packages/<pkg-name>/` with package.json named `@upllyft/<pkg-name>`
2. Export via `main`, `types`, and `exports` fields in package.json
3. Add to consuming apps' dependencies as `"@upllyft/<pkg-name>": "workspace:*"`

## Key Patterns

- **Package manager**: pnpm (workspace protocol)
- **Build system**: Turborepo with caching
- **UI framework**: Next.js 16 + React 19 + Tailwind CSS v4
- **Type sharing**: @upllyft/types package, source-level imports (no build step)
- **API client**: @upllyft/api-client with axios, token refresh, React auth context
- **Styling**: Tailwind v4 with `@import "tailwindcss"` and `@theme inline` for custom colors
- **Brand colors**: Teal gradient (teal-400 to teal-600 primary)
- **Component style**: Rounded corners (rounded-xl/2xl), subtle shadows, gradient accents

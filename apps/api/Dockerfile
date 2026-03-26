# ─────────────────────────────────────────────
# Stage 1: Build
# Installs all deps, generates Prisma, compiles TS
# ─────────────────────────────────────────────
FROM node:20-slim AS builder

# Native module build tools (bcrypt, canvas, prisma)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Copy workspace-level files first (cache-friendly) ──
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# ── Copy package.json files for dependency resolution ──
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client/package.json ./packages/api-client/

# ── Install dependencies ──
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
RUN pnpm install --frozen-lockfile

# ── Copy source code ──
COPY apps/api ./apps/api
COPY packages ./packages

# ── Generate Prisma client ──
RUN cd apps/api && npx prisma generate

# ── Build the NestJS API ──
RUN pnpm --filter @upllyft/api build


# ─────────────────────────────────────────────
# Stage 2: Production Runner
# Minimal image with only runtime dependencies
# ─────────────────────────────────────────────
FROM node:20-slim AS runner

# Runtime deps: Chromium for Puppeteer, native module support
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium (no download)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# ── Copy pnpm from builder (required for Railway start command) ──
COPY --from=builder /app/node_modules/.bin /app/node_modules/.bin

# ── Copy compiled assets from builder ──
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma ./prisma

# ── Copy Prisma generated client + engine ──
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# ── Runtime configuration ──
ENV NODE_ENV=production

# Railway sets PORT automatically — app reads from process.env.PORT
EXPOSE ${PORT:-3001}

# ── Health check ──
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# ── Start the server ──
CMD ["node", "dist/main.js"]

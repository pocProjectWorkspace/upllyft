FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    chromium \
    libnss3 \
    libfreetype6 \
    libharfbuzz0b \
    ca-certificates \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    openssl \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
COPY packages/api-client/package.json ./packages/api-client/

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages ./packages

RUN cd apps/api && npx prisma generate
RUN pnpm --filter @upllyft/api build

RUN ls -la apps/api/dist/ && echo "✅ Build output found"

//RUN CI=true pnpm prune --prod

EXPOSE ${PORT:-3001}

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]

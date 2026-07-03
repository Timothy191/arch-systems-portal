# API Dockerfile — NestJS with Fastify
# Three stages: deps → builder → production

# ── Stage 1: deps ──────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm@9.15.9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/supabase/package.json packages/supabase/
COPY packages/redis/package.json packages/redis/
COPY packages/utils/package.json packages/utils/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN --mount=type=cache,target=/pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline

# ── Stage 2: builder ───────────────────────────────────
FROM deps AS builder
COPY . .
ENV NODE_ENV=production
RUN pnpm --filter api build

# ── Stage 3: production ──────────────────────────────────
FROM node:22-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001

USER node
CMD ["node", "dist/main"]

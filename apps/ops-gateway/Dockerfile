# Ops-Gateway Dockerfile — Meta-Backend / Control Plane (MCP + Incident Engine)
# Three stages: deps → builder → production

# ── Stage 1: deps ──────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm@9.15.9
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline

# ── Stage 2: builder ───────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ── Stage 3: production ──────────────────────────────────
FROM node:22-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV OPS_API_URL=http://host.docker.internal:3001/api/ops
ENV MCP_PORT=3100

EXPOSE 3100

USER node
CMD ["node", "dist/index.js"]

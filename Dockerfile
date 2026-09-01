# syntax=docker/dockerfile:1

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build the standalone server bundle ──────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so
# they must be supplied here (not just at runtime). The workflow passes the
# production values; defaults keep a bare `docker build` working locally.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/
ARG NEXT_PUBLIC_APP_URL=http://localhost:5173
ARG NEXT_PUBLIC_ENV=production
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ARG NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS
ARG NEXT_PUBLIC_EMBED_FULLSCREEN_URL
ARG NEXT_PUBLIC_MOCK_CHAT
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN \
    NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS=$NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS \
    NEXT_PUBLIC_EMBED_FULLSCREEN_URL=$NEXT_PUBLIC_EMBED_FULLSCREEN_URL \
    NEXT_PUBLIC_MOCK_CHAT=$NEXT_PUBLIC_MOCK_CHAT \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Stage 3: minimal runtime image ──────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=5173 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# `standalone` already contains a pruned node_modules + server.js; static and
# public assets are copied alongside it as Next expects.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 5173

CMD ["node", "server.js"]

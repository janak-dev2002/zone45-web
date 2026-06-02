# Multi-stage build — ZoneForty5 Nginx + Frontend
# Build context must be the repo root:
#   docker build -f devops/nginx.Dockerfile -t zone45-nginx .
#
# The frontend TypeScript imports @zf45/shared-types which resolves into
# ../shared-types/src/index.ts → ../backend/src/lib/schemas.ts.
# backend/ and shared-types/ node_modules must be installed before the
# frontend build runs, hence the three separate npm ci stages below.

# ── Stage 1: Build frontend assets ────────────────────────────────────────────
FROM node:20-alpine AS build

# Install backend deps first (shared-types TS resolution traverses backend/src)
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --prefer-offline --no-audit --ignore-scripts

# Install shared-types deps (has its own zod devDependency)
WORKDIR /app/shared-types
COPY shared-types/package*.json ./
RUN npm ci --prefer-offline --no-audit --ignore-scripts

# Install frontend deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy source files required for the build
COPY frontend/           /app/frontend/
COPY shared-types/       /app/shared-types/
COPY backend/src         /app/backend/src
COPY backend/tsconfig.json /app/backend/tsconfig.json

# Build-time env vars (passed as --build-arg in CI; defaults are safe for prod)
ARG VITE_API_URL=/api
ARG VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

WORKDIR /app/frontend
RUN npm run build
# Output: /app/frontend/dist

# ── Stage 2: Production Nginx image ───────────────────────────────────────────
FROM nginx:1.27-alpine AS serve
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY devops/nginx/nginx.conf         /etc/nginx/nginx.conf
COPY devops/nginx/conf.d/            /etc/nginx/conf.d/
COPY devops/nginx/entrypoint.sh      /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Nginx master needs root to bind :80/:443; workers run as nginx (set in nginx.conf)
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]

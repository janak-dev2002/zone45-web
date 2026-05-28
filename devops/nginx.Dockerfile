# Stage 1 — Build frontend assets
# Build context must be the repo root (docker build -f devops/nginx.Dockerfile .)
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit
COPY frontend/ ./
RUN npm run build

# Stage 2 — Production Nginx image
FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY devops/nginx/nginx.conf /etc/nginx/nginx.conf
COPY devops/nginx/conf.d/ /etc/nginx/conf.d/
COPY devops/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Nginx master needs root to bind :80/:443; workers run as nginx user (set in nginx.conf)
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]

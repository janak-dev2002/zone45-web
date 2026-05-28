.PHONY: up down dev logs restart status shell-api shell-db backup deploy

# ── Production (local) ────────────────────────────────────────────────────────
up:
	docker compose -f devops/docker-compose.yml up -d

down:
	docker compose -f devops/docker-compose.yml down

logs:
	docker compose -f devops/docker-compose.yml logs --tail=200 -f

restart:
	docker compose -f devops/docker-compose.yml restart

restart-api:
	docker compose -f devops/docker-compose.yml restart api

restart-nginx:
	docker compose -f devops/docker-compose.yml restart nginx

status:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# ── Local development ─────────────────────────────────────────────────────────
dev:
	docker compose \
	  -f devops/docker-compose.yml \
	  -f devops/docker-compose.dev.yml \
	  up -d

dev-down:
	docker compose \
	  -f devops/docker-compose.yml \
	  -f devops/docker-compose.dev.yml \
	  down

# ── Shell access ──────────────────────────────────────────────────────────────
shell-api:
	docker exec -it zf45-api sh

shell-db:
	docker exec -it zf45-postgres psql -U $${POSTGRES_USER:-zf45} $${POSTGRES_DB:-zf45}

shell-redis:
	docker exec -it zf45-redis redis-cli

# ── Database ──────────────────────────────────────────────────────────────────
# Run database migrations (inside the api container after it's up)
migrate:
	docker exec zf45-api npm run migrate

# Manual backup to local file (not S3 — for local dev use)
backup-local:
	mkdir -p backups
	docker exec zf45-postgres \
	  pg_dump -U $${POSTGRES_USER:-zf45} $${POSTGRES_DB:-zf45} \
	  | gzip > backups/db-$$(date +%Y-%m-%d-%H%M%S).sql.gz
	@echo "Backup written to backups/"

# Restore from a local backup file
# Usage: make restore-local FILE=backups/db-2026-05-28.sql.gz
restore-local:
	@test -n "$(FILE)" || (echo "Usage: make restore-local FILE=<path>"; exit 1)
	gunzip -c $(FILE) | docker exec -i zf45-postgres \
	  psql -U $${POSTGRES_USER:-zf45} $${POSTGRES_DB:-zf45}

# ── Build ─────────────────────────────────────────────────────────────────────
build:
	docker compose -f devops/docker-compose.yml build

build-nginx:
	docker build -f devops/nginx.Dockerfile -t zone45-nginx:local .

# ── Cert management (production) ─────────────────────────────────────────────
# Manually trigger cert renewal check (normally runs on schedule)
renew-certs:
	docker compose -f devops/docker-compose.yml run --rm certbot certbot renew

# ── Cleanup ───────────────────────────────────────────────────────────────────
prune:
	docker image prune -f
	docker volume prune -f

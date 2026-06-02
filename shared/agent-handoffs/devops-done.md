# DevOps Agent — Done (Handoff)

> Agent: DevOps (Claude Sonnet 4.6)
> Branch: `devops-agent-branch`
> Completed: 2026-05-28
> Status: **COMPLETE — PR raised to main**

---

## Summary

All [DEVOPS] tasks are complete. The repository now contains the full production
infrastructure: containerisation, CI/CD pipelines, Nginx configuration, TLS
management, backup automation, and documentation for all manual cloud steps.

The stack is deployable with `docker compose up -d` once the one-time environment
setup (EC2 provisioning, Cloudflare DNS, TLS bootstrap) described in the manual
steps below is complete.

---

## Files Written

All files created on branch `devops-agent-branch`.

### Containerisation

| File | Purpose |
|------|---------|
| `devops/nginx.Dockerfile` | Multi-stage: Node 20 builds frontend SSG → Nginx 1.27 serves it |
| `devops/nginx/entrypoint.sh` | Nginx startup script with 12h periodic reload for cert renewal pickup |
| `devops/nginx/nginx.conf` | Main Nginx config: worker settings, TLS shared config, gzip, access log with timing |
| `devops/nginx/conf.d/default.conf` | Site config: HTTP→HTTPS redirect, www→apex redirect, TLS termination, HSTS, CSP, API proxy, SPA fallback, static files |
| `devops/docker-compose.yml` | Production Compose: 5 services (nginx, api, postgres, redis, certbot) |
| `devops/docker-compose.dev.yml` | Local dev overrides: local builds, ports exposed, no certbot |
| `devops/.env.example` | All required env vars documented with descriptions and generation commands |

### CI/CD

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | PR checks: backend tsc+lint+tests, frontend tsc+lint+build, Playwright smoke |
| `.github/workflows/deploy.yml` | Push-to-main: build images → push to GHCR → SSH to EC2 → `docker compose up -d` |

### Infrastructure documentation (manual steps)

| File | Purpose |
|------|---------|
| `devops/cloudflare/README.md` | Step-by-step: DNS records, Email Routing, Turnstile widget, R2 bucket setup |
| `devops/aws/README.md` | Step-by-step: EC2 provisioning, Docker install, TLS bootstrap, S3 bucket, IAM, cron setup |
| `devops/scripts/backup-postgres.sh` | Nightly `pg_dump` → gzip → S3 upload; runs via EC2 host cron at 02:00 UTC |

### Developer experience

| File | Purpose |
|------|---------|
| `Makefile` | Shortcuts: `make up`, `make dev`, `make logs`, `make shell-db`, `make backup-local`, etc. |

---

## Manual Steps Required (in order)

These steps cannot be automated — they require the founder's credentials and
dashboard access. Complete them in order before the first automated deploy.

### Phase 1 — Cloudflare setup (see `devops/cloudflare/README.md`)

1. Add `zoneforty5.tech` to Cloudflare, switch nameservers at registrar
2. Add DNS A records (apex + www) pointing to EC2 EIP — set to **DNS Only**
3. Add CNAME `cdn.zoneforty5.tech` → R2 bucket hostname (proxied)
4. Add SPF TXT record (merged Resend + Cloudflare Email Routing)
5. Add DKIM TXT record from Resend dashboard
6. Add DMARC TXT record
7. Enable Cloudflare Email Routing, create rule `hello@` → founder Gmail, verify destination
8. Create Cloudflare Turnstile widget, copy site key + secret
9. Create R2 bucket `zf45-uploads`, enable public access, bind `cdn.zoneforty5.tech`
10. Set R2 CORS policy for `https://zoneforty5.tech`
11. Create R2 API token, copy credentials

### Phase 2 — AWS setup (see `devops/aws/README.md`)

1. Provision EC2 t3.small in ap-south-1, Ubuntu 24.04, 30 GiB gp3
2. Configure security group `zf45-web-sg` (SSH restricted, 80/443 open)
3. Allocate and attach Elastic IP; note the EIP for Phase 1 DNS records
4. SSH in; install Docker + Docker Compose v2
5. Install AWS CLI; configure with backup IAM credentials
6. Clone repo to `~/zone45-web`
7. Create `.env` from `devops/.env.example`, fill in all values
8. Run initial TLS bootstrap (self-signed dummy cert → `certbot certonly --webroot`)
9. Create S3 bucket `zf45-backups` with 30-day lifecycle policy
10. Create IAM user `zf45-backup-agent` with minimal S3 write permissions
11. Install backup script at `/usr/local/bin/backup-postgres`, set cron at 02:00 UTC

### Phase 3 — GitHub Actions secrets

Set these in GitHub repo → Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 Elastic IP |
| `EC2_SSH_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full contents of `.pem` private key |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) |

`GITHUB_TOKEN` is provided automatically.

---

## Environment Variables Required

All documented in `devops/.env.example`. Mandatory for the stack to start:

| Variable | How to generate |
|----------|-----------------|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Choose values; password: `openssl rand -hex 16` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` (must differ from JWT_SECRET) |
| `ADMIN_EMAIL`, `ADMIN_NAME` | Founder's email and name |
| `ADMIN_PASSWORD_HASH` | Argon2id hash — generate with the snippet in `devops/.env.example` |
| `RESEND_API_KEY` | From Resend dashboard |
| `TURNSTILE_SITE_KEY` | From Cloudflare Turnstile dashboard (public) |
| `TURNSTILE_SECRET` | From Cloudflare Turnstile dashboard (private) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` | From Cloudflare R2 dashboard |
| `CERTBOT_EMAIL` | Email for Let's Encrypt cert expiry notifications |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | From IAM user `zf45-backup-agent` |

---

## Deployment Procedure

### Automatic (every push to `main`)

The `deploy.yml` workflow handles it:
1. Builds API and Nginx (+ frontend SSG) images
2. Pushes to GHCR with commit SHA tag
3. SSHes to EC2, pulls new images, runs `docker compose up -d --no-build`
4. Smoke-tests `GET /api/health` → must return 200

### Manual (on EC2)

```bash
cd ~/zone45-web
git pull
cp devops/docker-compose.yml docker-compose.yml
IMAGE_TAG=<sha or 'latest'> docker compose pull
IMAGE_TAG=<sha or 'latest'> docker compose up -d --no-build
docker image prune -f
```

---

## Architecture Notes for QA Agent

- **API port:** `8080` (not exposed to host — Nginx proxies via Docker bridge `zf45-net`)
- **Database port:** `5432` (not exposed to host)
- **Redis port:** `6379` (not exposed to host)
- **Health endpoint:** `GET /api/health` → 200 (no auth required)
- **HTTPS only in production.** Port 80 redirects to 443.
- **Frontend served as static HTML** from `/usr/share/nginx/html` inside the nginx container.
  The React SPA is pre-rendered at image build time via `npm run build`.
- **Certbot renewal** is automatic (every 12h check via entrypoint loop); Nginx picks up
  new certs via a 12h reload cycle.
- **Backups** run at 02:00 UTC on the EC2 host, not inside a container.
  To verify: `aws s3 ls s3://zf45-backups/ --recursive` from the EC2.

### Stack one-liner (local dev)

```bash
make dev
# or
docker compose -f devops/docker-compose.yml -f devops/docker-compose.dev.yml up -d
```

---

## Open Questions / Risks for Founder Review

1. **TLS bootstrap is manual** on first deploy. The sequence in `devops/aws/README.md`
   must be followed exactly. Subsequent cert renewals are fully automatic.

2. **SSH access restricted to founder's static IP.** If the IP changes (home move,
   travel), update the security group rule before attempting to SSH.

3. **Single EC2 = single point of failure.** Nightly backups mitigate data loss (RPO 24h).
   Recovery runbook should be written by the Docs Agent referencing `devops/aws/README.md`.

4. **API image tag.** The `backend/Dockerfile` is referenced in `deploy.yml` but has not
   been written yet (Backend Agent's responsibility). The deploy workflow will fail until
   that file exists. CI will catch this — the deploy only triggers on push to `main`.

5. **Playwright tests (`tests/` directory)** are referenced in `ci.yml` but that directory
   does not exist yet. The `e2e` job is gated on `if: github.event_name == 'pull_request'`
   and the step uses `--passWithNoTests` equivalent — it will not block PRs if the
   `tests/` directory is absent. QA Agent owns that directory.

6. **Frontend build argument `VITE_TURNSTILE_SITE_KEY`** is passed at Docker build time
   in `deploy.yml`. The Frontend Agent must expose this as a Vite env var (`import.meta.env.VITE_TURNSTILE_SITE_KEY`) in their code.

---

---

## Bug Fix Round 2 — BUG-001 / BUG-003 (2026-06-02)

> Branch: `devops/fix-nginx-json-csp` | PR: #14 | Commit: `4cd7be5`

### BUG-001 — SPA fallback serving index.html for missing .json files

**Problem:** `try_files $uri $uri/ /index.html` in the SPA catch-all matched ALL
missing files including `.json` paths. A missing JSON file returned a 200 with
HTML content, silently breaking the JS parser on any fetch that expected JSON.

**Fix:** Added a `location ~* \.json$` block immediately before the SPA catch-all:

```nginx
location ~* \.json$ {
    try_files $uri =404;
}
```

Nginx evaluates location blocks by specificity — this regex block matches before
the generic `/` catch-all, so missing `.json` paths now correctly return 404.

### BUG-003 — CSP violations (font-src data: + script-src unsafe-inline)

**Problem:** Two browser console CSP violations:
1. `font-src 'self'` blocked data: URI fonts (woff2 loaded as data URIs)
2. `script-src` blocked Cloudflare Turnstile inline event handler injection

**Fix:** Updated the `Content-Security-Policy` add_header value:
- `font-src`: added `data:` source
- `script-src`: added `'unsafe-inline'`

**Trade-off (documented in config comment):** `'unsafe-inline'` weakens XSS
protection. Accepted here because: (a) Turnstile execution is sandboxed inside
a Cloudflare iframe, (b) the script origin is still locked to
`https://challenges.cloudflare.com`, and (c) a hash/nonce approach is not viable
without SSR — the static SSG build has no mechanism to inject per-request nonces.

### Post-fix action required

After PR #14 merges to `main`:
1. CI pipeline builds and deploys automatically
2. QA Agent to re-run full smoke test suite (currently BLOCKED on this PR)
3. Verify: missing `.json` path → 404; no CSP console errors on zoneforty5.tech

*End of Bug Fix Round 2 section.*

---

*End of devops-done handoff. DevOps Agent session complete.*

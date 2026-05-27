# Architecture — Done (Handoff)

> Agent: Architecture (Claude Opus 4.7)
> Completed: 2026-05-25 (drafted) / 2026-05-25 (approved by founder)
> Status: **APPROVED**. Phase 2 (Database Agent) is unblocked. All 10 open questions are resolved — see `architecture.md` §9 and `change-log.md` (2026-05-25 entry).

---

## Summary

Designed the full system for the ZoneForty5 company website + admin panel against the locked tech stack (Node 20 + Express + TS, React 18 + TS + Vite, PostgreSQL 16, Redis 7, Nginx, Resend, Docker Compose on a single EC2). Wrote three documents:

- `shared/architecture.md` — 9-section system design (stack, components, data flow, infra, risks, open questions).
- `shared/api-contracts.md` — 22 endpoints, error envelope, rate limits, auth cookie scheme.
- `shared/db-schema.md` — 6 tables (admin_users, portfolio_projects, blog_posts, tags, post_tags, contact_submissions), enum type, indexes, migration sequence.

The system is sized for a low-traffic brochure site with a single-author admin panel. Cost target: ~$19/month all-in on AWS. SEO is solved via pre-rendered Vite SSG (not Next.js — flagged as Q1 for founder).

---

## Key Decisions Made (Architecture's call, no founder input needed)

1. **Vite + SSG for the frontend, not Next.js.** Simpler hosting, cheaper, no Node at the edge. (See Q1 — founder can override.)
2. **Tailwind CSS for styling.** Best fit for the custom dark "serious tech studio" aesthetic; no fighting library defaults.
3. **httpOnly cookies for JWT, not localStorage.** XSS protection. Two cookies: 15-min access (`zf45_at`) + 7-day refresh (`zf45_rt`) with Redis-backed rotation/revocation.
4. **Argon2id for password hashing** (memory 64 MiB, iterations 3, parallelism 4). Current best practice.
5. **`pg` + `node-pg-migrate`, no ORM.** SQL-first migrations; query layer is small enough that an ORM adds more weight than value.
6. **`zod` for runtime validation** on both halves via a `shared-types` package. Single source of truth for request/response shapes.
7. **`ioredis` for the cache/rate-limit client.** Standard choice; supports the Lua scripts we'll likely want for atomic rate-limit ops.
8. **`pino` for structured JSON logging.** Docker captures stdout; correlation IDs on every line.
9. **Redis used for three things only:** rate-limit buckets, refresh-token registry, 60s response cache on the two hot public endpoints. No session storage (we're using JWT).
10. **PostgreSQL 16 in a container on the same EC2 host** (not RDS). Externalise only when DB grows past ~10 GiB or write contention shows up — see `architecture.md` §6.4.
11. **UUID primary keys** via `pgcrypto`. Admin URLs include row id without leaking counts.
12. **`citext` for `slug` and `email`** columns — case-insensitive uniqueness.
13. **`tech_stack` as JSONB array on `portfolio_projects`**, NOT a normalised join table. At this scale joins are net negative.
14. **No `author_id` FK on `blog_posts`** at MVP. Single author, no benefit. Documented as reversible.
15. **Hard deletes** for portfolio and posts. No soft-delete column at MVP. Contact submissions are append-only.
16. **CI/CD: GitHub Actions + GHCR.** Workflow runs on push to `main`, SSHes to EC2, `docker compose up -d`.
17. **Region: `ap-south-1` (Mumbai)** if provisioning fresh — lowest latency to founder location. Reuses existing EC2 if Q8 confirms.
18. **Single `docker-compose.yml`** with five services: nginx, api, postgres, redis, certbot. One `docker compose up` starts everything.
19. **Pre-rendered blog posts trigger a rebuild via `repository_dispatch`** on publish. ~3 min from publish to live HTML.
20. **Append-only contact submissions** with `status` enum and retry-by-cron pattern. Submission persistence does NOT depend on Resend availability.

---

## Decisions Approved by Founder (2026-05-25)

All 10 open questions are answered. Recorded in `change-log.md` (2026-05-25 entry) and `architecture.md` §9.

| # | Question | Approved decision | Affects agent |
|---|---|---|---|
| Q1 | Frontend rendering | Vite + SSG | Frontend |
| Q2 | Contact form recipient | `hello@zoneforty5.tech` → forwarded to founder Gmail | Backend |
| Q3 | Cloudflare Turnstile on contact + login | Yes | Backend + Frontend |
| Q4 | DNS provider | Cloudflare | DevOps |
| Q5 | Image hosting | **Cloudflare R2 + pre-signed PUT URLs** (b-lite) | Backend (new endpoint) + Frontend (upload widget) |
| Q6 | Blog body format | Markdown (`react-markdown` + `rehype-highlight`) | Frontend |
| Q7 | Admin bootstrap | Env-driven seed on first boot | Backend |
| Q8 | EC2 | Provision fresh `t3.small` in `ap-south-1` | DevOps |
| Q9 | Backup strategy | `pg_dump` nightly only at MVP | DevOps |
| Q10 | `www` redirect | `www → apex` (301) | DevOps |

Approval gate is **CLEARED**. Phase 2 (Database Agent) may begin immediately.

---

## Prerequisites — accounts, DNS records, and secrets

These are operational items the founder owns (not architecture decisions). Placeholders are used where the real value will be produced during provisioning. DevOps Agent expands these into a concrete launch checklist; Backend and Frontend code consumes them via env vars.

### Accounts that must exist before specialist work completes

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| A1 | AWS account with EC2 + S3 + Route53 (optional) perms | TBD | Founder | Founder already has AWS; confirm IAM user exists with the listed perms or create one. |
| A2 | Cloudflare account, `zoneforty5.tech` added to it (nameservers switched at registrar) | TBD | Founder | Required for Q3, Q4, Q5, Q2 forwarding. |
| A3 | Resend account, `zoneforty5.tech` added & DKIM/SPF verified | TBD | Founder | Send-from address: `noreply@zoneforty5.tech`. |
| A4 | Cloudflare Turnstile widget registered, site key + secret captured | TBD | Founder | One widget covers both `/contact` and `/auth/login`. |
| A5 | Cloudflare Email Routing rule: `hello@zoneforty5.tech` → founder's Gmail | TBD | Founder | Verifies the destination Gmail via a one-click email. |
| A6 | Cloudflare R2 enabled, bucket `zf45-uploads` created, custom domain `cdn.zoneforty5.tech` bound | TBD | Founder | R2 → Settings → Custom Domains. CORS allow-list for `https://zoneforty5.tech`. |
| A7 | GitHub repo `janak-dev2002/zone45-web` access confirmed | DONE (per project card) | Founder | Repo already exists. |

### Environment variables and secrets (placeholders)

These names are the canonical env keys the Backend and DevOps agents will use. Real values are set at deploy time; the placeholders below document the shape so agents can build against them now.

**API runtime (`.env.production` on the EC2 host + GitHub Actions secrets):**
```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Database
DATABASE_URL=postgres://zf45:<PG_PASSWORD>@postgres:5432/zf45

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=<32-byte-random-hex>            # generate: openssl rand -hex 32
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Admin bootstrap (Q7)
ADMIN_EMAIL=admin@zoneforty5.tech
ADMIN_NAME=Janaka Sangeeth
ADMIN_PASSWORD_HASH=<argon2id-encoded-string>
# Generate once with the snippet in §"Admin password hash" below.

# Resend (Q2, Q3)
RESEND_API_KEY=re_<REDACTED>
EMAIL_FROM=noreply@zoneforty5.tech
EMAIL_TO=hello@zoneforty5.tech             # Cloudflare forwards to founder Gmail

# Cloudflare Turnstile (Q3)
TURNSTILE_SITE_KEY=<TURNSTILE_SITE_KEY>    # public, baked into frontend build
TURNSTILE_SECRET=<TURNSTILE_SECRET>        # server-side only

# Cloudflare R2 (Q5)
R2_ACCOUNT_ID=<CF_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
R2_BUCKET=zf45-uploads
R2_PUBLIC_BASE=https://cdn.zoneforty5.tech
R2_ENDPOINT=https://<CF_ACCOUNT_ID>.r2.cloudflarestorage.com

# Misc
CORS_ORIGIN=                                # leave empty in prod (same-origin)
```

**GitHub Actions secrets (for `deploy.yml`):**
```
EC2_HOST=<EIP_OR_DNS>
EC2_SSH_USER=ubuntu
EC2_SSH_KEY=<PRIVATE_KEY_PEM_CONTENTS>
GHCR_TOKEN=<auto, via GITHUB_TOKEN>
AWS_ACCESS_KEY_ID=<AWS_IAM_KEY>            # for S3 backup uploads
AWS_SECRET_ACCESS_KEY=<AWS_IAM_SECRET>
S3_BACKUP_BUCKET=zf45-backups
```

### DNS records (Cloudflare zone `zoneforty5.tech`)

```
;; apex + www
@        A      <EC2_EIP>                       proxied: orange-cloud OFF (Let's Encrypt cert lives on origin)
www      CNAME  zoneforty5.tech.                proxied: orange-cloud OFF

;; CDN for R2 uploads
cdn      CNAME  <R2_PUBLIC_BUCKET_HOSTNAME>     proxied: orange-cloud ON (R2 supports proxied)

;; Resend (values copied from Resend dashboard after adding domain)
resend._domainkey  TXT  "<RESEND_DKIM_VALUE>"
@                  TXT  "v=spf1 include:_spf.resend.com ~all"
_dmarc             TXT  "v=DMARC1; p=quarantine; rua=mailto:hello@zoneforty5.tech"

;; Cloudflare Email Routing (auto-managed once enabled — usually MX + TXT)
@   MX   route1.mx.cloudflare.net.  (priority 10)
@   MX   route2.mx.cloudflare.net.  (priority 30)
@   MX   route3.mx.cloudflare.net.  (priority 90)
@   TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

> Note: the SPF record needs to be merged (one TXT record on apex), not duplicated — Cloudflare Email Routing and Resend both want SPF. Combined: `v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all`. DevOps Agent verifies this is right.

### Admin password hash — one-liner

After provisioning, generate the `ADMIN_PASSWORD_HASH` once (run on the founder's machine, NOT on the EC2):

```bash
# Pick a strong password, then:
node -e "import('argon2').then(a => a.default.hash(process.argv[1], { type: a.default.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }).then(console.log))" 'YourStrongPasswordHere'
```

Paste the output (`$argon2id$v=19$m=65536,t=3,p=4$...`) into `ADMIN_PASSWORD_HASH`. Never check the plaintext into anywhere.

### Existing EC2 (Q8 follow-up)

A fresh EC2 is being provisioned. The founder's existing instance is **out of scope** for this project — leave it running or decommission as the founder sees fit; not Architecture's concern.

---

## Risks Identified (full detail in `architecture.md` §8)

| Severity | Likelihood | Risk | Mitigation owner |
|---|---|---|---|
| HIGH | MEDIUM | Single EC2 = single point of failure | DevOps (backups, runbook) |
| HIGH | HIGH | Contact form abuse / spam | Backend (rate limit, honeypot, Turnstile if Q3 approved, MX check) |
| HIGH | LOW | JWT secret leak | DevOps (secret hygiene, rotation runbook) |
| MEDIUM | HIGH | Deploy downtime (5–20s per push) | Frontend (localStorage drafts) + DevOps (off-peak deploy window) |
| MEDIUM | MEDIUM | Pre-rendering build complexity for blog | Backend (publish-time rebuild dispatch) + Docs (publish-flow runbook) |
| LOW | LOW | Resend free-tier ceiling (3k/month) | Backend (3-attempt cap, daily metric) |

---

## What Each Agent Needs to Read

Below is the minimum reading list per agent before starting. Each agent should also re-read `architecture.md` whenever the change-log records an update.

### Database Agent (Phase 2 — Gemini 3.1 Pro)
**Must read in order:**
1. `shared/architecture.md` §5 (Database Schema Overview) and §8.1 (backup risk).
2. `shared/db-schema.md` — your spec. Sections 4 (entities), 5 (migration sequence), 8 (query patterns), 11 (your responsibilities).

**Must produce:**
- Migration files under `backend/src/db/migrations/` (one per section 5 row).
- `shared/agent-handoffs/database-done.md` recording any deviations and confirmed `EXPLAIN` output.

**Must NOT do:**
- Add columns or change types of fields named in `api-contracts.md` without updating both files and `change-log.md`.
- Pre-build any "future-proofing" item listed in `db-schema.md` §10.

### Backend Agent (Phase 3 — Claude Sonnet 4.6, starts AFTER Database is done)
**Must read in order:**
1. `shared/architecture.md` — all of it, especially §1.1 (stack), §1.9 (auth design), §3 (data flows), §4 (API overview).
2. `shared/api-contracts.md` — your spec. All sections; §6 lists what you own.
3. `shared/db-schema.md` — sections 4 (entities), 8 (query patterns), 12 (what you need from it).
4. `shared/agent-handoffs/database-done.md` — once it exists.

**Must produce:**
- Implementation of all 22 endpoints in `api-contracts.md`.
- `shared-types/` package with Zod schemas exported for the frontend.
- Unit tests for every route handler (Universal Rule #9).
- Email template for the contact-form notification (HTML + plaintext).
- `repository_dispatch` payload for the post-publish rebuild trigger.
- `shared/agent-handoffs/backend-done.md`.

**Must NOT do:**
- Add an endpoint not in `api-contracts.md` without updating that file and `change-log.md` first.
- Use any auth scheme other than the cookie-based JWT described in §1.9 and §3.
- Skip the Origin header check on mutating endpoints.

### Frontend Agent (Phase 4 — Claude Sonnet 4.6)
**Must read in order:**
1. `shared/architecture.md` §1.2 (frontend stack), §2 (components), §3 (data flows), §8.5 (build-rebuild flow).
2. `shared/api-contracts.md` — all of it, especially §7 (what you need from it).
3. The brief in `D:\ZoneForty5-HQ\shared\projects\ZoneForty5-Website.md` for page list and non-functional requirements (mobile-first 375px, dark theme, SEO).
4. Once Backend Agent is producing types: import from `shared-types/`, do not hand-type response shapes.

**Phases:**
- **4a (parallel-safe with Backend Phase 3):** all public pages with mocked data. Use the schemas in `api-contracts.md` to type the mocks.
- **4b (after Backend is producing real endpoints):** wire admin panel against the live API; implement TanStack Query patterns.

**Must produce:**
- All five public pages and the admin panel.
- `react-helmet-async` per-route meta tags for SEO.
- localStorage draft autosave in the admin editor (mitigates risk 8.4).
- `vite-react-ssg` (or equivalent) config to pre-render the public routes.
- `shared/agent-handoffs/frontend-done.md`.

**Must NOT do:**
- Store the JWT in localStorage. Cookies are httpOnly — let the browser handle them.
- Render long-form blog/portfolio content without Markdown handling (Q6 recommendation).

### DevOps Agent (Phase 5 — Claude Sonnet 4.6, starts AFTER Backend and Frontend are both done)
**Must read in order:**
1. `shared/architecture.md` §1.6 (Nginx/TLS), §1.7 (Compose), §1.8 (CI/CD), §6 (Infrastructure), §8.1/8.3/8.4 (operational risks).
2. Confirm answer to Q8 (existing EC2 vs fresh), Q4 (DNS), Q10 (www redirect).

**Must produce:**
- `docker-compose.yml` (prod) + `docker-compose.dev.yml` (local overrides) — five services per architecture §6.2.
- `nginx/nginx.conf` and `nginx/conf.d/*` — TLS termination, HSTS, CSP, `/api/*` proxy, static SPA, sitemap/robots passthrough.
- Certbot sidecar wiring with renewal hook → Nginx reload.
- `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.
- pg_dump cron container + S3 upload script (per Q9 recommendation).
- DNS record list for the founder to apply at the DNS provider (per Q4 answer).
- `shared/agent-handoffs/devops-done.md`.

**Must NOT do:**
- Expose 5432 or 6379 to the EC2 host or internet — Docker bridge network only.
- Commit any secret to git. All secrets via GitHub Actions secrets + `.env.production` on the host (not in repo).
- Use `--no-verify` or any hook-skipping flag in deployment scripts.

### QA Agent (Phase 6 — Gemini 3.1 Pro)
**Must read in order:**
1. `shared/architecture.md` §3 (data flows) to understand happy and edge paths.
2. `shared/api-contracts.md` §5 (endpoint summary) for test matrix.
3. The brief for page list + admin features.

**Must produce:**
- Playwright E2E covering: every public page renders, contact form happy path, contact form rate-limit path, admin login + bad-creds path, admin CRUD on portfolio + posts, admin contact-submissions read.
- Test report in `shared/agent-handoffs/qa-done.md`.

### Docs Agent (Phase 7 — Claude Haiku 4.5)
**Must read in order:**
1. All prior `*-done.md` handoffs.
2. `architecture.md` open questions section — only DOCUMENT answered questions (not the recommendations).

**Must produce:**
- Client handover package per the `write-handover-docs` skill.
- `docs/runbooks/restore-from-backup.md` (cited in risk 8.1).
- `docs/runbooks/admin-publish-flow.md` (cited in risk 8.5).
- `docs/runbooks/jwt-secret-rotation.md` (cited in risk 8.3).
- SOP friction notes compiled from `shared/notes.md`.

---

## Assumptions I Made (documented so the founder can correct me)

1. **Single admin user, forever.** Architecture models `admin_users` as a table but assumes one row. If multi-admin is desired, raise it now — `blog_posts` schema is reversible but the cost grows once content exists.
2. **Public traffic stays low (< 5 req/s peak).** All sizing follows from this. Real numbers from a marketing push would change the t3.small recommendation.
3. **Founder owns the AWS account.** All cost estimates assume direct AWS billing, no AWS Activate credits factored in.
4. **`zoneforty5.tech` domain is registered and DNS is controllable.** Resend DKIM/SPF records depend on this.
5. **Founder's existing EC2 (Q8) is in `ap-south-1` or close.** If it's in another region, switch the region recommendation but the rest holds.
6. **The repo is private** (it's listed as `github.com/janak-dev2002/zone45-web` — assumed private until verified). If public, secret-scanning is on by default but tighten the GitHub Actions secrets review.
7. **No legal/compliance requirements** beyond standard professional practice. GDPR not assumed (no EU customer accounts). If a contact submission counts as PII under any jurisdiction, the retention/deletion approach in §8.1 may need revisiting.

---

## Open Risks NOT Mitigated at MVP (deliberate)

These are explicitly accepted as MVP-level trade-offs. Document them in the handover so the client can choose to invest later.

- **No multi-AZ.** Single AZ outage = downtime until manual recovery in a new AZ.
- **No staging environment.** All changes go through `main` directly. PR previews could be added later.
- **No application-level metrics dashboard.** Logs are structured but not aggregated. Add a CloudWatch Logs subscription or a hosted log service later.
- **No automated penetration testing.** QA Agent does functional E2E only. The `security-audit` skill at HQ exists if the founder wants a follow-up Security Agent pass.

---

## What I Would Do Differently With More Information

These are observations for the founder, not requests for action right now:

1. **If real traffic projections exceed a few hundred visitors/day,** revisit the Vite-SSG-vs-Next.js decision. Next.js ISR is the cleaner answer once content freshness matters.
2. **If a second admin user becomes realistic within 3 months,** add `author_id` to `blog_posts` now rather than later — backfill is cheap with one row.
3. **If the founder's existing EC2 is already running other workloads,** the port 80/443 conflict and the Docker network sharing get tricky — strongly recommend a fresh instance in that case.

---

*End of architecture-done handoff. Architecture Agent's session is complete.*

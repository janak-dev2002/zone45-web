# Architecture — ZoneForty5 Company Website

> STATUS: **APPROVED** by founder on 2026-05-25.
> Author: Architecture Agent (Claude Opus 4.7)
> Date: 2026-05-25 (drafted) / 2026-05-25 (approved)
> Project: ZoneForty5 Company Website + Admin Panel
> Deadline: 2026-06-01

This document is the single source of truth for the system design.
All 10 open questions are resolved — see §9 for the founder's answers.
Specialist agents are unblocked: Database → Backend → Frontend → DevOps → QA → Docs (per the project card sequence).

---

## 1. Tech Stack Decisions

The tech stack was locked by the founder at project intake. This section records the justification for each layer so downstream agents understand the intent, and so any future deviation has a clear baseline to compare against.

### 1.1 Backend — Node.js 20 LTS + Express 4 + TypeScript 5

**Choice:** Node.js 20 LTS, Express 4.x, TypeScript 5.x (strict mode), `pg` driver for PostgreSQL, `ioredis` for Redis, `zod` for runtime validation, `pino` for structured logging.

**Justification:** A content site with a small admin panel is overwhelmingly I/O bound — reading rows, rendering JSON, sending one email per contact submission. Node + Express is the lightest production-grade option that meets that profile: small memory footprint (~80 MB resident), instant cold start, mature ecosystem for JWT/validation/SQL. TypeScript with `strict: true` gives compile-time guarantees on the API surface that matter when a single agent (Backend) writes all endpoints in one pass.

**Alternatives considered and rejected:**
- **Fastify** — faster routing benchmarks, but the throughput advantage is irrelevant at this traffic scale (estimated < 5 req/s peak), and Express has a wider tutorial corpus which reduces friction for any future maintainer.
- **NestJS** — over-engineered for an 8-endpoint API; the DI container and module system pay off only in 20+ endpoint codebases.
- **Go + Gin** (ZoneForty5 default for higher-throughput APIs) — would force the Frontend Agent and Backend Agent into different language ecosystems for shared types. TypeScript end-to-end lets the Zod schemas inform both halves.

### 1.2 Frontend — React 18 + TypeScript + Vite + React Router 6

**Choice:** React 18.3, TypeScript 5.x, Vite 5 as the build tool, React Router 6 for routing, TanStack Query for server-state caching on the admin side, `react-helmet-async` for per-route meta tags, Tailwind CSS for styling.

**Justification:** React + TypeScript was specified in the brief. Vite is the build tool that pairs with this best in 2026 — sub-second HMR, native ESM output, first-class TS support without a separate `tsc` step. Tailwind is chosen over CSS-in-JS or component libraries because the brand calls for a custom dark "serious tech studio" aesthetic — utility classes give the Frontend Agent direct control over visual identity without fighting library defaults.

**SEO note:** A plain Vite SPA renders content client-side, which Google crawls but social-media unfurlers (LinkedIn, Twitter, Slack) do not. This site is the company's public face, so unfurled previews matter. Solution: use `vite-react-ssg` (or equivalent) to **pre-render** the public routes — landing, portfolio list, individual portfolio entries, blog list, individual posts, about — at build time. The admin panel ships as a normal CSR bundle behind `/admin`. (Approved by founder — see Q1.)

**Build/serve topology — important detail:** The frontend is **not** a runtime Docker service. The Vite SSG build is produced inside the Nginx image via a multi-stage `nginx.Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build                          # outputs /app/dist (pre-rendered HTML + JS/CSS)

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf       /etc/nginx/nginx.conf
COPY nginx/conf.d           /etc/nginx/conf.d
```

This keeps the runtime service count at five (nginx, api, postgres, redis, certbot — no separate frontend container) and means one image holds both the SPA assets and the reverse proxy. GitHub Actions builds this image once per deploy and ships it to GHCR.

**Alternatives considered and rejected:**
- **Next.js** — would solve SEO with SSR/ISR out of the box, but adds Node.js at the edge of the deployment topology (we'd run a Next server instead of static files behind Nginx). For a content site with infrequent updates, SSG via Vite is simpler to host and cheaper to run.
- **Vue 3 / SvelteKit** — out of scope; brief specified React.
- **Create React App** — deprecated as of 2023, no longer a viable choice.

### 1.3 Database — PostgreSQL 16

**Choice:** PostgreSQL 16, running as a container on the same EC2 host. Migrations managed via `node-pg-migrate` (chosen so the Database Agent can write SQL-first migrations rather than ORM-coupled ones).

**Justification:** The data model is fully relational — admin users, portfolio projects, blog posts, tags, post↔tag joins, contact submissions. Postgres 16 is the current major and gets security updates through November 2028. JSONB columns are available for the `tech_stack` array on portfolio entries and for `meta` on blog posts, keeping the schema flexible without sacrificing query power.

**Alternatives considered and rejected:**
- **MongoDB** — document model is a poor fit for joined data (post↔tag is the obvious case); offers no transactional advantage here.
- **SQLite** — fine for a static site behind a single process, but the admin panel writes concurrently with public reads, and we want point-in-time recovery on contact submissions. Not worth the operational simplicity trade.
- **MySQL** — viable alternative but ZoneForty5 standardises on Postgres; no project-specific reason to deviate.

### 1.4 Cache / Rate-Limit Store — Redis 7

**Choice:** Redis 7.x, container-local, used for three things: (a) rate-limiting buckets for `/api/contact` and `/api/auth/login`, (b) JWT refresh-token registry for forced logout, (c) short-lived response cache for `GET /api/portfolio` and `GET /api/posts` (60-second TTL) to absorb traffic spikes from social shares.

**Justification:** Redis is already in the ZoneForty5 default stack. The alternative — doing rate limiting in-process with a Map — breaks the moment we ever scale to two API containers, and the dev cost of wiring `ioredis` is one afternoon. Persistence is set to AOF every-second so we lose at most one second of state across a crash (acceptable; worst case is a revoked refresh token works for a few seconds longer).

**Alternatives considered and rejected:**
- **In-process rate limiting** — fragile under any horizontal scaling, no shared denylist.
- **Memcached** — no persistence, no Lua scripting; harder to express rate-limit semantics atomically.

### 1.5 Email — Resend (decided pre-architecture)

**Choice:** Resend, sending from `noreply@zoneforty5.tech`. Domain SPF/DKIM/DMARC records must be configured in DNS before launch (DevOps Agent owns this).

**Justification:** Decided by founder at project intake. Free tier (3,000 emails/month) is far above the realistic ceiling for a contact form on a low-traffic company site. The API is one HTTPS call — no SMTP daemon to operate.

**Alternatives considered and rejected:**
- **AWS SES** — cheaper at scale but requires sandbox-exit approval and is heavier to integrate; not justified at this volume.
- **SMTP relay (Postmark, Mailgun)** — equivalent ergonomics, no advantage over Resend at this scale.

### 1.6 Reverse Proxy / TLS — Nginx + Let's Encrypt (Certbot)

**Choice:** Nginx 1.27 (stable), TLS certificates from Let's Encrypt via Certbot, auto-renewed by a sidecar container. Nginx terminates TLS, serves the pre-rendered SPA from `/usr/share/nginx/html`, proxies `/api/*` to the Express container on the Docker network, and adds the standard hardening headers (HSTS, X-Content-Type-Options, Referrer-Policy, a strict CSP).

**Justification:** Nginx is the ZoneForty5 default and the right tool for the topology — one TLS endpoint, one static site, one upstream API. Let's Encrypt over AWS ACM avoids needing an Application Load Balancer (ACM certificates cannot be installed directly on an EC2 instance), which keeps us inside the single-EC2 budget envelope.

**Alternatives considered and rejected:**
- **Caddy** — automatic HTTPS is appealing but adds a non-default tool to the ZoneForty5 ops surface area for marginal benefit.
- **Traefik** — useful when there are many services to route; overkill for two upstreams.
- **AWS ALB + ACM** — adds ~$18/month and a managed dependency, no benefit at this scale.

### 1.7 Containerisation — Docker + Docker Compose v2

**Choice:** Docker 26.x with Compose v2 (`docker compose`, not `docker-compose`). A single `docker-compose.yml` at the repo root defines five services: `nginx`, `api`, `postgres`, `redis`, `certbot`.

**Justification:** Brief specifies "one `docker compose up` starts everything." Compose is the right abstraction at this scale. Kubernetes or ECS would be over-engineering — there is one host, and the operational model is "SSH in, `git pull`, `docker compose up -d --build`" (with the CI/CD pipeline doing this for us on every push to `main`).

### 1.8 CI/CD — GitHub Actions

**Choice:** GitHub Actions, two workflows. (a) `ci.yml` runs on every PR — TypeScript compile, unit tests, ESLint, Playwright smoke. (b) `deploy.yml` runs on push to `main` — builds Docker images, pushes to GitHub Container Registry (`ghcr.io/janak-dev2002/zone45-web`), SSHes into the EC2 host, pulls the new images, and runs `docker compose up -d`.

**Justification:** Repo is already on GitHub; Actions is included free for public repos and has 2,000 free minutes/month for private. GHCR avoids a separate Docker Hub account and inherits the repo's access controls.

**Alternatives considered and rejected:**
- **AWS CodeBuild + CodeDeploy** — heavier setup, no benefit when the runtime is one EC2 host.
- **Self-hosted runner on the EC2 itself** — possible, but conflates the build host with the production host. Not worth it.

### 1.9 Authentication — JWT (admin panel only)

**Choice:** Stateless access JWT (HS256, 15-minute TTL) delivered as an `httpOnly; Secure; SameSite=Strict` cookie named `zf45_at`. A refresh token (32-byte random, hashed in Redis with 7-day TTL) is delivered as a second `httpOnly` cookie named `zf45_rt`. Logout deletes both cookies and revokes the refresh token in Redis. There is no public registration route — the initial admin user is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` env vars on first boot.

**Justification:** httpOnly cookies are immune to XSS exfiltration; SameSite=Strict prevents CSRF on state-changing requests; short access-token TTL bounds the blast radius if a token leaks. Storing only hashed refresh tokens in Redis (not in Postgres) keeps the auth hot path off the relational DB and lets us revoke instantly. Argon2id (parameters: memory 64 MiB, iterations 3, parallelism 4) is used for the admin password hash.

**Alternatives considered and rejected:**
- **Session cookies in Redis** — equally valid; chose JWT only because the brief named it.
- **Auth0 / Clerk** — a paid dependency for a single-user admin panel; overkill.
- **Storing JWT in localStorage** — vulnerable to XSS; never acceptable for an admin token.

---

## 2. System Components

```
                     Internet (HTTPS :443)
                            │
                            ▼
                    ┌───────────────┐
                    │     Nginx     │  TLS termination, HSTS, CSP,
                    │  (container)  │  static SPA at /, /api/* proxy
                    └───┬───────┬───┘
       static SPA       │       │       /api/*
       (pre-rendered    │       │       (HTTP, internal network)
        HTML + JS/CSS)  │       ▼
                        │   ┌────────────────────────┐
                        │   │  Express API (Node 20) │
                        │   │  TypeScript, Zod,      │
                        │   │  Pino, JWT middleware  │
                        │   └────┬──────────┬────────┘
                        │        │          │
                        │        │          └──────────────┐
                        │        ▼                         ▼
                        │   ┌──────────┐            ┌────────────┐
                        │   │ Postgres │            │   Redis    │
                        │   │   16     │            │   7 (AOF)  │
                        │   └──────────┘            └────────────┘
                        │        ▲
                        │        │
                        │        │  pg_dump nightly
                        │        ▼
                        │   ┌──────────────────────┐
                        │   │  S3: zf45-backups    │  (lifecycle: 30d)
                        │   └──────────────────────┘
                        │
                        ▼
                Browser (React SPA, public + /admin)
                        │
                        ▼  POST /api/contact, admin CRUD
                        │
                        │  outbound HTTPS
                        ▼
                ┌────────────────┐
                │ Resend API     │  noreply@zoneforty5.tech
                │ (email)        │  → founder inbox
                └────────────────┘

                ┌──────────────────────────────┐
                │ Certbot (sidecar container)  │  renews LE certs,
                │                              │  reloads Nginx
                └──────────────────────────────┘
```

**Component responsibilities:**

- **Nginx** — terminates TLS, serves the pre-rendered static SPA from a Docker volume, reverse-proxies `/api/*` to the API container over the internal Docker network, applies HSTS / CSP / Referrer-Policy / X-Frame-Options headers, gzip-compresses responses, and serves `/sitemap.xml` and `/robots.txt` directly as static files. Logs requests in combined-with-timing format to a mounted volume so log rotation can run on the host.

- **Express API** — owns all HTTP endpoints under `/api/*`. Single process. Validates every request body with Zod schemas (the same schemas are exported to the frontend for type sharing via a small `shared-types` package inside the repo). Handles JWT issuance/verification, talks to Postgres via the `pg` pool (max 10 connections), talks to Redis via `ioredis`, calls Resend via `fetch`. Emits structured JSON logs via `pino` to stdout (Docker captures them).

- **PostgreSQL 16** — sole system of record. Data lives on a named Docker volume `pg_data` backed by EBS. Connection from the API container only — port 5432 is not exposed to the host. WAL archiving is not configured at MVP (open question Q9); nightly logical backups via `pg_dump` cover the recovery objective.

- **Redis 7** — three workloads: rate-limit token buckets (`ratelimit:contact:<ip>`, `ratelimit:login:<ip>`), JWT refresh-token registry (`rt:<token_hash>` → `user_id`, TTL 7 days), and a small response cache for the two hottest public endpoints. AOF persistence every second. Port 6379 not exposed to the host.

- **Certbot** — sidecar container running `certbot renew` twice daily. Shares the cert volume with Nginx and signals Nginx to reload on renewal via a `docker exec nginx nginx -s reload` triggered from a renewal hook (DevOps Agent picks the cleanest mechanism and documents it).

- **Browser SPA** — pre-rendered public routes load instantly with crawlable HTML and correct OG/Twitter meta tags via `react-helmet-async`. The `/admin/*` routes load lazily as a separate chunk; the chunk only loads if a valid `zf45_at` cookie exists or after successful login. Server state on the admin side is managed by TanStack Query with optimistic updates for the CRUD operations.

- **Resend** — outbound only. Used in exactly one place (contact form handler) to send a templated email to the founder containing the submission details. Failure to send is logged but does NOT cause the API to return 500 — the submission is already persisted, and a retry job will pick it up (open question Q5/Q2).

---

## 3. Data Flow

This site has three distinct data flows. There is no IoT edge layer.

### 3.1 Public read path (landing, portfolio, blog)

```
Visitor browser
   │  GET https://zoneforty5.tech/portfolio
   ▼
Nginx (TLS termination, gzip)
   │  serves pre-rendered HTML from /usr/share/nginx/html
   ▼
Browser hydrates React, mounts page
   │
   │  optional XHR for fresh data
   │  GET /api/portfolio
   ▼
Nginx → Express
   │
   │  HIT? return from Redis (TTL 60s)
   │  MISS? SELECT * FROM portfolio_projects WHERE published = true
   ▼          ORDER BY sort_order, created_at DESC
Postgres
   │
   ▼
Response (200, JSON) → cached in Redis → returned to browser
```

For SEO, the **pre-rendered HTML already contains the portfolio entries** as of the last deploy. The XHR is only there to refresh content for visitors who linger or revisit; if the build is recent, it returns the same data.

### 3.2 Contact form submission

```
Visitor fills form
   │  POST /api/contact  { name, email, subject, message, hp_field }
   ▼
Nginx → Express
   │
   │  1. Zod validates body
   │  2. Honeypot check (hp_field must be empty)
   │  3. Redis INCR ratelimit:contact:<ip>  (max 3 per 10 min)
   │  4. INSERT INTO contact_submissions (...) RETURNING id
   ▼
Postgres
   │
   ▼
Response (202 Accepted) returned to browser  ◀── visitor sees success
   │
   │  fire-and-forget (do not block response)
   ▼
Resend API: POST /emails
   │   from: noreply@zoneforty5.tech
   │   to:   <founder address from env>
   │   subject: "[ZF45 contact] " + submission.subject
   ▼
Resend → founder inbox
   │
   ▼
If Resend fails: log error, increment `email_send_failures` metric.
                 The row in contact_submissions still exists with status='pending_email'.
                 A small retry job (cron inside the API container, every 15 min)
                 picks up rows with status='pending_email' and retries up to 3 times.
```

### 3.3 Admin authenticated write (e.g., create blog post)

```
Admin browser (already logged in)
   │  POST /api/admin/posts  { title, body, ... }
   │  Cookies: zf45_at=<JWT>, zf45_rt=<refresh>
   ▼
Nginx → Express
   │
   │  1. authMiddleware: verify JWT signature + exp
   │     - if expired but refresh present: call refresh flow, set new cookies
   │     - if invalid: 401
   │  2. Zod validates body
   │  3. INSERT INTO blog_posts (...) RETURNING *
   │  4. DEL response cache key  posts:list
   ▼
Postgres + Redis
   │
   ▼
Response (201, JSON) → admin UI shows new post
```

The token refresh sub-flow:

```
JWT expired → middleware reads zf45_rt cookie → hash it → GET rt:<hash> in Redis
   │  hit → DEL rt:<hash>, mint new access + refresh, SET new rt key, set new cookies
   │  miss → 401, client redirects to /admin/login
```

---

## 4. API Contract Overview

The full specification (request/response shapes, error codes, examples) lives in `shared\api-contracts.md`, written by the Backend Agent before any frontend integration begins. This section enumerates the top-level resources and endpoints so other agents can plan against them.

**Base URL (prod):** `https://zoneforty5.tech/api`
**Base URL (dev):** `http://localhost:8080/api`
**Content type:** `application/json` for all bodies. `multipart/form-data` is NOT used — image upload is a two-step pre-signed PUT URL flow against Cloudflare R2 (see `api-contracts.md` §4.4).

### Resource map

| Resource | Public methods | Admin methods |
|---|---|---|
| `/auth` | `POST /login`, `POST /refresh`, `POST /logout` | `GET /me` |
| `/portfolio` | `GET /`, `GET /:slug` | `POST /`, `PUT /:id`, `DELETE /:id` (under `/admin/portfolio`) |
| `/posts` | `GET /`, `GET /:slug`, `GET /tags` | `POST /`, `PUT /:id`, `DELETE /:id` (under `/admin/posts`) |
| `/contact` | `POST /` | `GET /`, `GET /:id` (under `/admin/contact`) |
| `/health` | `GET /` (liveness, no auth) | — |

### Conventions

- All admin endpoints sit under `/api/admin/*` and require a valid JWT cookie.
- All list endpoints support `?page=<n>&pageSize=<n>` (default `pageSize=20`, max `100`).
- Error envelope: `{ "error": { "code": "STRING_CODE", "message": "human readable", "details"?: {...} } }`.
- Success envelope for lists: `{ "data": [...], "pagination": { "page", "pageSize", "total" } }`. Single resources: `{ "data": {...} }`.
- HTTP status codes used: 200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500.
- All timestamps are ISO 8601 UTC.

Full endpoint catalogue, schemas, and examples are documented in `api-contracts.md`.

---

## 5. Database Schema Overview

Full schema (column types, indexes, constraints, migration order) lives in `shared\db-schema.md`. Main entities and relationships summarised here.

### Entities

- **admin_users** — single-row in practice, but modelled as a table so we can add collaborators later without a migration. Holds `email` (unique), `password_hash` (Argon2id), `last_login_at`, audit timestamps.

- **portfolio_projects** — `slug` (unique), `title`, `description` (short), `body` (Markdown, long), `tech_stack` (JSONB string array), `outcome` (short text), `project_url` (nullable), `cover_image_url` (nullable), `sort_order` (int, for manual ordering on the grid), `published` (bool), audit timestamps.

- **blog_posts** — `slug` (unique), `title`, `excerpt`, `body` (Markdown), `cover_image_url` (nullable), `published` (bool), `published_at` (nullable; set when first published), audit timestamps. Many-to-many with `tags` via `post_tags`.

- **tags** — `slug` (unique), `name`, audit timestamps.

- **post_tags** — composite PK `(post_id, tag_id)`, both FK with `ON DELETE CASCADE`.

- **contact_submissions** — `name`, `email`, `subject`, `message`, `ip_address` (inet), `user_agent`, `status` (enum: `received`, `pending_email`, `emailed`, `email_failed`), `email_attempts` (int), `created_at`. No update path from public — append-only.

- **schema_migrations** — managed by `node-pg-migrate`, holds applied migration filenames.

### Relationships (textual ERD)

```
admin_users         (1) ─── (no FK; not joined to content at MVP)
portfolio_projects  (1) ─── (no FK to other content)
blog_posts          (1) ──< (M) post_tags (M) >── (1) tags
contact_submissions (1) ─── (no FK)
```

The decision to not link `blog_posts.author_id` to `admin_users.id` is deliberate at MVP — there is one author, and an author column would force a join on every list query for zero current benefit. Database Agent should leave a column comment noting this is intentional and reversible.

### Indexes (overview)

- `portfolio_projects (published, sort_order)` — covers the public list query.
- `portfolio_projects (slug)` — unique, covers slug lookups.
- `blog_posts (published, published_at DESC)` — covers the public list query.
- `blog_posts (slug)` — unique.
- `post_tags (tag_id, post_id)` — supports "posts by tag" query path.
- `contact_submissions (status, created_at)` — supports the retry-failed-emails background job.

---

## 6. Infrastructure Requirements

### 6.1 AWS EC2

- **Instance type:** `t3.small` (2 vCPU burstable, 2 GiB RAM, EBS-only).
- **AMI:** Ubuntu Server 24.04 LTS (Noble), x86_64.
- **Storage:** 30 GiB gp3 root volume (3,000 IOPS baseline, sufficient for Postgres on a low-write workload). One volume — Postgres data lives in a Docker named volume on the same EBS disk.
- **Elastic IP:** one EIP attached to the instance, pointed to by the `zoneforty5.tech` A record.
- **Region:** `ap-south-1` (Mumbai) — lowest latency to the founder's location (Sri Lanka, ~3,000 km vs. ~14,000 km for us-east-1) and to expected client geography.

The founder has an existing EC2 instance per the project card. **Open question Q8** asks whether to reuse it (and adjust sizing if needed) or provision a fresh one.

**Why t3.small and not t3.micro:** t3.micro has 1 GiB RAM, which is uncomfortably close to the working-set ceiling once Postgres (~256 MiB shared_buffers default), Redis (~64 MiB), Node (~120 MiB), and Nginx (~20 MiB) all run simultaneously. The first time `pg_dump` runs concurrently with an admin write, t3.micro will start swapping. t3.small at ~$15/month (on-demand, ap-south-1, May 2026 pricing) buys headroom that prevents a class of outages.

**Why not t3.medium:** doubling the cost for capacity we have no evidence we need. Plan to vertically scale to medium only if memory pressure shows up in monitoring (see scaling plan below).

### 6.2 Network topology

```
Internet
   │
   ▼
DNS  (Route 53 or Cloudflare — see Q4)
   A   zoneforty5.tech     → EIP
   A   www.zoneforty5.tech → EIP
   TXT _dmarc / SPF / DKIM (for Resend)
   │
   ▼
EC2 security group "zf45-web-sg"
   inbound:
     22/tcp  — restricted to founder's static IP (or use SSM Session Manager)
     80/tcp  — 0.0.0.0/0 (HTTP, redirects to 443)
     443/tcp — 0.0.0.0/0 (HTTPS)
   outbound:
     all (egress to Resend, GHCR, Let's Encrypt, S3)
   │
   ▼
EC2 instance (host network)
   │
   ▼
Docker bridge network "zf45-net" (internal)
   ├── nginx       (ports 80, 443 published to host)
   ├── api         (port 8080, NOT published; nginx talks to it via service DNS)
   ├── postgres    (port 5432, NOT published; only api can reach it)
   ├── redis       (port 6379, NOT published; only api can reach it)
   └── certbot     (no ports; shares cert volume with nginx)
```

### 6.3 Storage requirements

- **Root volume:** 30 GiB gp3.
  - OS + Docker images: ~6 GiB
  - Postgres data: starts < 100 MiB, projected < 2 GiB at one year
  - Nginx + API logs (rotated): cap at 2 GiB total via logrotate
  - Headroom for unexpected growth: ~20 GiB
- **S3 bucket `zf45-backups`:** lifecycle rule — transition to Glacier IR after 30 days, expire after 365 days. Projected size: ~50 MiB/day worst case for the first year; well under $1/month.
- **Cloudflare R2 bucket `zf45-uploads`:** stores admin-uploaded cover images for portfolio entries and blog posts. R2 chosen over S3 because R2 has **zero egress fees** — every image view from the public site would otherwise be a charged S3 GET. Free tier is generous (10 GiB storage, 1M writes/mo, 10M reads/mo) and covers expected usage by 100×. Bucket served via custom domain `cdn.zoneforty5.tech` (CNAME to R2 public endpoint) for clean, stable image URLs.

### 6.4 Scaling plan

The site is sized for very low traffic (company website + occasional blog readership). The scaling sequence — **only act on a real signal, not a hypothetical**:

1. **Vertical first:** if CPU steal time on the t3 burst credits drops to zero for sustained periods, or if `free -m` shows < 200 MiB available repeatedly, move to `t3.medium` (one-line change to instance type, ~10 min downtime).
2. **Externalise Postgres next:** if the DB grows past ~10 GiB or write contention appears, move it to AWS RDS for managed backups and PITR. Connection-string-only change for the API.
3. **Split API to two containers:** only if API CPU is sustained > 50% during business hours. Add a second `api` service in Compose, Nginx round-robins. Redis already supports this (rate-limit and refresh-token state is in Redis, not in-process).
4. **CDN in front of Nginx:** if global traffic increases, put CloudFront in front for static assets. The pre-rendered HTML cache-control headers must be set correctly first.
5. **Multi-AZ:** out of scope at MVP. Documented as a known risk (see §8.1).

---

## 7. Third-Party Dependencies

| Service | Why used | Alternatives considered | Cost implication |
|---|---|---|---|
| **Resend** | Transactional email for contact form notifications. Decided pre-architecture. | AWS SES (cheaper at scale, heavier setup, sandbox approval needed). Postmark/Mailgun (equivalent ergonomics, no advantage). | Free tier 3,000 emails/month — far above realistic ceiling. $0/month expected. |
| **AWS EC2** | Compute host. Founder has existing AWS account. | DigitalOcean/Hetzner (cheaper for equivalent specs, but breaks "single cloud" simplicity for the founder). Fly.io (different deployment model, harder to reuse for future client work). | ~$15/month on-demand t3.small + ~$3/month gp3 30 GiB + ~$0.50/month EIP-in-use. **~$18–20/month total.** |
| **AWS S3** | pg_dump archive destination. | Backblaze B2 (cheaper egress, extra credential surface). Local EBS snapshots (no off-host backup). | < $0.50/month with the 365-day lifecycle policy. |
| **Cloudflare R2** | Admin-uploaded image hosting (portfolio/blog cover images). Pre-signed PUT URL flow. | AWS S3 (charges egress on every image view — not viable for public images). Cloudinary (paid above small free tier). Repo-committed images (rejected friction). | Free tier covers expected usage by 100×. $0/month expected. |
| **Cloudflare** (DNS + Email Routing + Turnstile) | DNS for `zoneforty5.tech`, free email forwarding `hello@zoneforty5.tech → founder Gmail`, bot deterrence on contact + login forms. | Route 53 + Google Workspace ($6/mo) + hCaptcha — three vendors instead of one. | All free at this scale. $0/month. |
| **Let's Encrypt** | TLS certificates. | AWS ACM (requires ALB, +$18/month). Paid CAs (no benefit). | Free. |
| **GitHub** (Actions + GHCR) | Source hosting, CI/CD, container registry. Repo already created. | GitLab, Bitbucket. | Free for the listed repo; 2,000 Actions minutes/month free for private. Estimated usage: < 200 min/month. |

**Cost summary (steady state):** approximately **USD 19/month**, dominated by EC2. The figure assumes ap-south-1 on-demand pricing as of May 2026; a 1-year reserved t3.small reduces this by ~30%.

---

## 8. Known Risks and Mitigations

### 8.1 Single EC2 instance = single point of failure (HIGH severity / MEDIUM likelihood)

**Description:** All five services run on one EC2 instance. AZ outage, EBS volume failure, or a corrupted Postgres state means total downtime until manual recovery.

**Likelihood:** MEDIUM. ap-south-1 has had two reported regional incidents in the last 18 months; AZ-level events are more frequent. For a company brochure site, MTTR matters more than uptime — but a complete data loss is unacceptable.

**Impact:** HIGH on data loss (contact submissions irrecoverable). MEDIUM on availability (site down a few hours, not catastrophic for a brochure site).

**Mitigation:**
1. Nightly `pg_dump` to S3 (DevOps Agent owns this — Bash script in a cron container, gzipped, encrypted with KMS-or-passphrase, retained 30 days).
2. Weekly EBS snapshot (AWS native, retain 4).
3. Documented restore runbook in `docs/runbooks/restore-from-backup.md` (Docs Agent owns).
4. Multi-AZ is explicitly out of scope at MVP; revisit if traffic justifies (see §6.4 step 5).

### 8.2 Contact form abuse (HIGH severity / HIGH likelihood)

**Description:** Public POST endpoint with email side-effect is a magnet for spam, scraping, and abuse-of-email attempts (Resend domain reputation damage, hitting the 3k/month free tier, founder inbox flooded).

**Likelihood:** HIGH. Any form that emails a human gets hit within hours of indexing.

**Impact:** HIGH (reputational — Resend may throttle our sending domain).

**Mitigation:**
1. Redis-backed rate limit: 3 submissions per IP per 10-minute window, 20 per IP per day.
2. Honeypot field (`hp_field`, must be empty, hidden via CSS — bots fill it).
3. Server-side input length caps (name ≤ 100, subject ≤ 200, message ≤ 5,000 chars).
4. **Recommended:** add Cloudflare Turnstile on the form. Flagged as **open question Q3** because it changes the frontend.
5. Reject submissions where the `email` field domain has no MX record (cheap DNS lookup, prevents typo'd domains and many bots).

### 8.3 JWT secret leak (HIGH severity / LOW likelihood)

**Description:** If `JWT_SECRET` leaks (env file checked into git, dev sharing a `.env` over Slack, GitHub Actions log exposure), an attacker can mint admin tokens.

**Likelihood:** LOW with discipline, HIGH if discipline lapses.

**Impact:** HIGH — full admin compromise.

**Mitigation:**
1. `.env*` in `.gitignore`; secrets only in GitHub Actions secrets and the EC2 host's `.env.production`.
2. Secret-scanning enabled on the GitHub repo (free, on by default for public repos).
3. Documented rotation procedure: change `JWT_SECRET`, rolling-restart API, all current sessions become invalid (acceptable — one admin user re-logs in).
4. Short access token TTL (15 min) means a leaked access token has bounded blast radius.

### 8.4 Deploy downtime via docker compose up (MEDIUM severity / HIGH likelihood)

**Description:** `docker compose up -d --build` will recreate the `api` and `nginx` containers, causing 5–20 seconds of 502/connection-refused for any in-flight request.

**Likelihood:** HIGH (every deploy).

**Impact:** LOW for a brochure site, MEDIUM for the admin's editing flow (they might lose an unsaved draft).

**Mitigation:**
1. Frontend implements localStorage drafts on the blog/portfolio editor so the admin never loses unsaved work.
2. Deploy via GitHub Actions runs during low-traffic window (overnight in client TZ) by default; manual deploys allowed any time.
3. Document the trade-off in the runbook; do not over-engineer with blue-green at this scale.
4. If this becomes painful: add a second `api` replica + Nginx upstream with `max_fails=1` and the new image rolled one container at a time. Revisit only if real pain emerges.

### 8.5 Pre-rendering build complexity for blog posts (MEDIUM severity / MEDIUM likelihood)

**Description:** Pre-rendering blog posts at build time means the SPA needs to know all post slugs at build, which requires either (a) the build to hit the API, or (b) a build-time data fetch from a static export. New posts require a redeploy to be SEO-indexed.

**Likelihood:** MEDIUM — every new blog post.

**Impact:** MEDIUM — slow SEO indexing of fresh content.

**Mitigation:**
1. The admin "publish" action triggers a GitHub Actions workflow via `repository_dispatch` (Backend Agent owns the dispatch call). The workflow rebuilds + redeploys the frontend. End-to-end ~3 minutes from publish to live.
2. Alternative: switch to runtime SSR (Next.js migration). Documented as **open question Q1**.
3. The blog index page is XHR-driven post-hydration so logged-in viewers and direct visits see fresh content even without a redeploy; only the bot-visible HTML is stale.

### 8.6 Resend free-tier ceiling (LOW severity / LOW likelihood)

**Description:** 3,000 emails/month is the Resend free cap. Spam wave plus failed-retry storm could exhaust it.

**Likelihood:** LOW given the rate-limit mitigations in 8.2.

**Impact:** LOW — contact submissions still persist; only the notification fails.

**Mitigation:**
1. Cap email attempts per submission at 3 (already in the schema as `email_attempts`).
2. Daily metric: email send count. Alert via log when approaching 80% of monthly cap.

---

## 9. Open Questions — RESOLVED

All 10 questions were answered by the founder on 2026-05-25. Decisions are recorded below and in `change-log.md` (2026-05-25 entry).

| # | Question | Decision | Notes |
|---|---|---|---|
| Q1 | Frontend rendering | **Vite + SSG** | Pre-render public routes via `vite-react-ssg`; admin stays CSR. |
| Q2 | Contact form recipient | **`hello@zoneforty5.tech` → forwarded to founder's Gmail** | Forwarding via Cloudflare Email Routing (free). |
| Q3 | Cloudflare Turnstile on contact + login | **Yes** | Site key per env. `turnstileToken` field is required on `POST /contact` and `POST /auth/login`. |
| Q4 | DNS provider | **Cloudflare** | DNS + Turnstile + Email Routing all in one dashboard. |
| Q5 | Image hosting | **Cloudflare R2 + pre-signed PUT URLs** ("b-lite") | One endpoint `POST /api/admin/uploads/sign`. Bucket `zf45-uploads`. Public via `cdn.zoneforty5.tech`. Zero egress cost. |
| Q6 | Blog body format | **Markdown** | `react-markdown` + `rehype-highlight`. Textarea with live preview in admin editor. |
| Q7 | Admin bootstrap | **Env-driven seed on first boot** | `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` + optional `ADMIN_NAME`. Idempotent. |
| Q8 | EC2 | **Provision fresh** | `t3.small`, Ubuntu 24.04, `ap-south-1`, 30 GiB gp3, EIP attached. |
| Q9 | Backup strategy | **`pg_dump` nightly only at MVP** | RPO 24h. Encrypted, gzipped, to S3 `zf45-backups`, 30-day retention. |
| Q10 | `www` redirect | **`www.zoneforty5.tech` → apex** | 301 redirect in Nginx. |

The list of accounts/credentials needed before agents can finish is recorded in `shared/agent-handoffs/architecture-done.md` (Prerequisites table).

---

## Appendix A — Out of Scope (explicit)

To prevent scope creep, the following are explicitly **not** included at MVP and are documented here so future agents do not attempt them:

- Public user accounts, registration, or login
- Blog comments (third-party or native)
- Analytics integrations (GA4, Plausible, etc.)
- Multi-language / i18n
- Search (full-text or otherwise) — < 50 entries, browsers' Ctrl-F is fine
- RSS / Atom feed (recommended add post-MVP — flag in change-log if requested)
- Newsletter signup
- Multi-author support
- Image editing / cropping in the admin
- Multi-AZ failover
- Staging environment (single prod env at MVP; PR previews could be added later)

---

## Appendix B — Repository Layout (proposed)

This is a recommendation for the orchestrator and PM Agent — final layout is determined by the scaffolding the agents produce.

```
zf45-website/
├── backend/                     # Express API
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── db/                  # migrations live here
│   │   └── lib/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── admin/
│   │   └── lib/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── shared-types/                # Zod schemas shared by both
│   └── package.json
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
├── docker/
│   ├── api.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml       # overrides for local dev
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   └── runbooks/
└── shared/                      # agent communication directory (already exists)
```

---

*End of architecture.md — awaiting founder approval to unlock Phase 2 (Database Agent).*

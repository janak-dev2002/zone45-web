# ZoneForty5 — Tasks
> Last updated: 2026-05-28

## Sprint Goal
Deliver the fully functional ZoneForty5 agency website MVP, complete with public SSG pages, secure admin panel, and robust deployment pipeline, by June 1, 2026.

## [DATABASE] — Completed
- [x] Initialize `node-pg-migrate` skeleton.
- [x] Write migrations for `admin_users`, `portfolio_projects`, `blog_posts`, `tags`, `post_tags`, `contact_submissions`.
- [x] Document full schema in `shared/db-schema.md`. (Migrations written to database/migrations/)

## [BACKEND] — Completed
- [x] Scaffold project: Node 20, Express, TS, Zod, Pino.
- [x] Write `shared/api-contracts.md` (schemas & endpoints).
- [x] Setup `backend/Dockerfile` (multi-stage: dev + production targets).
- [x] Implement all 23 API endpoints (Auth, Portfolio, Posts, Contact, Uploads).
- [x] JWT auth: httpOnly cookie issuance, silent-refresh middleware, logout, forced-logout via Redis.
- [x] Rate limiting on POST /api/contact and POST /api/auth/login via Redis.
- [x] Resend integration for contact form notification email (fire-and-forget + 15min cron retry).
- [x] Cloudflare Turnstile verification on POST /contact and POST /auth/login.
- [x] Pino structured JSON logging on all requests and errors.
- [x] Zod schemas for all request bodies (exported via shared-types package).
- [x] Unit tests (51 passing, 8 suites).
- [x] Handoff written: `shared/agent-handoffs/backend-done.md`

## [FRONTEND] — Completed
- [x] Scaffold project: React 18, Vite, TS, Tailwind, React Router.
- [x] Build public static UI components (Dark mode aesthetics — matched design handoff exactly).
- [x] Build Admin panel auth flows and CRUD UI.
- [x] Setup `vite-react-ssg` pre-rendering logic (5 public routes pre-rendered at build time).
- [x] Integrate API with frontend (all 23 endpoints wired via typed service layer).
- [x] react-helmet-async meta tags on all public pages.
- [x] sitemap.xml generated at build time, robots.txt static.
- [x] Handoff written: `shared/agent-handoffs/frontend-done.md`

## [DEVOPS] — Completed
- [x] Configure Cloudflare (DNS, Email Routing, Turnstile). (documented in devops/cloudflare/README.md — manual steps for founder)
- [x] Provision AWS S3 (backups) and Cloudflare R2 (uploads). (documented in devops/aws/README.md — manual steps for founder)
- [x] Write Nginx config and multi-stage `nginx.Dockerfile`. (devops/nginx.Dockerfile, devops/nginx/nginx.conf, devops/nginx/conf.d/default.conf)
- [x] Setup root `docker-compose.yml`. (devops/docker-compose.yml + devops/docker-compose.dev.yml)
- [x] Build CI/CD pipelines (GitHub Actions). (.github/workflows/ci.yml + deploy.yml)
- [ ] Provision EC2 `t3.small` and run initial deploy (blocked by: functional codebase — Backend + Frontend agents must deliver first)

## [QA] — Pending
- [ ] Write E2E Playwright smoke tests (blocked by: deployed application)

## BLOCKED
- Frontend integration (waiting for frontend scaffold — backend API is ready)
- Deployment (waiting for Frontend Agent)

## COMPLETED
- [x] Produce system architecture (owner: ARCHITECTURE)
- [x] All DevOps infrastructure files (owner: DEVOPS) — PR #2 open, awaiting merge
- [x] All Backend API (owner: BACKEND) — PR raised

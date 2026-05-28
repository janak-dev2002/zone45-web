# ZoneForty5 — Tasks
> Last updated: 2026-05-27

## Sprint Goal
Deliver the fully functional ZoneForty5 agency website MVP, complete with public SSG pages, secure admin panel, and robust deployment pipeline, by June 1, 2026.

## [DATABASE] — Completed
- [x] Initialize `node-pg-migrate` skeleton.
- [x] Write migrations for `admin_users`, `portfolio_projects`, `blog_posts`, `tags`, `post_tags`, `contact_submissions`.
- [x] Document full schema in `shared/db-schema.md`. (Migrations written to database/migrations/)

## [BACKEND] — Pending
- [ ] Scaffold project: Node 20, Express, TS, Zod, Pino.
- [ ] Write `shared/api-contracts.md` (schemas & endpoints).
- [ ] Setup `api.Dockerfile` and `docker-compose.dev.yml`.
- [ ] Implement API endpoints (Auth, Portfolio, Posts, Contact, Uploads) (blocked by: database schema)

## [FRONTEND] — Pending
- [ ] Scaffold project: React 18, Vite, TS, Tailwind, React Router.
- [ ] Build public static UI components (Dark mode aesthetics).
- [ ] Build Admin panel auth flows and CRUD UI.
- [ ] Setup `vite-react-ssg` pre-rendering logic.
- [ ] Integrate API with frontend (blocked by: backend api-contracts.md)

## [DEVOPS] — Pending
- [ ] Configure Cloudflare (DNS, Email Routing, Turnstile).
- [ ] Provision AWS S3 (backups) and Cloudflare R2 (uploads).
- [ ] Write Nginx config and multi-stage `nginx.Dockerfile`.
- [ ] Setup root `docker-compose.yml`.
- [ ] Build CI/CD pipelines (GitHub Actions).
- [ ] Provision EC2 `t3.small` and run initial deploy (blocked by: functional codebase)

## [QA] — Pending
- [ ] Write E2E Playwright smoke tests (blocked by: deployed application)

## BLOCKED
- Backend logic (waiting for database schema)
- Frontend integration (waiting for api-contracts.md)
- Deployment (waiting for codebase completion)

## COMPLETED
- [x] Produce system architecture (owner: ARCHITECTURE)

# ZoneForty5 — Tasks
> Last updated: 2026-06-02

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
- [x] Provision EC2 `t3.small` and run initial deploy. (Deploy run #10 — Success 2026-06-02. All 5 containers healthy: postgres, redis, api, nginx, certbot.)

## [QA] — Completed (Round 3)
- [x] E2E full re-test pass — 2026-06-02
- [x] BUG-005 verification (Form corruption) — Verified resolved (Contact, Portfolio, Posts)
- [x] Re-run full suite — 11/15 passed. (Blocked: Turnstile; Unresolved: Hydration)
- [ ] FIX-005 (Hydration mismatches) — RE-OPENED (Errors #418, #423, #425 persist)

## [FRONTEND] — Bug Fix Complete
- [x] BUG-001: Fix SSG build — `static-loader-data-manifest-undefined.json` has `undefined` in filename.
      Root cause: production CSP (script-src 'self') blocks the vite-react-ssg inline <script> that
      sets window.__VITE_REACT_SSG_HASH__. Added ssgOptions.onFinished hook in vite.config.ts that
      moves the assignment into dist/assets/ssg-init-{hash}.js — a same-origin file CSP 'self' allows.
- [x] PR raised: #15 — https://github.com/janak-dev2002/zone45-web/pull/15
      Branch: frontend/fix-ssg-manifest → main

## [DEVOPS] — Bug Fix Required
- [x] BUG-001 (Nginx): Add `.json` 404 exception in `default.conf` — `try_files` must NOT fall back to `index.html` for `.json` requests.
      Add: `location ~* \.json$ { try_files $uri =404; }` before the SPA catch-all.
- [x] BUG-003 (CSP): Update `Content-Security-Policy` header in `default.conf`:
      - Add `data:` to `font-src` (self-hosted woff2 fonts load via data URIs)
      - Evaluate if Turnstile needs `unsafe-inline` in `script-src`; if yes, add with nonce or hash approach
      - Decision: added `'unsafe-inline'` (nonce not viable with static SSG); trade-off documented in config comment
- [x] Raise PR on branch `devops/fix-nginx-json-csp` — PR #14: https://github.com/janak-dev2002/zone45-web/pull/14
- [x] After both PRs merged, confirm deploy pipeline green and smoke-test `/` — Verified resolved 2026-06-02

## [FRONTEND] — Minor Follow-up Complete
- [x] FIX-005: Resolve React hydration mismatches (errors #418, #423, #425).
      Root cause: useMediaQuery initialised useState from window.matchMedia() on the first browser
      render. On mobile this produced true (<MNav/>), while SSG always produced false (<Nav/>).
      Fix: useState(false) always; useEffect updates after hydration. No more console errors.
- [x] FIX-006: Add `name` attribute to all contact form and admin login form inputs.
      Contact: name/email/subject/message/gdpr. Login: email/password.
- [x] PR raised: #16 — https://github.com/janak-dev2002/zone45-web/pull/16
      Branch: frontend/fix-hydration-forms → main

## [FRONTEND] — Bug Fix Complete (BUG-005)
- [x] BUG-005: Fix form state corruption in three files.
      Root cause: `'checked' in e.target` returns true for ALL HTMLInputElement types.
      Fixed with `e.target.type === 'checkbox'` in Contact.tsx, PortfolioForm.tsx, PostForm.tsx.
      Note: PostForm.tsx had the same bug — not listed by QA but found via grep and fixed too.
- [x] PR raised: #18 — https://github.com/janak-dev2002/zone45-web/pull/18
      Branch: frontend/fix-bug005-form-handlers → main

## [FRONTEND] — Post-Launch Polish (non-blocking for users)
- [ ] FIX-005 RE-OPENED: Hydration mismatches #418/#423/#425 still present after PR #16.
      PR #16 fixed the useMediaQuery/nav case but other SSR/CSR discrepancies remain in public pages.
      Do a full audit of all public page components for window-dependent logic, Math.random(),
      date/time calls, or conditional rendering that differs between SSG and browser render.
- [ ] Raise PR on branch: frontend/fix-hydration-full

## [DEVOPS] — Post-Launch (QA infrastructure only)
- [ ] Set up staging environment with Cloudflare Turnstile test keys so automated E2E
      can test form submissions without headless bot detection blocking them.
      Cloudflare always-pass test keys (official, for dev/staging only — never production):
        Site key: 1x00000000000000000000AA
        Secret:   1x0000000000000000000000000000000AA

## BLOCKED
- (none — Turnstile blocking headless QA on production is expected behaviour, not a bug)

## COMPLETED
- [x] Produce system architecture (owner: ARCHITECTURE)
- [x] Database schema + migrations (owner: DATABASE)
- [x] Full backend API — 23 endpoints (owner: BACKEND)
- [x] Frontend — SSG public site + admin panel (owner: FRONTEND)
- [x] Full DevOps infrastructure + EC2 deploy (owner: DEVOPS) — deploy pipeline green 2026-06-02

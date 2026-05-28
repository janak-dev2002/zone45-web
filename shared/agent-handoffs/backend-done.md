# Backend Agent — Done (Handoff)

> Agent: Backend (Claude Sonnet 4.6)
> Branch: `backend-agent-branch`
> Completed: 2026-05-28
> Status: **COMPLETE — PR raised to main**

---

## Summary

All [BACKEND] tasks are complete. The repository now contains a fully working
Express 4 + TypeScript 5 API with 23 endpoints covering auth, portfolio, posts,
contact form, and image upload signing. JWT authentication uses httpOnly cookies
with silent refresh. Redis backs rate limiting and the refresh-token registry.
Resend delivers contact-form notifications asynchronously with a 15-min cron
retry loop.

---

## Endpoints Implemented

All 23 endpoints from `shared/api-contracts.md` are implemented. Quick reference:

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/health` | — | liveness + db/redis checks |
| GET | `/api/portfolio` | — | paginated, Redis cached 60s |
| GET | `/api/portfolio/:slug` | — | public published only |
| GET | `/api/posts` | — | paginated, tag filter, Redis cached 60s |
| GET | `/api/posts/:slug` | — | public published only |
| GET | `/api/posts/tags` | — | Redis cached 300s |
| POST | `/api/contact` | — | rate-limited, Turnstile verified, async email |
| POST | `/api/auth/login` | — | rate-limited, Turnstile verified, sets cookies |
| POST | `/api/auth/refresh` | rt cookie | rotates tokens |
| POST | `/api/auth/logout` | at cookie | revokes refresh token |
| GET | `/api/auth/me` | at cookie | current user info |
| GET | `/api/admin/portfolio` | at cookie | all (including drafts) |
| GET | `/api/admin/portfolio/:id` | at cookie | by UUID |
| POST | `/api/admin/portfolio` | at cookie | invalidates cache |
| PUT | `/api/admin/portfolio/:id` | at cookie | invalidates cache |
| DELETE | `/api/admin/portfolio/:id` | at cookie | hard delete |
| GET | `/api/admin/posts` | at cookie | drafts + published, ?status= filter |
| GET | `/api/admin/posts/:id` | at cookie | by UUID |
| POST | `/api/admin/posts` | at cookie | dispatches rebuild on publish |
| PUT | `/api/admin/posts/:id` | at cookie | sets publishedAt on first publish |
| DELETE | `/api/admin/posts/:id` | at cookie | cascades post_tags |
| GET | `/api/admin/contact` | at cookie | newest first, ?status= filter |
| GET | `/api/admin/contact/:id` | at cookie | full message |
| POST | `/api/admin/uploads/sign` | at cookie | R2 pre-signed PUT URL |

---

## Files Written

```
backend/
├── src/
│   ├── app.ts                    — Express app factory
│   ├── server.ts                 — Entry point, seed + cron startup
│   ├── lib/
│   │   ├── env.ts                — Zod-validated env config
│   │   ├── logger.ts             — Pino singleton
│   │   ├── redis.ts              — ioredis singleton
│   │   ├── jwt.ts                — sign/verify/refresh token helpers
│   │   ├── schemas.ts            — All Zod request schemas
│   │   └── cookies.ts            — httpOnly cookie option factory
│   ├── db/
│   │   ├── pool.ts               — pg Pool singleton
│   │   └── seed.ts               — Admin user seed (idempotent, first-boot)
│   ├── middleware/
│   │   ├── auth.ts               — JWT verify + silent refresh middleware
│   │   ├── rateLimit.ts          — Redis rate-limit middleware
│   │   ├── requestId.ts          — X-Request-Id middleware
│   │   ├── csrfOrigin.ts         — Origin header CSRF check
│   │   └── errorHandler.ts       — Global error handler
│   ├── routes/
│   │   ├── health.ts
│   │   ├── portfolio.ts
│   │   ├── posts.ts
│   │   ├── contact.ts
│   │   ├── auth.ts
│   │   └── admin/
│   │       ├── portfolio.ts
│   │       ├── posts.ts
│   │       ├── contact.ts
│   │       └── uploads.ts
│   ├── services/
│   │   ├── email.ts              — Resend API + fire-and-forget helper
│   │   ├── turnstile.ts          — Cloudflare Turnstile verification
│   │   └── r2.ts                 — R2 pre-signed PUT URL generation
│   └── jobs/
│       └── emailRetry.ts         — node-cron every 15min retry job
├── __tests__/
│   ├── setup.ts                  — Jest env var setup
│   ├── schemas.test.ts
│   ├── jwt.test.ts
│   ├── env.test.ts
│   ├── cookies.test.ts
│   ├── errorHandler.test.ts
│   ├── health.test.ts
│   ├── rateLimit.test.ts
│   └── emailRetry.test.ts
├── Dockerfile                    — Multi-stage: production + development targets
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .eslintrc.js
└── .env.example

shared-types/
├── src/index.ts                  — Re-exports all Zod schemas + inferred TS types
├── package.json
└── tsconfig.json
```

---

## Environment Variables Required

All documented in `backend/.env.example` and `devops/.env.example`. Mandatory:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | HS256 signing key (>=32 chars, `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Refresh token signing key (different from JWT_SECRET) |
| `JWT_ACCESS_TTL` | Access token TTL (default `15m`) |
| `JWT_REFRESH_TTL` | Refresh token TTL (default `7d`) |
| `ADMIN_EMAIL` | Seed admin email (first boot only) |
| `ADMIN_NAME` | Seed admin display name |
| `ADMIN_PASSWORD_HASH` | Argon2id encoded hash of admin password |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender address (`noreply@zoneforty5.tech`) |
| `EMAIL_TO` | Recipient address (`hello@zoneforty5.tech`) |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key |
| `R2_BUCKET` | R2 bucket name (`zf45-uploads`) |
| `R2_PUBLIC_BASE` | Public CDN base URL (`https://cdn.zoneforty5.tech`) |
| `R2_ENDPOINT` | R2 S3-compatible endpoint |
| `CORS_ORIGIN` | Optional: CORS allowed origin (dev: `http://localhost:5173`) |
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope (for post-publish rebuild dispatch) |
| `GITHUB_REPO` | Repo slug for dispatch (default: `janak-dev2002/zf45-website`) |

---

## Redis Key Patterns Used

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `ratelimit:login:<ip>` | Login rate limit bucket | 10 min |
| `ratelimit:refresh:<ip>` | Refresh rate limit bucket | 10 min |
| `ratelimit:global:<ip>` | Global DDOS guard | 1 min |
| `ratelimit:contact:<ip>:10m` | Contact 3/10min limit | 10 min |
| `ratelimit:contact:<ip>:1d` | Contact 20/day limit | 1 day |
| `rt:<sha256(token)>` | Refresh token registry -> user UUID | 7 days |
| `cache:portfolio:list:p<n>:s<n>` | Portfolio list response cache | 60 s |
| `cache:posts:list:t<tag>:p<n>:s<n>` | Posts list response cache | 60 s |
| `cache:posts:tags` | Tags list response cache | 300 s |

---

## shared-types Package Location

`shared-types/src/index.ts` (monorepo-local, not published to npm).

Frontend Agent consumption:
```typescript
import type { PortfolioItem, PostDetail, LoginBody } from '@zf45/shared-types';
import { portfolioBodySchema } from '@zf45/shared-types';
```

Configure `paths` in `tsconfig.json` or `moduleNameMapper` in Vite/Jest to resolve
`@zf45/shared-types` to `../shared-types/src/index.ts`.

---

## What Frontend Agent Must Know

1. **Cookies are httpOnly** — SPA cannot read them. Use `GET /api/auth/me`
   to determine login state; treat `401` as "not logged in", no error toast.

2. **Silent refresh is server-side** — auth middleware transparently refreshes
   tokens when the access token expires but a valid refresh token exists.

3. **Contact form expects `202 Accepted`** on success (not `200 OK`).

4. **Admin mutations**: DELETE returns `204 No Content`, POST returns `201 Created`.

5. **On `429 RATE_LIMITED`**: show the `Retry-After` header value to the user.
   Do not auto-retry.

6. **Post-publish rebuilds** are triggered server-side automatically on first
   `false -> true` publish transition. Frontend does not need to trigger this.

7. **Image uploads** are two-step (see api-contracts.md §4.4):
   `POST /api/admin/uploads/sign` then `PUT uploadUrl` directly to R2.

8. **Turnstile site key** is `VITE_TURNSTILE_SITE_KEY`. Required as `turnstileToken`
   in `POST /contact` and `POST /auth/login`.

9. **API base URL** local dev: `http://localhost:8080/api`.

10. **Zod schemas** for all request bodies are in `shared-types`. Use them for
    frontend form validation — single source of truth.

---

## Open Questions / Risks for Founder Review

1. **`ADMIN_PASSWORD_HASH`** must be a valid Argon2id encoded string (starts
   with `$argon2id$`). Generate with:
   ```bash
   node -e "import('argon2').then(a=>a.default.hash('YourPass',{type:2,memoryCost:65536,timeCost:3,parallelism:4}).then(console.log))"
   ```

2. **`GITHUB_TOKEN`** for post-publish rebuilds: if unset, dispatch is skipped
   with a warning log.

3. **Database migrations** must run before the API first starts. Run from the
   `database/` directory with `npm run migrate up`.

4. **Cloudflare Turnstile test secret** (`1x0000000000000000000000000000000AA`)
   always passes — safe for local dev and CI. Replace with the real secret in
   production.

---

*End of backend-done handoff. Backend Agent session complete.*

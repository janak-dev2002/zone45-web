# API Contracts — ZoneForty5 Website

> STATUS: DRAFT (architecture skeleton). Backend Agent owns the final word on this file.
> Author of this draft: Architecture Agent (Claude Opus 4.7), 2026-05-25
> Backend Agent MUST fill in any TBD, may tighten validation rules, but must NOT remove or rename endpoints without updating `architecture.md` and `change-log.md` first.

This file is the contract between the Backend Agent and every consumer (Frontend Agent, QA Agent, DevOps Agent for healthcheck wiring). Frontend integration may not begin until this file is marked READY at the top.

---

## 1. Global Conventions

### 1.1 Base URLs

| Environment | Base URL |
|---|---|
| Production | `https://zoneforty5.tech/api` |
| Local development | `http://localhost:8080/api` |

All paths in this document are **relative to the base URL** (e.g. `GET /portfolio` means `GET https://zoneforty5.tech/api/portfolio`).

### 1.2 Content type

- Request: `application/json; charset=utf-8`. Anything else returns `415 Unsupported Media Type`.
- Response: `application/json; charset=utf-8`, except `204 No Content` (empty body) and `GET /health` (also JSON).
- `multipart/form-data` is **not** used. Image upload is a two-step flow against Cloudflare R2 (§4.4): the API mints a pre-signed PUT URL, the browser uploads the file directly to R2, then the API stores only the resulting public URL.

### 1.3 Authentication

- Public endpoints: no auth header required.
- Admin endpoints (every path under `/admin/*`): require the `zf45_at` httpOnly cookie set by `POST /auth/login`. The middleware verifies the JWT signature and expiry on every request.
- A missing or invalid `zf45_at` returns `401 UNAUTHENTICATED`.
- A valid `zf45_at` for a user who no longer exists returns `401 SESSION_INVALID`.
- The `zf45_rt` cookie is used only by `POST /auth/refresh`; it never authorises a non-refresh request.
- CSRF protection: SameSite=Strict cookies + an `Origin` header check on every mutating request (`POST`/`PUT`/`DELETE`). Cross-origin mutating requests return `403 BAD_ORIGIN`.

### 1.4 Response envelopes

**Success — single resource:**
```json
{
  "data": { "...": "..." }
}
```

**Success — list:**
```json
{
  "data": [ { "...": "..." } ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 47
  }
}
```

**Success — accepted (async work):** `202 Accepted` with `{ "data": { "status": "received" } }`.

**Success — no content:** `204 No Content`, empty body. Used for `DELETE` and `POST /auth/logout`.

**Error envelope (every non-2xx):**
```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message safe to surface to UI.",
    "details": { "...": "optional, field-level info" }
  }
}
```

### 1.5 Error codes

| HTTP | code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Malformed JSON, missing required header. |
| 401 | `UNAUTHENTICATED` | Missing or invalid auth cookie. |
| 401 | `SESSION_INVALID` | Cookie valid, but user record gone. |
| 403 | `FORBIDDEN` | Authenticated but action not permitted (reserved for future). |
| 403 | `BAD_ORIGIN` | Origin header fails CSRF check on mutating request. |
| 404 | `NOT_FOUND` | Resource does not exist or is not published (public reads). |
| 409 | `CONFLICT` | Unique constraint violated (e.g. duplicate slug). |
| 422 | `VALIDATION_FAILED` | Body matches JSON but fails Zod validation; `details` contains field errors. |
| 429 | `RATE_LIMITED` | Bucket exhausted. `Retry-After` header included. |
| 500 | `INTERNAL_ERROR` | Unhandled exception. Logged with correlation id. |

### 1.6 Pagination

- All list endpoints accept `?page=<n>&pageSize=<n>`. Defaults: `page=1`, `pageSize=20`. `pageSize` is capped at `100`.
- Invalid values return `422 VALIDATION_FAILED`.
- `total` in the response is the unfiltered row count after `WHERE` but before `LIMIT/OFFSET`.

### 1.7 Timestamps

All timestamps are ISO 8601 UTC with millisecond precision: `2026-05-25T08:30:00.000Z`. No local time zones in API payloads.

### 1.8 Rate limiting

Enforced in Redis. Bucket key format: `ratelimit:<scope>:<ip>`.

| Endpoint | Limit |
|---|---|
| `POST /contact` | 3 per IP per 10 min, 20 per IP per day |
| `POST /auth/login` | 5 per IP per 10 min |
| `POST /auth/refresh` | 30 per IP per 10 min |
| All other endpoints | 120 per IP per minute (DDOS guard) |

Responses that hit a limit include headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

### 1.9 CORS

- Production: same-origin only (frontend and API share `zoneforty5.tech`). No CORS headers needed.
- Development: `Access-Control-Allow-Origin: http://localhost:5173`, credentials allowed. Configured via `CORS_ORIGIN` env var.

### 1.10 Correlation id

Every request gets a `X-Request-Id` header — either echoed from the client or generated server-side (`crypto.randomUUID()`). Included in every log line and every error response (`details.requestId`).

---

## 2. Public Endpoints

### 2.1 `GET /health`

Liveness probe for Nginx upstream healthcheck and uptime monitoring.

- **Auth:** none
- **Rate limit:** exempt
- **200 response:**
```json
{
  "data": {
    "status": "ok",
    "version": "0.1.0",
    "uptimeSec": 3712,
    "checks": {
      "db": "ok",
      "redis": "ok"
    }
  }
}
```
- **503 response** (db or redis down): same shape, `status: "degraded"`, failing check set to `"fail"`.

---

### 2.2 `GET /portfolio`

List published portfolio projects. Used by the public portfolio grid.

- **Auth:** none
- **Query params:** `page`, `pageSize` (see §1.6)
- **Cache:** Redis, key `cache:portfolio:list:p<page>:s<pageSize>`, TTL 60s. Invalidated by any admin write.
- **200 response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "smart-greenhouse-monitor",
      "title": "Smart Greenhouse Monitor",
      "description": "IoT-driven climate control for indoor agriculture.",
      "techStack": ["Go", "ESP32", "PostgreSQL", "React"],
      "outcome": "30% reduction in water usage; deployed at 4 sites.",
      "projectUrl": "https://example.com/case",
      "coverImageUrl": "https://...",
      "sortOrder": 10,
      "createdAt": "2026-04-12T09:00:00.000Z",
      "updatedAt": "2026-05-01T11:23:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 7 }
}
```

### 2.3 `GET /portfolio/:slug`

Single published portfolio project, including full Markdown body.

- **Auth:** none
- **Path:** `:slug` — kebab-case, max 80 chars, `[a-z0-9-]+`
- **200 response:**
```json
{
  "data": {
    "id": "uuid",
    "slug": "smart-greenhouse-monitor",
    "title": "Smart Greenhouse Monitor",
    "description": "...",
    "body": "# Markdown body...\n\n...",
    "techStack": ["..."],
    "outcome": "...",
    "projectUrl": "https://...",
    "coverImageUrl": "https://...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```
- **404** `NOT_FOUND` if slug does not exist or row is not published.

---

### 2.4 `GET /posts`

List published blog posts / case studies.

- **Auth:** none
- **Query params:** `page`, `pageSize`, optional `tag=<slug>` to filter by tag.
- **Cache:** Redis, key `cache:posts:list:t<tag>:p<page>:s<pageSize>`, TTL 60s.
- **200 response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "agent-powered-delivery-week-1",
      "title": "Agent-Powered Delivery — Week 1",
      "excerpt": "What worked, what didn't, what changed.",
      "coverImageUrl": "https://...",
      "publishedAt": "2026-05-20T10:00:00.000Z",
      "tags": [
        { "slug": "process", "name": "Process" },
        { "slug": "ai", "name": "AI" }
      ]
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 3 }
}
```

### 2.5 `GET /posts/:slug`

Single published post, including body.

- **Auth:** none
- **200 response:**
```json
{
  "data": {
    "id": "uuid",
    "slug": "agent-powered-delivery-week-1",
    "title": "...",
    "excerpt": "...",
    "body": "# Markdown...",
    "coverImageUrl": "https://...",
    "publishedAt": "...",
    "tags": [{ "slug": "process", "name": "Process" }]
  }
}
```
- **404** if slug is missing or row is not published.

### 2.6 `GET /posts/tags`

All tags currently attached to at least one published post. Used for the filter UI on the blog index.

- **Auth:** none
- **Cache:** Redis, key `cache:posts:tags`, TTL 300s.
- **200 response:**
```json
{
  "data": [
    { "slug": "process", "name": "Process", "postCount": 3 },
    { "slug": "ai",      "name": "AI",      "postCount": 5 }
  ]
}
```

---

### 2.7 `POST /contact`

Submit the contact form. Persists the row, attempts a notification email asynchronously.

- **Auth:** none
- **Rate limit:** 3/10min/IP, 20/day/IP
- **Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project enquiry",
  "message": "Long-form message text...",
  "hpField": "",
  "turnstileToken": "..."
}
```
- **Validation:**
  - `name` — string, 1-100 chars, trimmed.
  - `email` — RFC-5322 valid, max 254 chars, MX record exists (DNS lookup, 1s timeout — failure returns `422`).
  - `subject` — string, 1-200 chars, trimmed.
  - `message` — string, 10-5000 chars.
  - `hpField` — string, must equal `""`. Any other value silently returns `202` (deceive the bot) but is dropped.
  - `turnstileToken` — string, required if Q3 is approved; verified against Cloudflare's siteverify endpoint. If Q3 is declined, this field is omitted from the contract.
- **202 response:**
```json
{ "data": { "status": "received", "submissionId": "uuid" } }
```
- **422** `VALIDATION_FAILED` with `details: { field: "email", reason: "INVALID" }` etc.
- **429** `RATE_LIMITED`.

Email is sent **after** the response is returned to the client (`setImmediate` + try/catch, never rethrown). Email failures update the row's `status` to `pending_email` for retry by the background job.

---

## 3. Auth Endpoints

### 3.1 `POST /auth/login`

- **Auth:** none (this is how you get auth)
- **Rate limit:** 5 per IP per 10 min
- **Request body:**
```json
{
  "email": "admin@zoneforty5.tech",
  "password": "...",
  "turnstileToken": "..."
}
```
- **Validation:** `email` valid, `password` 8–256 chars. (Login form does NOT enforce password complexity — that's only enforced at admin-creation time. We accept whatever is in the DB.)
- **200 response:** sets `zf45_at` and `zf45_rt` cookies; returns:
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@zoneforty5.tech",
      "name": "Janaka Sangeeth"
    }
  }
}
```
- **401** `UNAUTHENTICATED` for bad email or bad password. Single generic message — never disclose which field was wrong. Implement timing-safe comparison.
- **429** `RATE_LIMITED` after 5 bad attempts.

### 3.2 `POST /auth/refresh`

Mints a new access token using the refresh cookie. Rotates the refresh token (old one is revoked).

- **Auth:** `zf45_rt` cookie required
- **Rate limit:** 30 per IP per 10 min
- **Request body:** empty
- **200 response:** sets new `zf45_at` and `zf45_rt` cookies; returns:
```json
{ "data": { "refreshed": true } }
```
- **401** `UNAUTHENTICATED` if refresh cookie missing, unknown, or already revoked.

### 3.3 `POST /auth/logout`

- **Auth:** `zf45_at` cookie (must be valid; refresh cookie also revoked)
- **Request body:** empty
- **204 response:** clears both cookies (`Max-Age=0`), revokes the refresh token in Redis. Idempotent.

### 3.4 `GET /auth/me`

Returns the current admin user. Used by the SPA on mount to determine if it should show the admin shell or redirect to `/admin/login`.

- **Auth:** `zf45_at` cookie required
- **200 response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "admin@zoneforty5.tech",
    "name": "Janaka Sangeeth",
    "lastLoginAt": "2026-05-25T07:00:00.000Z"
  }
}
```
- **401** `UNAUTHENTICATED` if cookie missing/invalid (frontend treats this as "not logged in", no error toast).

---

## 4. Admin Endpoints

All paths below sit under `/api/admin/*` and require a valid `zf45_at` cookie. All mutating endpoints additionally validate the `Origin` header.

### 4.1 Portfolio admin

#### `GET /admin/portfolio`
List ALL portfolio entries (including unpublished drafts). Pagination identical to §2.2.

#### `GET /admin/portfolio/:id`
Single entry by UUID (not slug), including drafts.

#### `POST /admin/portfolio`
Create a new entry.
- **Request body:**
```json
{
  "slug": "smart-greenhouse-monitor",
  "title": "Smart Greenhouse Monitor",
  "description": "Short description (max 280 chars).",
  "body": "# Markdown body...",
  "techStack": ["Go", "ESP32"],
  "outcome": "30% reduction in water usage.",
  "projectUrl": "https://example.com",
  "coverImageUrl": "https://...",
  "sortOrder": 10,
  "published": false
}
```
- **Validation:**
  - `slug` — `[a-z0-9-]{1,80}`, must not start/end with `-`, must be unique (409 CONFLICT on duplicate).
  - `title` — 1-200 chars.
  - `description` — 1-280 chars.
  - `body` — 1-50,000 chars.
  - `techStack` — array of 0-30 strings, each 1-40 chars.
  - `outcome` — optional, 0-280 chars.
  - `projectUrl` — optional, valid http(s) URL, max 2,048 chars.
  - `coverImageUrl` — optional, valid http(s) URL, max 2,048 chars.
  - `sortOrder` — integer, default 0.
  - `published` — boolean, default `false`.
- **201 response:** full row (same shape as §2.3 plus `published` and `sortOrder`).
- **Side effect:** invalidates `cache:portfolio:list:*`.

#### `PUT /admin/portfolio/:id`
Full replacement of all fields. Same body and validation as `POST`. Slug may change — uniqueness re-checked.
- **200 response:** updated row.
- **Side effect:** invalidates portfolio caches.

#### `DELETE /admin/portfolio/:id`
- **204 response.**
- **Side effect:** invalidates portfolio caches. Hard delete (no soft-delete column at MVP).

---

### 4.2 Posts admin

#### `GET /admin/posts`
List all posts (drafts + published). Pagination + optional `?status=draft|published`.

#### `GET /admin/posts/:id`
Single post including body and tag list.

#### `POST /admin/posts`
- **Request body:**
```json
{
  "slug": "agent-powered-delivery-week-1",
  "title": "Agent-Powered Delivery — Week 1",
  "excerpt": "What worked, what didn't.",
  "body": "# Markdown...",
  "coverImageUrl": "https://...",
  "published": true,
  "tags": ["process", "ai"]
}
```
- **Validation:**
  - `slug` — same rules as portfolio.
  - `title` — 1-200 chars.
  - `excerpt` — 1-400 chars.
  - `body` — 1-100,000 chars.
  - `coverImageUrl` — optional, valid URL, max 2,048 chars.
  - `published` — boolean. If `true` and the row was not previously published, server sets `publishedAt = now()`.
  - `tags` — array of 0-10 tag slugs. Unknown slugs are created on the fly (server inserts them with `name = titlecase(slug.replace('-', ' '))`).
- **201 response:** full row including `tags` array.
- **Side effect:** invalidates `cache:posts:*`. If `published === true`, fires `repository_dispatch` to GitHub Actions to trigger a rebuild (see architecture §8.5).

#### `PUT /admin/posts/:id`
Same body, same rules. `publishedAt` is set on first transition `false → true` and never cleared on `true → false` (preserves historical record).

#### `DELETE /admin/posts/:id`
- **204 response.** Cascades to `post_tags` rows. Hard delete.

---

### 4.3 Contact submissions admin

#### `GET /admin/contact`
List all contact submissions, newest first.
- **Query params:** `page`, `pageSize`, optional `?status=received|pending_email|emailed|email_failed`.
- **200 response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "subject": "Project enquiry",
      "messagePreview": "First 120 chars of the message...",
      "status": "emailed",
      "ipAddress": "203.0.113.42",
      "createdAt": "2026-05-25T08:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 14 }
}
```

#### `GET /admin/contact/:id`
Full submission including the complete message.
- **200 response:** same as list row but with `message` (full body) instead of `messagePreview`, plus `userAgent` and `emailAttempts`.

There is intentionally **no** `POST`, `PUT`, or `DELETE` for contact submissions at MVP. They are append-only from the public endpoint. Reasoning: prevents accidental loss of leads; if cleanup is needed, do it via SQL (documented runbook).

---

### 4.4 Image upload (Cloudflare R2)

A two-step flow keeps large file bytes off the API process. The admin UI:
1. Calls `POST /admin/uploads/sign` to get a short-lived pre-signed PUT URL plus the public URL the file will live at.
2. PUTs the raw file bytes directly to R2 using that signed URL (browser → R2, the API is not involved).
3. Stores the returned `publicUrl` in the `coverImageUrl` field of a portfolio or post via `POST /admin/portfolio` or `POST /admin/posts`.

#### `POST /admin/uploads/sign`

Mints a pre-signed PUT URL for the `zf45-uploads` R2 bucket.

- **Auth:** `zf45_at` cookie required
- **Rate limit:** global (covers cost / abuse)
- **Request body:**
```json
{
  "filename": "smart-greenhouse-hero.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 248391
}
```
- **Validation:**
  - `filename` — string, 1–200 chars. Server **does not** trust the provided name; it generates a UUID-based key (`<yyyy>/<mm>/<uuid>.<ext>`) and only uses the client-provided extension after whitelisting.
  - `contentType` — must be one of: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`. Other values return `422 VALIDATION_FAILED`.
  - `sizeBytes` — integer, 1 – 5 × 1024 × 1024 (5 MiB cap). Larger uploads return `422`. (The signed URL also includes a `Content-Length` precondition so R2 enforces the cap server-side.)
- **200 response:**
```json
{
  "data": {
    "uploadUrl": "https://<account>.r2.cloudflarestorage.com/zf45-uploads/2026/05/<uuid>.jpg?X-Amz-Algorithm=...",
    "publicUrl": "https://cdn.zoneforty5.tech/2026/05/<uuid>.jpg",
    "expiresInSec": 300,
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg"
    }
  }
}
```
- Frontend then performs `PUT <uploadUrl>` with the file body and the listed `Content-Type` header. R2 returns `200` on success.
- After success, the frontend uses `publicUrl` as the value for `coverImageUrl` on the next portfolio/post save.

**Failure modes:**
- The pre-signed URL expires after 300 seconds. If the upload takes longer (large file on slow connection), the frontend re-calls `POST /admin/uploads/sign`.
- If R2 rejects the upload (size violation, wrong content-type), the frontend surfaces the error to the user; no row is created on the API side because no save call happened.

**Notes for the Backend Agent:**
- Use the AWS SDK v3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) configured with R2's S3-compatible endpoint (`https://<account>.r2.cloudflarestorage.com`) and the R2 access-key/secret-key pair stored in env (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=zf45-uploads`, `R2_PUBLIC_BASE=https://cdn.zoneforty5.tech`).
- Object key format: `<yyyy>/<mm>/<crypto.randomUUID()>.<ext>`. Never use the client-supplied filename in the key.
- No DELETE endpoint at MVP — orphaned images are acceptable. A weekly cron can sweep them later if needed.

---

## 5. Endpoint Summary (quick reference)

| Method | Path | Auth | Rate-limited | Notes |
|---|---|---|---|---|
| GET | `/health` | — | exempt | liveness |
| GET | `/portfolio` | — | global | public list, cached |
| GET | `/portfolio/:slug` | — | global | public detail |
| GET | `/posts` | — | global | public list, cached |
| GET | `/posts/:slug` | — | global | public detail |
| GET | `/posts/tags` | — | global | tag filter source |
| POST | `/contact` | — | 3/10min/IP | persists + emails async |
| POST | `/auth/login` | — | 5/10min/IP | sets cookies |
| POST | `/auth/refresh` | rt cookie | 30/10min/IP | rotates tokens |
| POST | `/auth/logout` | at cookie | global | clears cookies, revokes rt |
| GET | `/auth/me` | at cookie | global | current user |
| GET | `/admin/portfolio` | at cookie | global | includes drafts |
| GET | `/admin/portfolio/:id` | at cookie | global | by uuid |
| POST | `/admin/portfolio` | at cookie | global | invalidates cache |
| PUT | `/admin/portfolio/:id` | at cookie | global | invalidates cache |
| DELETE | `/admin/portfolio/:id` | at cookie | global | hard delete |
| GET | `/admin/posts` | at cookie | global | drafts + published |
| GET | `/admin/posts/:id` | at cookie | global | by uuid |
| POST | `/admin/posts` | at cookie | global | dispatches rebuild on publish |
| PUT | `/admin/posts/:id` | at cookie | global | sets publishedAt on first publish |
| DELETE | `/admin/posts/:id` | at cookie | global | cascades to post_tags |
| GET | `/admin/contact` | at cookie | global | newest first |
| GET | `/admin/contact/:id` | at cookie | global | full message |
| POST | `/admin/uploads/sign` | at cookie | global | mints R2 pre-signed PUT URL |

Total: 23 endpoints.

---

## 6. Things the Backend Agent owns from here

1. Concrete Zod schemas in `backend/src/lib/schemas.ts` and the matching exports in `shared-types/`.
2. Per-endpoint OpenAPI fragments OR a single `openapi.yaml` generated from the Zod schemas (Backend Agent picks the tool; `zod-to-openapi` is the default recommendation).
3. Example `curl` invocations for every endpoint in `docs/api/examples.md` (Docs Agent will reformat for the handover package).
4. The Resend templated email body (HTML + plaintext) for the contact-form notification.
5. The `repository_dispatch` payload shape for the post-publish rebuild trigger.
6. Decision on whether `turnstileToken` is included in `POST /contact` and `POST /auth/login` based on the founder's answer to Q3 in `architecture.md`.

---

## 7. Things the Frontend Agent needs from this file

- All response shapes are stable. Type generation should use the shared Zod schemas — do not hand-type response interfaces.
- Cookies are httpOnly: the SPA cannot read them. Use the result of `GET /auth/me` to determine logged-in state; treat 401 as "logged out" without showing an error.
- On every admin mutation, refetch the list query (TanStack Query `invalidateQueries`) — the server has already invalidated the Redis cache, but the SPA must invalidate its own cache too.
- On `429 RATE_LIMITED`, show the retry-after value to the user; do not auto-retry.
- The contact form expects `202` on success (not `200`).

---

*End of api-contracts.md — Backend Agent must mark this READY before frontend admin integration starts.*

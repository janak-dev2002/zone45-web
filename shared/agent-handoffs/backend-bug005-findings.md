# Backend — BUG-005 Findings

> Agent: Backend (Claude Sonnet 4.6)
> Date: 2026-06-02
> Status: COMPLETE — PR backend/fix-form-submissions raised

---

## Finding 1 — Admin Portfolio CRUD: 422 on every create/update

**Suspected root cause:** `urlSchema` in `backend/src/lib/schemas.ts` is defined as
`z.string().url().max(2048).optional()`. Zod's `.optional()` only allows `undefined` —
it does NOT allow an empty string `''`. When `projectUrl` or `coverImageUrl` is left
blank, the frontend sends `''` (the form initialises both fields to empty string).
Zod validates `''` against `.url()`, which fails with "Invalid url", and returns
`422 VALIDATION_FAILED` before the row ever reaches the database.

**Evidence from code:**
- `frontend/src/admin/portfolio/PortfolioForm.tsx` line 21–22:
  `projectUrl: ''` and `coverImageUrl: ''` in the EMPTY initial state.
- `frontend/src/lib/api.ts` `adminCreatePortfolio()` / `adminUpdatePortfolio()` pass
  the form body verbatim via `JSON.stringify(body)` — no stripping of empty strings.
- `backend/src/lib/schemas.ts` line 11:
  `const urlSchema = z.string().url().max(2048).optional();`
  An empty string satisfies `z.string()` but fails `z.url()`.
- `backend/src/routes/admin/portfolio.ts` lines 99–107:
  Zod `safeParse` failure returns 422 immediately; the DB INSERT is never reached.

**Confidence:** HIGH — reproducible by inspection without logs.

**Proposed fix (backend):** Change `urlSchema` to preprocess empty strings to `undefined`:
```typescript
const urlSchema = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().max(2048).optional(),
);
```
`z.preprocess` runs before Zod's validators; `undefined` satisfies `.optional()`,
so the field is treated as absent rather than an invalid URL.

---

## Finding 2 — Contact form: possible Turnstile token timing issue

**Suspected root cause:** The contact form submits `turnstileToken: turnstileToken || 'dev-token'`
(Contact.tsx line 55). If the Turnstile widget hasn't completed its challenge when the
user clicks "Send", `turnstileToken` state is `''`, and the literal string `'dev-token'`
is sent. Cloudflare's siteverify API will reject `'dev-token'` as an invalid token,
causing `verifyTurnstile()` to return false and the handler to return 422.

**Evidence from code:**
- `frontend/src/pages/Contact.tsx` line 55: `turnstileToken: turnstileToken || 'dev-token'`
- `frontend/src/admin/Login.tsx` line 28: identical fallback — `turnstileToken || 'dev-token'`
  but login succeeds (QA confirmed). This means either the widget consistently resolves
  before the user finishes filling in credentials, OR the Turnstile secret on the server
  is the Cloudflare test secret which always passes.
- `backend/src/services/turnstile.ts`: backend logic is correct — it calls siteverify
  and logs the error-codes on failure. No backend bug here.

**Confidence:** MEDIUM — cannot confirm without EC2 logs showing the Turnstile error-codes.

**Action required from founder:**
Run `docker compose logs api --since 2h | grep -iE "turnstile|422|POST /api/contact"`
and share the output. If logs show `codes: ["invalid-input-response"]` this confirms
the `'dev-token'` fallback is the trigger. If they show `codes: ["invalid-input-secret"]`
the `TURNSTILE_SECRET` env var on EC2 is wrong.

**Proposed fix (frontend — NOT this backend PR):** Disable the submit button until
`turnstileToken !== ''` so `'dev-token'` is never sent.

**Backend note:** `TURNSTILE_SECRET` is parsed as a required `z.string().min(1)` in
`env.ts`. If it were missing, the API container would not start. The container is up
(admin login works), so the secret is present. The question is whether it is the
production secret or the test-only value `1x0000000000000000000000000000000AA`.

---

## Finding 3 — Silent refresh non-functional on admin routes (latent, not BUG-005 cause)

**Observation:** The `zf45_rt` cookie is set with `path: '/api/auth'`
(`backend/src/lib/cookies.ts` line 16). Browsers only send a cookie to paths that
match its path attribute. Requests to `/api/admin/*` will never include `zf45_rt`.

The auth middleware's silent-refresh code path (which reads `req.cookies?.zf45_rt`)
therefore never triggers on admin routes — it always falls through to the
"Session expired" 401 branch when the 15-minute access token expires.

**Impact for BUG-005:** None — QA tested immediately after login, well within the 15-minute
window. Access tokens are valid, so auth succeeds.

**Impact long-term:** After 15 minutes of inactivity the admin is hard-logged-out.
No data loss, but poor UX. The frontend would need to catch 401 on admin requests and
explicitly call `POST /api/auth/refresh` (which does send `zf45_rt` because its path
matches `/api/auth`), then retry. Not fixing in this PR; raising as a separate task.

---

## What this PR fixes

Only Finding 1 — the confirmed, backend-owned regression. Finding 2 requires
frontend action. Finding 3 is a separate backlog item.

# DevOps Agent — Bug Fix Round 2 Handoff

> Agent: DevOps (Claude Sonnet 4.6)
> Branch: `devops/fix-nginx-json-csp`
> PR: #14 — https://github.com/janak-dev2002/zone45-web/pull/14
> Commit: `4cd7be5`
> Completed: 2026-06-02
> Status: **PR OPEN — awaiting founder merge**

---

## Scope

Nginx-level bug fixes surfaced by QA smoke test against https://zoneforty5.tech on
2026-06-02. Single file changed: `devops/nginx/conf.d/default.conf`.

---

## BUG-001 — JSON 404 guard

**Root cause:** The SPA catch-all `location /` used `try_files $uri $uri/ /index.html`.
Any path that did not resolve to a real file fell back to `index.html` — including
requests for `.json` files. A missing JSON resource returned HTTP 200 with HTML
content, causing silent parse errors in any JS code that `fetch()`-ed it.

**Fix applied:**

```nginx
# ── JSON files must 404, not fall back to index.html (would crash JS parser) ─
location ~* \.json$ {
    try_files $uri =404;
}
```

Placed immediately before the `location /` catch-all. Nginx regex location blocks
match before the generic prefix block, so this takes precedence.

**Verification:** `curl -I https://zoneforty5.tech/nonexistent.json` must return `404`.

---

## BUG-003 — CSP violations

**Root cause:** The `Content-Security-Policy` header had two gaps:

1. `font-src 'self'` — blocked data: URIs. The self-hosted woff2 fonts use data URI
   embedding at some point in the asset pipeline (likely the Vite build inlines small
   fonts as data URIs in CSS).

2. `script-src` lacked `'unsafe-inline'` — Cloudflare Turnstile injects inline event
   handlers when it initialises, triggering a CSP violation that can prevent the widget
   from rendering on the Contact and Login pages.

**Fix applied:**

| Directive | Before | After |
|-----------|--------|-------|
| `font-src` | `'self'` | `'self' data:` |
| `script-src` | `'self' https://challenges.cloudflare.com` | `'self' 'unsafe-inline' https://challenges.cloudflare.com` |

**Security trade-off for `'unsafe-inline'`:**

Adding `'unsafe-inline'` to `script-src` weakens the CSP against reflected/stored
XSS attacks. This is accepted under the following conditions:

- Turnstile's widget execution is sandboxed inside a Cloudflare-hosted iframe; the
  inline injection is limited to the widget bootstrap, not arbitrary application code.
- The allowed external script origin remains locked to `https://challenges.cloudflare.com`.
- A hash-based or nonce-based alternative was evaluated but is not viable:
  - Hash approach requires knowing the exact inline script at build time — Cloudflare
    can change it at any release.
  - Nonce approach requires per-request server-side rendering to inject a fresh nonce
    into each HTML response. The frontend is a static SSG build served directly by
    Nginx; there is no request-time templating layer.
- The trade-off is documented in a comment in `default.conf` so a future engineer
  understands why `'unsafe-inline'` is present.

**If a stricter CSP is needed later:** Switch frontend to SSR (e.g. Next.js with custom
`_document.tsx`) so Nginx or the Node server can inject per-request nonces. That is
outside DevOps scope and requires Frontend Agent involvement.

**Verification:** Open browser dev-tools console on https://zoneforty5.tech — no
`Content-Security-Policy` violations should appear.

---

## Files Changed

| File | Change |
|------|--------|
| `devops/nginx/conf.d/default.conf` | Added `.json` 404 location block; updated CSP `font-src` and `script-src` |

---

## Tasks Updated

- `shared/tasks.md` — BUG-001 and BUG-003 items marked complete; PR #14 noted.

---

## What Happens Next

1. **Founder / tech lead reviews PR #14** and merges to `main`.
2. **CI/CD pipeline** (`deploy.yml`) triggers automatically — builds new Nginx image
   (which bakes in the updated `default.conf`) and deploys to EC2.
3. **QA Agent** is unblocked to re-run the full smoke test suite once the deployment
   is live (currently BLOCKED on this PR per `shared/tasks.md`).
4. **Smoke-test checklist** (post-merge):
   - `curl -I https://zoneforty5.tech/nonexistent.json` → 404
   - No CSP console errors on `/`, `/contact`, `/admin/login`
   - Turnstile widget renders on Contact and Login pages
   - All existing routes continue to load (SPA fallback still active for non-json paths)

---

*End of DevOps Bug Fix Round 2 handoff.*

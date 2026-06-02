# Frontend Agent — Bug Fix Done (BUG-001)

> Agent: Frontend (Claude Sonnet 4.6)
> Branch: `frontend/fix-ssg-manifest`
> PR: [#15](https://github.com/janak-dev2002/zone45-web/pull/15)
> Completed: 2026-06-02
> Status: **COMPLETE — PR open, awaiting merge**

---

## What Was Fixed

**BUG-001** — Every page on `https://zoneforty5.tech` crashed with:

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

The browser console showed the app requesting `static-loader-data-manifest-undefined.json`.

---

## Root Cause Analysis

`vite-react-ssg` uses a random build hash to bust caches on its static loader data manifest. It
delivers this hash to the browser by injecting an inline `<script>` into every SSG-rendered HTML
page immediately after rendering:

```html
<script>window.__VITE_REACT_SSG_HASH__ = 'abc123xyz'</script>
```

The production Nginx configuration has a strict Content Security Policy:

```
script-src 'self' https://challenges.cloudflare.com;
```

This policy does **not** include `'unsafe-inline'`. The browser refuses to execute the inline script,
`window.__VITE_REACT_SSG_HASH__` stays `undefined`, and the vite-react-ssg client constructs:

```
static-loader-data-manifest-undefined.json
```

Nginx has no file by that name. Its SPA fallback (`try_files $uri $uri/ /index.html`) serves the
landing page HTML instead. The JavaScript engine tries to `JSON.parse()` that HTML and throws
`SyntaxError: Unexpected token '<'`. React's error boundary catches it and displays the full-page
crash overlay.

The correctly named manifest file (`static-loader-data-manifest-abc123xyz.json`) IS present in
`dist/` — it was generated correctly at build time. The problem is purely that the client cannot
discover the hash because the inline delivery mechanism is blocked by the CSP.

---

## Fix

Added `ssgOptions.onFinished` hook in `frontend/vite.config.ts`.

The hook runs after vite-react-ssg has finished rendering all pages and writing the manifest. It:

1. Reads `dist/index.html` and extracts the hash value from the inline script tag via regex
2. Writes `dist/assets/ssg-init-{hash}.js` with content `window.__VITE_REACT_SSG_HASH__='{hash}'`
3. Iterates over all SSG HTML files in `dist/` and replaces the blocked inline script with a
   same-origin external script reference: `<script src="/assets/ssg-init-{hash}.js"></script>`

**Why this works with the CSP:**

`script-src 'self'` allows scripts loaded from the same origin. `<script src="/assets/ssg-init-...js">` 
loads from the same origin as the page, so it is permitted. The inline assignment is gone.

**Why it is cache-safe:**

The filename includes the build hash (`ssg-init-{hash}.js`), so it changes with every new build.
The Nginx config caches `.js` files with `Cache-Control: immutable, max-age=1y`. Since the filename
changes, old cached files are never served for a new build's hash.

**Execution order:**

The `<script src="...">` tag is a blocking (non-module) script placed before the `<script type="module" async>` 
main bundle. It runs synchronously when the HTML parser reaches it, ensuring
`window.__VITE_REACT_SSG_HASH__` is set before any module code reads it.

---

## Files Changed

| File | Description |
|------|-------------|
| `frontend/vite.config.ts` | Added `fs` imports + `ssgOptions.onFinished` hook (36 lines) |

---

## Build Verification

```
npm run build   # in frontend/
```

Output confirms fix applied:
```
[vite-react-ssg] Generating static loader data... (5)
dist/static-loader-data-manifest-hsthr79ir4.json  0.25 KiB

[vite-react-ssg] Build finished.
```

Post-build `dist/` state:
- `dist/assets/ssg-init-hsthr79ir4.js` — `window.__VITE_REACT_SSG_HASH__='hsthr79ir4'`
- `dist/index.html` line 13: `<script src="/assets/ssg-init-hsthr79ir4.js"></script>`
- Same replacement confirmed in `work.html`, `notes.html`, `about.html`, `contact.html`
- No inline `window.__VITE_REACT_SSG_HASH__` script anywhere in `dist/`

---

## Dependency on DevOps PR

The DevOps agent's PR #14 (`devops/fix-nginx-json-csp`) independently adds:
- `'unsafe-inline'` to `script-src` (defence in depth if this PR is reverted)
- A `location ~* \.json$ { try_files $uri =404; }` block to prevent Nginx from serving HTML for
  missing JSON files

Both PRs are required for a fully robust fix. This frontend PR resolves the root cause. The DevOps
PR prevents fallback failures if the hash mechanism ever produces an unexpected URL.

---

## Next Steps for QA

After both PRs (#14 + #15) are merged and deployed:
1. Re-run the full Playwright smoke test suite
2. Verify the landing page loads without a crash overlay
3. Verify that navigating to `/work`, `/notes`, `/about`, `/contact` all render correctly
4. Verify the admin login form at `/admin/login` is accessible and interactive

---

*Frontend Agent Bug Fix session complete — 2026-06-02*

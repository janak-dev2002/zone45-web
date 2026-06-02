# Frontend Handoff — FIX-005 Hydration Full Audit

> Date: 2026-06-03
> Agent: Frontend (Claude Sonnet 4.6)
> Branch: frontend/fix-hydration-full → PR #20

---

## Summary

React hydration errors #418, #423, and #425 persisted on all public pages after PR #16.
Root cause identified and fixed. One-line change to `vite.config.ts`. Build verified clean.

---

## Root Cause

React Router's `StaticRouterProvider` (used by `vite-react-ssg` during SSG rendering) appends
`window.__staticRouterHydrationData` as a `<script>` element **inside** `<div id="root">` as its
last child. This is documented in the React Router source — the server component renders the
script alongside the route tree.

The browser-side `RouterProvider` renders `{null}` at that same tree position (intentional, to
preserve `useId` tree structure for deterministic IDs). `{null}` produces no DOM node. When
React's `hydrateRoot` walks the root container it finds the `<script>` DOM node with no matching
fiber and throws:

- **#418** — `Hydration failed because the initial UI does not match what was rendered on the server`
- **#423** — `There was an error while hydrating. Switching entire root to client rendering`
- **#425** — `Text content did not match`

This affected **every** public page because `vite-react-ssg` injects this script on every SSG route.

---

## Fix

`frontend/vite.config.ts` — `onFinished` hook extended with a single regex replace:

```ts
const routerDataScriptRe = /(<script>window\.__staticRouterHydrationData[^<]*<\/script>)(<\/div>)/
html = html.replace(routerDataScriptRe, '$2\n$1')
```

This moves the script from inside `<div id="root">` to immediately after it. The script still
executes synchronously as the browser parses the HTML — before the async module bundle runs —
so `createBrowserRouter` reads `window.__staticRouterHydrationData` correctly at init time.

---

## Full src/ Audit Results

Grepped the entire `src/` for all common SSR/CSR divergence patterns:

| Pattern | Hits | Status |
|---|---|---|
| `window.` | 1 | In `useEffect` — safe (fixed in PR #16) |
| `document.` | 0 | None |
| `navigator.` | 0 | None |
| `localStorage.` | 0 | None |
| `sessionStorage.` | 0 | None |
| `Math.random()` | 0 | None |
| `new Date()` | 0 | None (date formatting uses `.toISOString()` — deterministic) |

No additional render-phase browser API calls found. `useMediaQuery` is already guarded with
`useState(false)` and `window.matchMedia` inside `useEffect` (fixed in PR #16).

---

## Verification

- `npm run build` exits clean — 5 pages rendered, sitemap generated
- All 5 dist HTML files confirmed: `__staticRouterHydrationData` script is outside `<div id="root">`
- `window.__staticRouterHydrationData` value is still available before the module bundle executes

---

## PR

**#20** — https://github.com/janak-dev2002/zone45-web/pull/20
Branch: `frontend/fix-hydration-full` → `main`

---

## Open Questions / Risks

- None. The fix is surgical and scoped entirely to the post-processing step in `vite.config.ts`.
- If `vite-react-ssg` is upgraded in the future and stops using `StaticRouterProvider` (or if
  React Router changes the script injection pattern), the regex will silently no-op (no match,
  no replacement) — the worst case is reversion to the previous mismatch, not breakage.

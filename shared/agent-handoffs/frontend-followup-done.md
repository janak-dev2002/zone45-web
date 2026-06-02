# Frontend Agent — Follow-up Done (FIX-005 / FIX-006)

> Agent: Frontend (Claude Sonnet 4.6)
> Branch: `frontend/fix-hydration-forms`
> PR: [#16](https://github.com/janak-dev2002/zone45-web/pull/16)
> Completed: 2026-06-02
> Status: **COMPLETE — PR open, awaiting merge**

---

## What Was Fixed

Two non-blocking items flagged by QA Round 2.

---

## FIX-005 — React Hydration Errors #418 / #423 / #425

### Symptom

Browser console reported Minified React errors #418, #423, and #425 on every page load with a
mobile viewport. React was falling back from SSG hydration to full client-side rendering, losing
the SSG performance benefit.

### Root Cause

`src/lib/hooks/useMediaQuery.ts` used a lazy `useState` initializer:

```ts
const [matches, setMatches] = useState(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches   // runs in browser on first render
})
```

This is the classic SSG hydration trap:

| Environment | `window` | `matches` init | Nav rendered |
|-------------|---------|----------------|--------------|
| SSG (Node.js) | undefined | `false` | `<Nav />` |
| Browser (mobile) | defined | `true` | `<MNav />` |

React's hydration pass compares the SSG HTML (`<Nav />`) against the initial component tree
(`<MNav />`) and finds a structural mismatch → errors #418/#425. Because the mismatch is at
the root level of every page's layout, React throws error #423 and switches the entire root to
CSR.

`PageLayout` uses this hook directly to choose which nav to render:
```tsx
const isMobile = useMediaQuery('(max-width: 768px)')
return <>{isMobile ? <MNav /> : <Nav />}</>
```

### Fix

`src/lib/hooks/useMediaQuery.ts` — one line changed:

```diff
- const [matches, setMatches] = useState(() => {
-   if (typeof window === 'undefined') return false
-   return window.matchMedia(query).matches
- })
+ // Always false on first render — matches SSG output and avoids hydration mismatch.
+ // useEffect updates to the real value after hydration.
+ const [matches, setMatches] = useState(false)
```

The `useEffect` already present in the hook reads `window.matchMedia(query).matches` after
hydration and calls `setMatches`. The nav swaps on the second React commit (invisible to the
user on a modern CPU) with no console errors.

---

## FIX-006 — Missing `name` Attributes on Form Inputs

### Symptom

Contact form and admin login form inputs lacked `name=` attributes. Password managers and
browser autofill could not reliably identify fields, and standard HTML form semantics were
incomplete.

### Fix

Added `name=` matching the field's semantic purpose to every `<input>`, `<select>`, and
`<textarea>` in both forms.

**`src/pages/Contact.tsx`:**

```diff
- <input id="name" className="field" .../>
+ <input id="name" name="name" className="field" .../>

- <input id="email" className="field" type="email" .../>
+ <input id="email" name="email" className="field" type="email" .../>

- <select id="subject" className="field" ...>
+ <select id="subject" name="subject" className="field" ...>

- <textarea id="message" className="field" .../>
+ <textarea id="message" name="message" className="field" .../>

- <input type="checkbox" id="gdpr" .../>
+ <input type="checkbox" id="gdpr" name="gdpr" .../>
```

**`src/admin/Login.tsx`:**

```diff
- id="email" className="field" type="email" ...
+ id="email" name="email" className="field" type="email" ...

- id="password" className="field" type={showPw ? 'text' : 'password'} ...
+ id="password" name="password" className="field" type={showPw ? 'text' : 'password'} ...
```

---

## Build Verification

`npm run build` in `frontend/` — completed cleanly:
- 5 SSG pages rendered
- `dist/static-loader-data-manifest-dc4ddaz1xv.json` correctly named
- `dist/assets/ssg-init-dc4ddaz1xv.js` generated (CSP fix from PR #15 still working)
- No TypeScript or rollup errors

---

## Files Changed

| File | Lines changed |
|------|---------------|
| `frontend/src/lib/hooks/useMediaQuery.ts` | -4 / +3 |
| `frontend/src/pages/Contact.tsx` | +5 |
| `frontend/src/admin/Login.tsx` | +2 |

---

## Open Items

None. The site is in a clean release-candidate state. All QA Round 2 items resolved.

---

*Frontend Agent follow-up session complete — 2026-06-02*

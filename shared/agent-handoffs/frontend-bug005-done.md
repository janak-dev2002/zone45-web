# Frontend Agent — Bug Fix Done (BUG-005)

> Agent: Frontend (Claude Sonnet 4.6)
> Branch: `frontend/fix-bug005-form-handlers`
> PR: [#18](https://github.com/janak-dev2002/zone45-web/pull/18)
> Completed: 2026-06-02
> Status: **COMPLETE — PR open, awaiting merge**

---

## What Was Fixed

**BUG-005** — Every text field on the live site displayed `"false"` on the first keystroke, making the contact form and all admin portfolio/post CRUD forms completely non-functional.

---

## Root Cause

Three form handlers used the JavaScript `'in'` operator to decide whether an input was a checkbox:

```ts
const val = 'checked' in e.target ? e.target.checked : e.target.value
```

**Why this is wrong:** The `'in'` operator checks for property existence on the object and its prototype chain. The DOM spec defines `.checked` on the `HTMLInputElement` prototype — not just on checkbox inputs. Every `<input>` element (text, email, textarea, select, etc.) has a `.checked` property. It evaluates to `false` for non-checkboxes.

Result:
- User types a character into any text field
- `onChange` fires with an `HTMLInputElement` event
- `'checked' in e.target` → `true` (always)
- `e.target.checked` → `false` (boolean, not a string)
- State is set to `false`
- React renders the input's value as the string `"false"`
- The field appears to reset to `"false"` on every keystroke

---

## Files Fixed

| File | Line | Handler | Change |
|------|------|---------|--------|
| `frontend/src/pages/Contact.tsx` | 40 | `update()` | `'checked' in` → `e.target.type === 'checkbox'` |
| `frontend/src/admin/portfolio/PortfolioForm.tsx` | 85 | `set()` | Same; number branch preserved |
| `frontend/src/admin/posts/PostForm.tsx` | 80 | `set()` | `'checked' in` → `e.target.type === 'checkbox'` |

QA reported two files. A full `grep -r "'checked' in e.target" src/` scan found the identical pattern in `PostForm.tsx` as well. All three are fixed in this PR.

---

## The Fix

```diff
- const val = 'checked' in e.target ? e.target.checked : e.target.value
+ const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
```

`e.target.type === 'checkbox'` is the correct DOM check: it reads the `type` attribute directly rather than inferring input type from property existence.

`PortfolioForm.tsx` had an additional number-coercion branch which is preserved:

```ts
const val = e.target.type === 'checkbox'
  ? (e.target as HTMLInputElement).checked
  : e.target.type === 'number'
    ? Number(e.target.value)
    : e.target.value
```

---

## Build Verification

`npm run build` in `frontend/` — clean:
- No TypeScript errors
- 5 SSG pages rendered
- Manifest correctly named (`static-loader-data-manifest-hoo3lju78o.json`)
- `ssg-init-*.js` generated (BUG-001 fix from PR #15 still working)

---

*Frontend Agent BUG-005 session complete — 2026-06-02*

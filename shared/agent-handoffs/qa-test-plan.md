# QA Test Plan — ZoneForty5 Website

> STATUS: DRAFT
> Author: QA Agent (Gemini 3.1 Pro)
> Date: 2026-06-02
> Target Environment: https://zoneforty5.tech (EC2 Production)

## 1. Overview
This plan outlines the End-to-End (E2E) testing strategy for the ZoneForty5 agency website. Testing will be performed directly against the live production instance on EC2. The focus is on verifying core business flows, security boundaries, and the user experience across public and administrative interfaces.

## 2. In Scope
- **Public Pages:** Landing, Work (Portfolio), Notes (Blog), About, Contact.
- **Admin Panel:** Authentication flow, Portfolio CRUD, Blog CRUD, Contact Submissions.
- **Infrastructure:** HTTPS, Security Headers, API Health, Rate Limiting.
- **Responsive Design:** Mobile (375px), Tablet (768px), Desktop (1280px).

## 3. Test Categories & Scenarios

### 3.1 Public Experience & SEO
- **Navigation:** Verify all internal links in Header/Footer work without 404s.
- **SSG Verification:** Check page source of public routes to ensure content is pre-rendered (not just a blank <body>).
- **SEO Meta Tags:** Verify `title` and `meta description` tags change per route via `react-helmet-async`.
- **404 Handling:** Navigate to a non-existent URL and verify the custom 404 page appears.
- **Performance:** Basic load time smoke check (visual inspection for "jank").

### 3.2 Contact Form (Public)
- **Happy Path:** Submit with valid data, verify 202 status and success message.
- **Field Validation:**
    - Invalid email format.
    - Message under 10 characters.
    - Required fields missing.
- **Anti-Spam:**
    - **Honeypot:** Attempt submission with `hpField` filled (should be dropped/ignored).
    - **Turnstile:** Verify the widget renders and blocks submission if not solved (smoke check).
    - **Rate Limiting:** Attempt >3 submissions within 10 minutes from same IP (verify 429 response).

### 3.3 Authentication (Security)
- **Login Happy Path:** Valid credentials (from env) lead to Admin Dashboard.
- **Login Failure:** Invalid password/email returns generic 401 error.
- **Session Persistence:** Close browser and reopen; verify session persists (JWT cookies).
- **Unauthorized Access:** Attempt to access `/admin/portfolio` directly while logged out (verify redirect to login).
- **Logout:** Click logout and verify 204 response and redirection to landing or login.

### 3.4 Admin CRUD (Content Management)
- **Portfolio Management:**
    - Create a new project (draft vs published).
    - Update an existing project (verify changes reflect on public `/work` page).
    - Delete a project (verify hard delete).
- **Blog Management:**
    - Create a post with tags (verify tags are created/linked).
    - Preview Markdown rendering in the editor.
    - Publish a post and verify it appears in the list.
- **Image Upload Flow:**
    - Upload a cover image (verify R2 pre-signed URL flow succeeds).
    - Verify image renders on public and admin pages.
- **Contact Submissions:**
    - View list of submissions.
    - View detail of a specific submission.

### 3.5 Security & Infrastructure
- **SSL Check:** Verify certificate is valid and active.
- **Mixed Content:** Check console for any blocked insecure assets.
- **API Health:** Verify `GET /api/health` returns 200 and "ok" status for DB/Redis.
- **Security Headers:** Verify presence of HSTS, CSP, X-Frame-Options (via browser network tab).
- **CSRF Check:** Attempt a POST request to an admin endpoint without the correct `Origin` header (verify 403).

## 4. Edge Cases
- **Long Content:** Test how the UI handles very long project titles or blog excerpts.
- **Special Characters:** Test slugs with numbers and multiple hyphens (e.g. `2026-new-project--draft`).
- **Empty States:** Verify the "No projects found" or "No posts yet" UI when data is missing.
- **Network Interruptions:** Simulate slow 3G to check loading states/skeletons.

## 5. Risk Areas
- **Auth Bypass:** Ensuring admin endpoints are strictly protected.
- **Rate Limit False Positives:** Ensuring regular users aren't accidentally blocked by overly aggressive limits.
- **Image Upload Failures:** Ensuring the pre-signed URL flow doesn't hang on client-side errors.

## 6. Categorization of Findings
Findings in the final report will be categorized as:
- **CRITICAL:** Total failure of a core feature, security breach, or data loss risk.
- **MAJOR:** Significant feature degradation or major UX obstacle.
- **MINOR:** Cosmetic issues, minor UX friction, or non-critical edge case failures.
- **PASSED:** Feature behaves exactly as specified.

---
*QA Agent will proceed with execution upon approval of this plan.*

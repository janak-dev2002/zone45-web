# QA Test Plan — ZoneForty5 Website — Round 3 (Re-Test)

## 1. What's In Scope
This is a full re-test of the ZoneForty5 website following the implementation of fixes for Round 2 findings. The primary goal is to verify that the core functionality is restored and that no regressions have been introduced.

- **Environment:** Production (`https://zoneforty5.tech`)
- **Focus:** Complete E2E verification + specific BUG-005 validation.

## 2. Test Categories

### A. Priority Focus (BUG-005 Verification)
- **Contact Form:** Enter alphanumeric strings and special characters. Verify they are NOT overwritten with `"false"`. Submit and verify success.
- **Admin Portfolio:** Create/Edit/Delete project entries. Verify all fields (Title, Slug, Description) maintain input values.
- **Admin Blog Posts:** Create/Edit/Delete blog posts. Verify title, slug, and content maintain values.

### B. Full Suite (15 Scenarios)
1. **Public Navigation:** Home, Work, About, Contact load successfully.
2. **HTTPS/SSL:** Verify secure connection.
3. **Contact Form Submission:** Functional end-to-end (200/202 response).
4. **Admin Login:** Valid credentials (`sangeeth.jdev@gmail.com`).
5. **404 Handling:** Correct redirection/error page for invalid URLs.
6. **Mobile Responsive:** 375px viewport layout and navigation.
7. **Auth Protection:** Private routes redirect to `/admin/login`.
8. **API Health:** Check `GET /api/health`.
9. **SEO Meta Tags:** Verify `<title>` and `<meta name="description">` update on navigation.
10. **CSP Verification:** No console errors for fonts, scripts, or styles.
11. **Admin Portfolio CREATE:** Full project creation flow.
12. **Admin Portfolio EDIT:** Update existing project.
13. **Admin Portfolio DELETE:** Remove project.
14. **Admin Blog CRUD:** Full blog post management.
15. **Admin Contact List:** View incoming submissions.

## 3. Edge Cases & Risk Areas
- **Form Validation:** Submit forms with empty required fields.
- **Concurrent Submission:** Double-clicking "Send" or "Save" buttons.
- **Special Characters:** Testing inputs with `'`, `"`, `<`, `>`, `&`.
- **Hydration:** Monitoring console for any residual hydration warnings.

## 4. Tools
- **Playwright MCP:** Browser automation.
- **Console Monitoring:** Capture logs and network errors.

---
*Prepared by QA Agent on 2026-06-02.*

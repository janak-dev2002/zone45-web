# Change Log — ZoneForty5

> Log every mid-project decision change here.
> Format: date, what changed, why, which files updated, which agents affected.
> Hermes reads this file and includes recent changes in morning briefings.

---

## 2026-05-25 — Architecture approved (10 open questions resolved)

**What changed:** Founder reviewed `shared/architecture.md` (DRAFT) and answered all 10 open questions. Architecture status flipped DRAFT → APPROVED. Phase 2 (Database Agent) is now unblocked.
**Why:** Required to start specialist agent work per the SOP ("Architecture is DRAFT until founder approves").
**Type:** N/A (initial approval, not a mid-project change)
**Files updated:**
- `shared/architecture.md` — STATUS flipped to APPROVED; §9 rewritten with answers; §1.2 expanded with multi-stage `nginx.Dockerfile` detail; §6.3 added `zf45-uploads` R2 bucket; §7 added Cloudflare R2 + consolidated Cloudflare row (DNS + Turnstile + Email Routing).
- `shared/api-contracts.md` — added §4.4 (`POST /admin/uploads/sign` for R2 pre-signed PUT URLs); endpoint count 22 → 23; removed Q5 forward-reference in §1.2.
- `shared/db-schema.md` — no change required (`cover_image_url` is already a nullable string that holds the R2 public URL).
- `shared/agent-handoffs/architecture-done.md` — approval gate marked cleared; prerequisites checklist updated.

**Founder's decisions:**
| # | Question | Decision |
|---|---|---|
| Q1 | Frontend rendering | Vite + SSG (pre-render public routes; CSR admin) |
| Q2 | Contact form recipient | `hello@zoneforty5.tech` → forwarded to founder's Gmail via Cloudflare Email Routing |
| Q3 | Cloudflare Turnstile on contact + login | Yes |
| Q4 | DNS provider | Cloudflare |
| Q5 | Image hosting | Cloudflare R2 + pre-signed PUT URLs ("b-lite") — bucket `zf45-uploads`, public via `cdn.zoneforty5.tech` |
| Q6 | Blog body format | Markdown (`react-markdown` + `rehype-highlight`) |
| Q7 | Initial admin user bootstrap | Env-driven seed on first boot (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, optional `ADMIN_NAME`) |
| Q8 | EC2 instance | Provision fresh `t3.small` in `ap-south-1` (Ubuntu 24.04, 30 GiB gp3, EIP) |
| Q9 | Backup strategy | `pg_dump` nightly only at MVP (RPO 24h, S3 retention 30d) |
| Q10 | `www` redirect | `www.zoneforty5.tech` → apex (301) |

**Agents affected:** all specialist agents (Database, Backend, Frontend, DevOps, QA, Docs) — none had started yet, so no rework. They read the approved `architecture.md` + `api-contracts.md` + `db-schema.md` as their entry point.
**Status:** DONE.

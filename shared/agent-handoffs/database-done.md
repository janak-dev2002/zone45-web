# Database Agent Handoff — ZoneForty5

## Summary
The database schema has been fully implemented using `node-pg-migrate`. Seven SQL-first migrations have been created, covering all required entities and relationships. A robust seed script is included for development and testing.

**Feature Branch:** `database-agent-branch` (Pushed to remote)

---

## Migration Files (In Order)
1. `000_init_extensions.sql` — Initializes `pgcrypto`, `citext`, and `set_updated_at` function.
2. `001_admin_users.sql` — Creates `admin_users` table and trigger.
3. `002_portfolio_projects.sql` — Creates `portfolio_projects` table, index, and trigger.
4. `003_blog_posts.sql` — Creates `blog_posts` table, index, and trigger.
5. `004_tags.sql` — Creates `tags` table and trigger.
6. `005_post_tags.sql` — Creates `post_tags` join table and index.
7. `006_contact_submissions.sql` — Creates `contact_status` enum, table, and indexes.

---

## Table Definitions

### 1. `admin_users`
- `id`: UUID (PK)
- `email`: CITEXT (Unique)
- `password_hash`: TEXT (Argon2id)
- `name`: TEXT
- `last_login_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 2. `portfolio_projects`
- `id`: UUID (PK)
- `slug`: CITEXT (Unique)
- `title`: TEXT
- `description`: TEXT
- `body`: TEXT
- `tech_stack`: JSONB (Default: [])
- `outcome`: TEXT
- `project_url`: TEXT
- `cover_image_url`: TEXT
- `sort_order`: INT
- `published`: BOOLEAN
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 3. `blog_posts`
- `id`: UUID (PK)
- `slug`: CITEXT (Unique)
- `title`: TEXT
- `excerpt`: TEXT
- `body`: TEXT
- `cover_image_url`: TEXT
- `published`: BOOLEAN
- `published_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 4. `tags`
- `id`: UUID (PK)
- `slug`: CITEXT (Unique)
- `name`: TEXT
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 5. `post_tags`
- `post_id`: UUID (FK -> blog_posts.id)
- `tag_id`: UUID (FK -> tags.id)
- PK: `(post_id, tag_id)`

### 6. `contact_submissions`
- `id`: UUID (PK)
- `name`: TEXT
- `email`: CITEXT
- `subject`: TEXT
- `message`: TEXT
- `ip_address`: INET
- `user_agent`: TEXT
- `status`: ENUM (received, pending_email, emailed, email_failed)
- `email_attempts`: SMALLINT
- `last_email_error`: TEXT
- `created_at`: TIMESTAMPTZ

---

## Seed Data (`database/seed.js`)
- **Admin User:** Bootstrapped from env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_NAME`).
- **Sample Projects:** 3 entries (AI Analytics Dashboard, Blockchain Supply Chain, E-commerce Engine).
- **Sample Posts:** 3 entries (Future of AI, Scaling Node.js, Mastering TypeScript).
- **Tags:** 3 entries (React, TypeScript, Node.js) associated with sample posts.

---

## Deviations from `shared\db-schema.md`
- **Seeding:** Added sample portfolio projects and blog posts in the seed script as requested by the user prompt (overriding the "no placeholder content" note in the schema draft).
- **Dependencies:** Added `dotenv` to `database/package.json` to facilitate env-based seeding.
- **Migration Format:** Used `-- Up Migration` and `-- Down Migration` markers within single SQL files per migration as supported by `node-pg-migrate`.

---

## Next Steps for Backend Agent
- Use `DATABASE_URL` for connecting to the PostgreSQL 16 container.
- Run `npm run migrate:up` inside the `database/` directory to apply the schema.
- Run `npm run seed` to populate initial data.
- Ensure Zod schemas in the backend match the length constraints and regex patterns defined in the migrations.

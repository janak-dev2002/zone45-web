import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────────────

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens');

const urlSchema = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().max(2048).optional(),
);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(256),
  turnstileToken: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

// ── Contact ──────────────────────────────────────────────────────────────────

export const contactBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  message: z.string().min(10).max(5000),
  hpField: z.string().default(''),
  turnstileToken: z.string().min(1),
});

export type ContactBody = z.infer<typeof contactBodySchema>;

// ── Portfolio ─────────────────────────────────────────────────────────────────

export const portfolioBodySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(280),
  body: z.string().min(1).max(50000),
  techStack: z.array(z.string().min(1).max(40)).max(30).default([]),
  outcome: z.string().max(280).optional(),
  projectUrl: urlSchema,
  coverImageUrl: urlSchema,
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(false),
});

export type PortfolioBody = z.infer<typeof portfolioBodySchema>;

export const portfolioQuerySchema = paginationSchema;

// ── Posts ─────────────────────────────────────────────────────────────────────

export const postBodySchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(400),
  body: z.string().min(1).max(100000),
  coverImageUrl: urlSchema,
  published: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
});

export type PostBody = z.infer<typeof postBodySchema>;

export const postsQuerySchema = paginationSchema.extend({
  tag: z.string().optional(),
  status: z.enum(['draft', 'published']).optional(),
});

// ── Contact admin query ───────────────────────────────────────────────────────

export const contactQuerySchema = paginationSchema.extend({
  status: z.enum(['received', 'pending_email', 'emailed', 'email_failed']).optional(),
});

// ── Uploads ───────────────────────────────────────────────────────────────────

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const;

export const uploadSignBodySchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
});

export type UploadSignBody = z.infer<typeof uploadSignBodySchema>;

// ── Pagination helper ─────────────────────────────────────────────────────────

export { paginationSchema };
export type PaginationQuery = z.infer<typeof paginationSchema>;

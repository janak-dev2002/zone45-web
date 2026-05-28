/**
 * Shared Zod schemas and TypeScript types exported for use by both the
 * backend API (validation) and the frontend (type safety, no hand-typed
 * response interfaces needed).
 *
 * Frontend usage:
 *   import type { LoginBody, PortfolioBody } from '@zf45/shared-types';
 *   import { loginBodySchema } from '@zf45/shared-types';
 */

export {
  loginBodySchema,
  contactBodySchema,
  portfolioBodySchema,
  postBodySchema,
  uploadSignBodySchema,
  paginationSchema,
  portfolioQuerySchema,
  postsQuerySchema,
  contactQuerySchema,
} from '../../backend/src/lib/schemas';

export type {
  LoginBody,
  ContactBody,
  PortfolioBody,
  PostBody,
  UploadSignBody,
  PaginationQuery,
} from '../../backend/src/lib/schemas';

// ── Response types (inferred from API, used by frontend) ─────────────────────

import { z } from 'zod';

export const portfolioItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  techStack: z.array(z.string()),
  outcome: z.string().nullable(),
  projectUrl: z.string().url().nullable(),
  coverImageUrl: z.string().url().nullable(),
  sortOrder: z.number(),
  published: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PortfolioItem = z.infer<typeof portfolioItemSchema>;

export const portfolioDetailSchema = portfolioItemSchema.extend({
  body: z.string(),
});

export type PortfolioDetail = z.infer<typeof portfolioDetailSchema>;

export const tagSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export type Tag = z.infer<typeof tagSchema>;

export const postItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  coverImageUrl: z.string().url().nullable(),
  publishedAt: z.string().nullable(),
  tags: z.array(tagSchema),
});

export type PostItem = z.infer<typeof postItemSchema>;

export const postDetailSchema = postItemSchema.extend({
  body: z.string(),
  published: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PostDetail = z.infer<typeof postDetailSchema>;

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  lastLoginAt: z.string().nullable(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const paginationResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export type PaginationResponse = z.infer<typeof paginationResponseSchema>;

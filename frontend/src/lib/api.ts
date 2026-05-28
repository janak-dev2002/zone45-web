import type {
  PortfolioItem,
  PortfolioDetail,
  PostItem,
  PostDetail,
  AdminUser,
  Tag,
  PaginationResponse,
  LoginBody,
  ContactBody,
  PortfolioBody,
  PostBody,
  UploadSignBody,
} from '@zf45/shared-types'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api'

interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ZF45ApiError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>
  retryAfter?: number

  constructor(status: number, error: ApiError, retryAfter?: number) {
    super(error.message)
    this.code = error.code
    this.status = status
    this.details = error.details
    this.retryAfter = retryAfter
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (res.status === 204) return undefined as T

  const body = await res.json()

  if (!res.ok) {
    const retryAfter = res.headers.get('Retry-After')
    throw new ZF45ApiError(
      res.status,
      body.error || { code: 'UNKNOWN', message: 'Unknown error' },
      retryAfter ? Number(retryAfter) : undefined,
    )
  }

  return body
}

// ── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationResponse
}

export interface SingleResponse<T> {
  data: T
}

// ── Public: Portfolio ──────────────────────────────────────────────────────

export function getPortfolio(page = 1, pageSize = 20) {
  return request<PaginatedResponse<PortfolioItem>>(
    `/portfolio?page=${page}&pageSize=${pageSize}`
  )
}

export function getPortfolioItem(slug: string) {
  return request<SingleResponse<PortfolioDetail>>(`/portfolio/${slug}`)
}

// ── Public: Posts ──────────────────────────────────────────────────────────

export function getPosts(page = 1, pageSize = 20, tag?: string) {
  const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : ''
  return request<PaginatedResponse<PostItem>>(
    `/posts?page=${page}&pageSize=${pageSize}${tagParam}`
  )
}

export function getPost(slug: string) {
  return request<SingleResponse<PostDetail>>(`/posts/${slug}`)
}

export function getTags() {
  return request<SingleResponse<(Tag & { postCount: number })[]>>('/posts/tags')
}

// ── Public: Contact ────────────────────────────────────────────────────────

export function submitContact(body: ContactBody) {
  return request<SingleResponse<{ status: string; submissionId: string }>>('/contact', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ── Auth ───────────────────────────────────────────────────────────────────

export function login(body: LoginBody) {
  return request<SingleResponse<{ user: AdminUser }>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function logout() {
  return request<undefined>('/auth/logout', { method: 'POST' })
}

export function refreshToken() {
  return request<SingleResponse<{ refreshed: boolean }>>('/auth/refresh', { method: 'POST' })
}

export function getMe() {
  return request<SingleResponse<AdminUser>>('/auth/me')
}

// ── Admin: Portfolio ───────────────────────────────────────────────────────

export function adminGetPortfolio(page = 1, pageSize = 20) {
  return request<PaginatedResponse<PortfolioItem & { published: boolean }>>(
    `/admin/portfolio?page=${page}&pageSize=${pageSize}`
  )
}

export function adminGetPortfolioItem(id: string) {
  return request<SingleResponse<PortfolioDetail & { published: boolean }>>(`/admin/portfolio/${id}`)
}

export function adminCreatePortfolio(body: PortfolioBody) {
  return request<SingleResponse<PortfolioDetail & { published: boolean }>>('/admin/portfolio', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function adminUpdatePortfolio(id: string, body: PortfolioBody) {
  return request<SingleResponse<PortfolioDetail & { published: boolean }>>(`/admin/portfolio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function adminDeletePortfolio(id: string) {
  return request<undefined>(`/admin/portfolio/${id}`, { method: 'DELETE' })
}

// ── Admin: Posts ───────────────────────────────────────────────────────────

export function adminGetPosts(page = 1, pageSize = 20, status?: string) {
  const statusParam = status ? `&status=${status}` : ''
  return request<PaginatedResponse<PostDetail>>(
    `/admin/posts?page=${page}&pageSize=${pageSize}${statusParam}`
  )
}

export function adminGetPost(id: string) {
  return request<SingleResponse<PostDetail>>(`/admin/posts/${id}`)
}

export function adminCreatePost(body: PostBody) {
  return request<SingleResponse<PostDetail>>('/admin/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function adminUpdatePost(id: string, body: PostBody) {
  return request<SingleResponse<PostDetail>>(`/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function adminDeletePost(id: string) {
  return request<undefined>(`/admin/posts/${id}`, { method: 'DELETE' })
}

// ── Admin: Contact submissions ─────────────────────────────────────────────

interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  messagePreview: string
  status: string
  ipAddress: string
  createdAt: string
}

interface ContactSubmissionDetail extends ContactSubmission {
  message: string
  userAgent: string
  emailAttempts: number
}

export function adminGetContacts(page = 1, pageSize = 20, status?: string) {
  const statusParam = status ? `&status=${status}` : ''
  return request<PaginatedResponse<ContactSubmission>>(
    `/admin/contact?page=${page}&pageSize=${pageSize}${statusParam}`
  )
}

export function adminGetContact(id: string) {
  return request<SingleResponse<ContactSubmissionDetail>>(`/admin/contact/${id}`)
}

// ── Admin: Uploads ─────────────────────────────────────────────────────────

export function signUpload(body: UploadSignBody) {
  return request<SingleResponse<{
    uploadUrl: string
    publicUrl: string
    expiresInSec: number
    method: string
    headers: Record<string, string>
  }>>('/admin/uploads/sign', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function uploadFile(file: File): Promise<string> {
  const { data } = await signUpload({
    filename: file.name,
    contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/svg+xml',
    sizeBytes: file.size,
  })

  await fetch(data.uploadUrl, {
    method: data.method,
    body: file,
    headers: data.headers,
  })

  return data.publicUrl
}

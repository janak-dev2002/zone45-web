/**
 * Generate sitemap.xml after the SSG build.
 * Fetches portfolio and post slugs from the API (if available) to include
 * dynamic routes. Falls back to static routes only if the API is unreachable.
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const BASE_URL = process.env.VITE_API_URL
  ? process.env.VITE_API_URL.replace('/api', '')
  : 'https://zoneforty5.tech'
const API_BASE = process.env.VITE_API_URL || 'http://localhost:8080/api'

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/work', priority: '0.9', changefreq: 'weekly' },
  { path: '/notes', priority: '0.9', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/contact', priority: '0.8', changefreq: 'monthly' },
]

async function fetchSlugs() {
  try {
    const [portfolioRes, postsRes] = await Promise.all([
      fetch(`${API_BASE}/portfolio?pageSize=100`).catch(() => null),
      fetch(`${API_BASE}/posts?pageSize=100`).catch(() => null),
    ])

    const portfolioSlugs = portfolioRes?.ok
      ? (await portfolioRes.json()).data.map(i => i.slug)
      : []

    const postSlugs = postsRes?.ok
      ? (await postsRes.json()).data.map(i => i.slug)
      : []

    return { portfolioSlugs, postSlugs }
  } catch {
    return { portfolioSlugs: [], postSlugs: [] }
  }
}

async function main() {
  const { portfolioSlugs, postSlugs } = await fetchSlugs()
  const now = new Date().toISOString().slice(0, 10)

  const allRoutes = [
    ...STATIC_ROUTES,
    ...portfolioSlugs.map(s => ({ path: `/work/${s}`, priority: '0.8', changefreq: 'monthly' })),
    ...postSlugs.map(s => ({ path: `/notes/${s}`, priority: '0.7', changefreq: 'monthly' })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(r => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`

  writeFileSync(join(DIST, 'sitemap.xml'), xml)
  console.log(`sitemap.xml written — ${allRoutes.length} routes`)
}

main().catch(err => {
  console.error('sitemap generation failed:', err)
  process.exit(0) // Non-fatal — build still succeeds
})

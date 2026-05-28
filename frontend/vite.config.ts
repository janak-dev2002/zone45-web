import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  ssr: {
    noExternal: ['react-helmet-async'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@zf45/shared-types': path.resolve(__dirname, '../shared-types/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    includedRoutes: async (paths) => {
      const apiBase = process.env.VITE_API_URL || 'http://localhost:8080/api'
      const staticRoutes = paths.filter(
        (p) => !p.includes(':') && !p.startsWith('/admin')
      )

      try {
        const [portfolioRes, postsRes] = await Promise.all([
          fetch(`${apiBase}/portfolio?pageSize=100`).catch(() => null),
          fetch(`${apiBase}/posts?pageSize=100`).catch(() => null),
        ])

        const portfolioPaths: string[] = []
        const postPaths: string[] = []

        if (portfolioRes?.ok) {
          const portfolioData = await portfolioRes.json()
          portfolioPaths.push(
            ...portfolioData.data.map((item: { slug: string }) => `/work/${item.slug}`)
          )
        }

        if (postsRes?.ok) {
          const postsData = await postsRes.json()
          postPaths.push(
            ...postsData.data.map((item: { slug: string }) => `/notes/${item.slug}`)
          )
        }

        return [...staticRoutes, ...portfolioPaths, ...postPaths]
      } catch {
        return staticRoutes
      }
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync, writeFileSync, readdirSync } from 'fs'

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
    onFinished: (dir) => {
      // vite-react-ssg injects window.__VITE_REACT_SSG_HASH__ as an inline <script>.
      // The production CSP (script-src 'self') blocks inline scripts, so the global
      // is never set, the client requests manifest-undefined.json, and every page
      // crashes with a JSON parse error. Fix: move the assignment into a same-origin
      // .js file that CSP 'self' allows, then rewrite every SSG HTML page to load it.
      const outDir = path.resolve(String(dir))
      let indexHtml: string
      try {
        indexHtml = readFileSync(path.join(outDir, 'index.html'), 'utf-8')
      } catch {
        return
      }
      const match = indexHtml.match(
        /<script>window\.__VITE_REACT_SSG_HASH__ = '([^']+)'<\/script>/,
      )
      const hash = match?.[1]
      if (!hash) return

      const hashFile = `ssg-init-${hash}.js`
      writeFileSync(
        path.join(outDir, 'assets', hashFile),
        `window.__VITE_REACT_SSG_HASH__='${hash}'`,
      )

      const inlineScript = `<script>window.__VITE_REACT_SSG_HASH__ = '${hash}'</script>`
      const externalScript = `<script src="/assets/${hashFile}"></script>`
      // React Router's StaticRouterProvider injects window.__staticRouterHydrationData
      // as a <script> inside <div id="root">, but the browser-side RouterProvider only
      // renders {null} at that position.  React's hydrateRoot finds the extra <script>
      // DOM node with no matching fiber and throws errors #418/#423/#425 on every page.
      // Fix: hoist the script outside the root div so React never sees it during hydration.
      const routerDataScriptRe = /(<script>window\.__staticRouterHydrationData[^<]*<\/script>)(<\/div>)/
      for (const file of readdirSync(outDir).filter((f) => (f as string).endsWith('.html'))) {
        const filePath = path.join(outDir, String(file))
        let html = readFileSync(filePath, 'utf-8')
        if (html.includes(inlineScript)) {
          html = html.replace(inlineScript, externalScript)
        }
        // Move __staticRouterHydrationData script outside #root
        html = html.replace(routerDataScriptRe, '$2\n$1')
        writeFileSync(filePath, html)
      }
    },
  },
})

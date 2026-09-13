import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('.', import.meta.url))

// Vite dev server only maps exact static-file requests (/admin, /admin.html)
// to admin.html. AdminApp.tsx's own BrowserRouter then pushes deeper paths
// like /admin/login via client-side history -- fine until a refresh or a
// direct link hits the server for that path, which falls through to Vite's
// default SPA fallback (always index.html, i.e. the CONSUMER app). This
// registers as a plain (non-post) hook so it runs BEFORE that built-in
// fallback middleware, rewriting any /admin* request to admin.html first.
// Dev-server-only: production hosting for this same two-bundle split is a
// still-open decision per AdminApp.tsx's own comment (separate origin vs.
// server rewrite rules), not something to guess at here.
function adminSpaFallback(): Plugin {
  return {
    name: 'admin-spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname === '/admin' || pathname?.startsWith('/admin/')) {
          req.url = '/admin.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [adminSpaFallback(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two independent single-page apps built from one codebase: the
      // consumer app (index.html) and the staff support console
      // (admin.html). Serving them from separate origins/subdomains is a
      // hosting decision made at deploy time (still open) -- this just
      // produces two outputs that CAN be deployed separately, satisfying
      // FR-11.3's isolation intent at the build level.
      input: {
        main: `${root}index.html`,
        admin: `${root}admin.html`,
      },
    },
  },
})

import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [tailwindcss()],
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

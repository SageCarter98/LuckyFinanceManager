import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Separate from vite.config.ts deliberately: the app config's two-entry
// `build.rollupOptions.input` (main.tsx / admin-main.tsx) is a build-only
// concern that means nothing to the test runner, and mixing it in risks
// vitest trying to resolve admin.html/index.html as test entries.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    restoreMocks: true,
    // Default 5s is tight once several files run in parallel and each
    // spins up its own jsdom environment (userEvent-driven form fills in
    // particular can cross it under load) -- these tests are not
    // individually slow, the full-suite run just contends for CPU.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})

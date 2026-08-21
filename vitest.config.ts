import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Plain node, no Nuxt runtime — Nuxt generated aliases `#shared` and `~~` have to be restated below.
// Anything under test/db/ hits the real Postgres: `npm run db:up` first.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['dotenv/config'], // Loads `.env` before any test module imported
  },
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url)), // project root
    },
  },
})

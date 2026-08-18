import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests only — pure modules, no Nuxt runtime.
// `#shared` is a Nuxt-generated alias, so it has to be restated here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
})

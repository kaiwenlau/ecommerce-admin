// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt', 'nuxt-auth-utils', '@nuxt/eslint'],
  devtools: { enabled: true },
  // Tailwind v4 + Nuxt UI theme entry point
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  // Stylistic rules on, so ESLint also handles formatting and we don't need Prettier.
  eslint: {
    config: { stylistic: true },
  },
})

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { user, clear } = useUserSession()
const route = useRoute()

const isLoggingOut = ref(false)

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/',
    active: route.path === '/',
  },
  {
    label: 'Products',
    icon: 'i-lucide-package',
    to: '/products',
    active: route.path === '/products' || route.path.startsWith('/products/'),
  },
])

const onLogout = async () => {
  isLoggingOut.value = true
  await $fetch('/api/auth/logout', {
    method: 'POST',
  })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <div class="max-w-6xl mx-auto w-full px-6 py-3 flex items-center gap-6">
        <UNavigationMenu
          highlight
          :items="navItems"
        />

        <div class="ml-auto flex items-center gap-3">
          <span class="text-sm text-muted hidden sm:inline">{{ user?.email }}</span>
          <UButton
            color="neutral"
            variant="subtle"
            size="sm"
            :loading="isLoggingOut"
            @click="onLogout"
          >
            Sign out
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
      <slot />
    </main>
  </div>
</template>

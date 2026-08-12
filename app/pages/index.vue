<script setup lang="ts">
useHead({ title: 'Dashboard' })
const { user, clear } = useUserSession()
const isLoggingOut = ref(false)

async function onLogout() {
  isLoggingOut.value = true
  await $fetch('/api/auth/logout', {
    method: 'POST',
  })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold">
            Dashboard
          </h1>
          <p class="text-sm text-muted mt-1">
            Signed in as {{ user?.email }}
          </p>
        </div>

        <UButton
          color="neutral"
          variant="subtle"
          :loading="isLoggingOut"
          @click="onLogout"
        >
          Sign out
        </UButton>
      </div>

      <UCard>
        <p class="text-sm text-muted">
          The product list arrives this afternoon.
        </p>
      </UCard>
    </div>
  </div>
</template>

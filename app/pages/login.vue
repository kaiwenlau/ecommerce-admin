<script setup lang="ts">
import { MESSAGES } from '#shared/constants'
import { loginSchema } from '#shared/schemas/auth'
import type { FetchError } from 'ofetch'

definePageMeta({
  public: true,
  layout: false,
})

useHead({ title: 'Sign in' })
const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const errorMessage = ref('')
const isPending = ref(false)
const credentials = reactive({
  email: '',
  password: '',
})

const onLogin = async () => {
  errorMessage.value = ''
  isPending.value = true

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })

    // Refresh so useUserSession()'s `loggedIn` ref updated before the route guard runs
    await refreshSession()
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await navigateTo(redirect)
  }
  catch (error) {
    const fetchError = error as FetchError
    errorMessage.value = fetchError.data?.message ?? MESSAGES.unexpected
  }
  finally {
    isPending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">
          Sign in
        </h1>
        <p class="text-sm text-muted mt-1">
          Admin access to the dashboard.
        </p>
      </template>

      <UForm
        :schema="loginSchema"
        :state="credentials"
        class="space-y-4"
        @submit.prevent="onLogin"
      >
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          :title="errorMessage"
        />

        <UFormField
          label="Email"
          name="email"
        >
          <UInput
            v-model="credentials.email"
            type="email"
            autocomplete="username"
            placeholder="admin@example.com"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField
          label="Password"
          name="password"
        >
          <UInput
            v-model="credentials.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          :loading="isPending"
        >
          Sign in
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>

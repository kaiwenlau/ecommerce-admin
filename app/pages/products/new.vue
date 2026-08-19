<script setup lang="ts">
import { MESSAGES } from '#shared/constants'
import type { ProductCreateInput } from '#shared/schemas/product'

useHead({ title: 'New product' })

const toast = useToast()
const { handleUnauthorized } = useUnauthorized()

const form = useTemplateRef('form')
const pending = ref(false)
const pageError = ref('')

const onSubmit = async (values: ProductCreateInput) => {
  pending.value = true
  pageError.value = ''

  try {
    await $fetch('/api/products', { method: 'POST', body: values })
    toast.add({ title: MESSAGES.productCreated, color: 'success' })
    await navigateTo('/products')
  }
  catch (error) {
    // 3 outcomes, checked in order.
    const fieldErrors = toFormErrors(error)
    if (fieldErrors.length) {
      form.value?.setErrors(fieldErrors) // 1. field error under the box
    }
    else if (!await handleUnauthorized(error)) { // 2. unauthorised get 401 and redirect, return true
      pageError.value = errorMessage(error) // 3. authorised, no redirect, page-level alert
    }
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div class="flex items-center gap-3">
      <UButton
        to="/products"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        square
        aria-label="Back to products"
      />
      <h1 class="text-2xl font-semibold">
        New product
      </h1>
    </div>

    <UAlert
      v-if="pageError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="pageError"
    />

    <ProductForm
      ref="form"
      submit-label="Create product"
      :pending="pending"
      @submit="onSubmit"
    />
  </div>
</template>

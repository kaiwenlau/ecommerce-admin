<script setup lang="ts">
import { MESSAGES } from '#shared/constants'
import type { ProductCreateInput } from '#shared/schemas/product'
import type { ProductDetail } from '~~/server/api/products/[id].get'

const route = useRoute()
const toast = useToast()
const { handleUnauthorized } = useUnauthorized()

const id = computed(() => route.params.id as string)

// lazy: the page frame renders straight away and the four states are handled below,
// rather than the whole navigation blocking on Postgres.
const { data: product, status, error, refresh } = await useFetch<ProductDetail>(() => productPath(id.value), {
  lazy: true,
})

useHead(() => ({ title: product.value ? `Edit ${product.value.name}` : 'Edit product' }))

const form = useTemplateRef('form')
const pending = ref(false)
const pageError = ref('')

const isLoading = computed(() => status.value === 'pending')
const isMissing = computed(() => error.value?.statusCode === 404) // soft-deleted product

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

const onSubmit = async (values: ProductCreateInput) => {
  pending.value = true
  pageError.value = ''

  try {
    await $fetch<{ id: number }>(productPath(id.value), { method: 'PATCH', body: values })
    toast.add({ title: MESSAGES.productUpdated, color: 'success' })
    await navigateTo('/products')
  }
  catch (err) {
    const fieldErrors = toFormErrors(err)
    if (fieldErrors.length) {
      form.value?.setErrors(fieldErrors)
    }
    else if (!await handleUnauthorized(err)) {
      // Covers the 409 from the archive guard, when the status is moved to `archived` here.
      pageError.value = errorMessage(err)
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
        {{ product?.name ?? 'Edit product' }}
      </h1>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <USkeleton
          v-for="n in 6"
          :key="n"
          class="h-14 w-full"
        />
      </div>
      <USkeleton class="h-24 w-full" />
    </div>

    <!-- Not found -->
    <UAlert
      v-else-if="isMissing"
      color="neutral"
      variant="subtle"
      icon="i-lucide-search-x"
      :title="MESSAGES.productNotFound"
      description="It may have been deleted."
      :actions="[{ label: 'Back to products', color: 'neutral', variant: 'solid', to: '/products' }]"
    />

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="MESSAGES.productLoadFailed"
      :description="error.statusMessage || error.message"
      :actions="[{ label: MESSAGES.retry, color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <!-- Loaded -->
    <template v-else-if="product">
      <UAlert
        v-if="pageError"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="pageError"
      />

      <ProductForm
        ref="form"
        :initial="product"
        submit-label="Save changes"
        :pending="pending"
        @submit="onSubmit"
      />
    </template>
  </div>
</template>

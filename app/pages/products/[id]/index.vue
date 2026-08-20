<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { MESSAGES } from '#shared/constants'
import type { ProductDetailResponse } from '~~/server/api/products/[id]/detail.get'

const route = useRoute()
const toast = useToast()
const { handleUnauthorized } = useUnauthorized()

const id = computed(() => route.params.id as string)

/**
 * Calls `GET /api/products/:id/detail`.
 *
 * `GET /api/products/:id` would 404 here for deleted product.
 *
 * Two endpoints rather than one route with a query flag.
 * The reasoning is in the header of server/api/products/[id]/detail.get.ts.
 */
const { data, status, error, refresh } = await useFetch<ProductDetailResponse>(
  () => productPath(id.value, 'detail'),
  { lazy: true },
)

useHead(() => ({ title: data.value ? data.value.product.name : 'Product' }))

const isLoading = computed(() => status.value === 'pending')
const isMissing = computed(() => error.value?.statusCode === 404)
const product = computed(() => data.value?.product)
const isDeleted = computed(() => !!product.value?.deletedAt)

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

/**
 * For feature only available on DEV env.
 * e.g.: Restore button on product detail page, to restore deleted product.
 * These feature(s) is a DEVELOPMENT convenience. Else the only way is to run `npm run db:reset`.
 *
 * `import.meta.dev` is replaced by a literal at build time.
 * Thus the button is compiled out of a production bundle rather than merely hidden.
 */
const isDev = import.meta.dev
const restoring = ref(false)
const pageError = ref('')

const onRestore = async () => {
  restoring.value = true
  pageError.value = ''

  try {
    await $fetch<{ id: number }>(productPath(id.value, 'undelete'), { method: 'POST' })
    toast.add({ title: MESSAGES.productRestored, color: 'success' })
    await refresh()
  }
  catch (err) {
    // other live product has claimed the SKU in the meantime, throw 409
    if (!await handleUnauthorized(err)) pageError.value = errorMessage(err)
  }
  finally {
    restoring.value = false
  }
}

type BuyerRow = NonNullable<typeof data.value>['buyers'][number]

const buyerColumns: TableColumn<BuyerRow>[] = [
  { accessorKey: 'name', header: 'Customer' },
  { accessorKey: 'orders', header: 'Orders' },
  { accessorKey: 'unitCount', header: 'Units', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'totalSpentCents', header: 'Paid', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'lastPurchaseAt', header: 'Last bought' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
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
        {{ product?.name ?? 'Product' }}
      </h1>

      <UBadge
        v-if="product && !isDeleted"
        :color="PRODUCT_STATUS_COLOR[product.status]"
        variant="subtle"
      >
        {{ product.status }}
      </UBadge>

      <UButton
        v-if="product && !isDeleted"
        :to="`/products/${product.id}/edit`"
        color="neutral"
        variant="subtle"
        icon="i-lucide-pencil"
        class="ml-auto"
      >
        Edit
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-28 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <!-- Not found banner box -->
    <UAlert
      v-else-if="isMissing"
      color="neutral"
      variant="subtle"
      icon="i-lucide-search-x"
      :title="MESSAGES.productNotFound"
      description="No product has ever had this id."
      :actions="[{ label: 'Back to products', color: 'neutral', variant: 'solid', to: '/products' }]"
    />

    <!-- Error banner box -->
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
    <template v-else-if="data && product">
      <UAlert
        v-if="pageError"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="pageError"
      />

      <!-- Deleted banner box: restore button only available during DEV -->
      <UAlert
        v-if="isDeleted"
        color="warning"
        variant="subtle"
        icon="i-lucide-trash-2"
        :title="`Deleted ${formatDate(product.deletedAt!)}`"
        :description="MESSAGES.productDeletedBanner"
        :actions="isDev
          ? [{ label: 'Restore', color: 'warning', variant: 'solid', loading: restoring, onClick: onRestore }]
          : []"
      />

      <!-- Product Information Section: displayed in Card -->
      <UCard>
        <dl class="grid gap-6 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-muted">
              Price
            </dt>
            <dd class="text-lg font-semibold">
              {{ formatCents(product.priceCents) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Stock
            </dt>
            <dd
              class="text-lg font-semibold"
              :class="product.stock === 0 ? 'text-error' : undefined"
            >
              {{ product.stock === 0 ? 'Out of stock' : product.stock }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              SKU
            </dt>
            <dd class="text-lg font-mono">
              {{ product.sku }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Category
            </dt>
            <dd class="text-lg">
              {{ product.category }}
            </dd>
          </div>
        </dl>

        <template #footer>
          <p class="text-sm whitespace-pre-line">
            {{ product.description || 'No description.' }}
          </p>
        </template>
      </UCard>

      <!-- Customer Tracing Section: displayed in Table -->
      <div class="space-y-3">
        <div class="flex items-baseline gap-3">
          <h2 class="text-lg font-semibold">
            Who bought this
          </h2>
          <p
            v-if="data.totals.customerCount"
            class="text-sm text-muted"
          >
            {{ data.totals.customerCount }} customer{{ data.totals.customerCount === 1 ? '' : 's' }},
            {{ data.totals.unitCount }} unit{{ data.totals.unitCount === 1 ? '' : 's' }},
            {{ formatCents(data.totals.revenueCents) }} total
          </p>
        </div>

        <UTable
          :data="data.buyers"
          :columns="buyerColumns"
          class="border border-default rounded-lg"
        >
          <template #name-cell="{ row }">
            <ULink
              :to="`/customers/${row.original.customerId}`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.name }}
            </ULink>
            <p class="text-sm text-muted">
              {{ row.original.email }}
            </p>
          </template>

          <template #orders-cell="{ row }">
            <div class="flex flex-wrap gap-2">
              <ULink
                v-for="order in row.original.orders"
                :key="order.id"
                :to="`/orders/${order.id}`"
                class="text-sm text-primary hover:underline"
              >
                #{{ order.id }}
              </ULink>
            </div>
          </template>

          <template #totalSpentCents-cell="{ row }">
            {{ formatCents(row.original.totalSpentCents) }}
          </template>

          <template #lastPurchaseAt-cell="{ row }">
            {{ formatDate(row.original.lastPurchaseAt) }}
          </template>

          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              {{ MESSAGES.noBuyers }}
            </p>
          </template>
        </UTable>
      </div>
    </template>
  </div>
</template>

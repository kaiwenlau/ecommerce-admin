<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { MESSAGES } from '#shared/constants'
import type { CustomerDetailResponse } from '~~/server/api/customers/[id].get'

const route = useRoute()
const { handleUnauthorized } = useUnauthorized()

const id = computed(() => route.params.id as string)

const { data: customer, status, error, refresh } = await useFetch<CustomerDetailResponse>(
  () => customerPath(id.value),
  { lazy: true },
)

useHead(() => ({ title: customer.value ? customer.value.name : 'Customer' }))

const isLoading = computed(() => status.value === 'pending')
const isMissing = computed(() => error.value?.statusCode === 404)

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

type OrderRow = NonNullable<typeof customer.value>['orders'][number]

const columns: TableColumn<OrderRow>[] = [
  { accessorKey: 'id', header: 'Order' },
  { accessorKey: 'createdAt', header: 'When' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'itemCount', header: 'Items', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'totalCents', header: 'Total', meta: { class: { th: 'text-right', td: 'text-right' } } },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <UButton
        to="/customers"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        square
        aria-label="Back to customers"
      />
      <h1 class="text-2xl font-semibold">
        {{ customer?.name ?? 'Customer' }}
      </h1>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="space-y-4"
    >
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <!-- Not found -->
    <UAlert
      v-else-if="isMissing"
      color="neutral"
      variant="subtle"
      icon="i-lucide-search-x"
      :title="MESSAGES.customerNotFound"
      description="No customer has this id."
      :actions="[{ label: 'Back to customers', color: 'neutral', variant: 'solid', to: '/customers' }]"
    />

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="MESSAGES.customerLoadFailed"
      :description="error.statusMessage || error.message"
      :actions="[{ label: MESSAGES.retry, color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <!-- Loaded -->
    <template v-else-if="customer">
      <UCard>
        <dl class="grid gap-6 sm:grid-cols-4">
          <div>
            <dt class="text-sm text-muted">
              Email
            </dt>
            <dd class="text-lg">
              {{ customer.email }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Orders
            </dt>
            <dd class="text-lg font-semibold">
              {{ customer.totals.orderCount }}
              <span
                v-if="customer.totals.cancelledCount"
                class="text-sm font-normal text-muted"
              >
                + {{ customer.totals.cancelledCount }} cancelled
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Total spent
            </dt>
            <dd class="text-lg font-semibold">
              {{ formatCents(customer.totals.totalSpentCents) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Customer since
            </dt>
            <dd class="text-lg">
              {{ formatDate(customer.createdAt) }}
            </dd>
          </div>
        </dl>
      </UCard>

      <!-- What they bought -->
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">
          What they bought
        </h2>

        <UTable
          :data="customer.orders"
          :columns="columns"
          class="border border-default rounded-lg"
        >
          <template #id-cell="{ row }">
            <ULink
              :to="`/orders/${row.original.id}`"
              class="font-medium text-primary hover:underline"
            >
              #{{ row.original.id }}
            </ULink>
          </template>

          <template #createdAt-cell="{ row }">
            {{ formatDate(row.original.createdAt) }}
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :color="ORDER_STATUS_COLOR[row.original.status]"
              variant="subtle"
            >
              {{ row.original.status }}
            </UBadge>
          </template>

          <template #totalCents-cell="{ row }">
            {{ formatCents(row.original.totalCents) }}
          </template>

          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              {{ MESSAGES.noOrders }}
            </p>
          </template>
        </UTable>
      </div>
    </template>
  </div>
</template>

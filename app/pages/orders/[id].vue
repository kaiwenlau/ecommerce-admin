<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { MESSAGES } from '#shared/constants'
import type { OrderDetailResponse } from '~~/server/api/orders/[id].get'

const route = useRoute()
const { handleUnauthorized } = useUnauthorized()

const id = computed(() => route.params.id as string)

const { data: order, status, error, refresh } = await useFetch<OrderDetailResponse>(
  () => orderPath(id.value),
  { lazy: true },
)

useHead(() => ({ title: order.value ? `Order #${order.value.id}` : 'Order' }))

const isLoading = computed(() => status.value === 'pending')
const isMissing = computed(() => error.value?.statusCode === 404)

/**
 * `Order.totalCents` was written when the order was placed; `lineSumCents` re-adds the lines now.
 * They should always agree. Showing the disagreement beats silently picking one —
 *    a mismatch means the data is wrong, and this page is where it would be noticed.
 */
const totalsDisagree = computed(() =>
  !!order.value && order.value.totalCents !== order.value.lineSumCents,
)

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

type ItemRow = NonNullable<typeof order.value>['items'][number]

const columns: TableColumn<ItemRow>[] = [
  { accessorKey: 'name', header: 'Product' },
  { accessorKey: 'unitPriceCents', header: 'Price paid', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'qty', header: 'Qty', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'lineTotalCents', header: 'Line total', meta: { class: { th: 'text-right', td: 'text-right' } } },
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
        Order #{{ order?.id ?? id }}
      </h1>
      <UBadge
        v-if="order"
        :color="ORDER_STATUS_COLOR[order.status]"
        variant="subtle"
      >
        {{ order.status }}
      </UBadge>
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
      :title="MESSAGES.orderNotFound"
      description="No order has this id."
      :actions="[{ label: 'Back to customers', color: 'neutral', variant: 'solid', to: '/customers' }]"
    />

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="MESSAGES.orderLoadFailed"
      :description="error.statusMessage || error.message"
      :actions="[{ label: MESSAGES.retry, color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <!-- Loaded -->
    <template v-else-if="order">
      <UCard>
        <dl class="grid gap-6 sm:grid-cols-3">
          <div>
            <dt class="text-sm text-muted">
              Customer
            </dt>
            <dd class="text-lg">
              <ULink
                :to="`/customers/${order.customer.id}`"
                class="font-medium text-primary hover:underline"
              >
                {{ order.customer.name }}
              </ULink>
              <p class="text-sm text-muted">
                {{ order.customer.email }}
              </p>
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Placed
            </dt>
            <dd class="text-lg">
              {{ formatDateTime(order.createdAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted">
              Total
            </dt>
            <dd class="text-lg font-semibold">
              {{ formatCents(order.totalCents) }}
            </dd>
          </div>
        </dl>
      </UCard>

      <!-- Order total does not match -->
      <UAlert
        v-if="totalsDisagree"
        color="error"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="This order's total does not match its lines"
        :description="`Stored total ${formatCents(order.totalCents)}, lines add up to ${formatCents(order.lineSumCents)}.`"
      />

      <!-- Line items -->
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">
          Items
        </h2>

        <UTable
          :data="order.items"
          :columns="columns"
          class="border border-default rounded-lg"
        >
          <template #name-cell="{ row }">
            <ULink
              :to="`/products/${row.original.productId}`"
              class="font-medium text-primary hover:underline"
            >
              {{ row.original.name }}
            </ULink>

            <!-- Product deleted badge -->
            <UBadge
              v-if="row.original.productDeleted"
              color="warning"
              variant="subtle"
              size="sm"
              class="ml-2"
            >
              deleted
            </UBadge>
          </template>

          <template #unitPriceCents-cell="{ row }">
            {{ formatCents(row.original.unitPriceCents) }}
          </template>

          <template #lineTotalCents-cell="{ row }">
            {{ formatCents(row.original.lineTotalCents) }}
          </template>

          <template #empty>
            <p class="py-8 text-center text-sm text-muted">
              This order has no line items.
            </p>
          </template>
        </UTable>
      </div>

      <!-- Audit trail. Day 5 turns this into a timeline and adds the status control. -->
      <div class="space-y-3">
        <h2 class="text-lg font-semibold">
          Status history
        </h2>

        <UCard v-if="order.statusEvents.length">
          <ul class="space-y-2 text-sm">
            <li
              v-for="event in order.statusEvents"
              :key="event.id"
              class="flex flex-wrap items-center gap-2"
            >
              <span class="text-muted">{{ formatDateTime(event.createdAt) }}</span>
              <span>
                {{ event.fromStatus ?? 'created' }} → <strong>{{ event.toStatus }}</strong>
              </span>
              <span class="text-muted">by {{ event.changedBy }}</span>
            </li>
          </ul>
        </UCard>

        <UCard v-else>
          <p class="text-sm text-muted">
            No status changes recorded.
          </p>
        </UCard>
      </div>
    </template>
  </div>
</template>

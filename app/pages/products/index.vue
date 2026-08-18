<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS, TABLE_SKELETON_ROWS } from '#shared/constants'
import { PRODUCT_STATUSES } from '#shared/schemas/product'
import type { ProductListQuery, ProductStatus } from '#shared/schemas/product'

useHead({ title: 'Products' })

const route = useRoute()
const { clear: clearSession } = useUserSession()
const { query, setSearch, setStatus, setSort, setPage, reset } = useTableQuery()

/**
 * Bound to `@update:model-value` - only fires on real typing.
 *
 * 2 writers: user typing, and watcher below that refills box after 'Back' / pasted link.
 *
 * If fired on refill: 'Back' onto `?search=shirt&page=3` would land on page 1 (triggered `setSearch`, `patch()` resets page).
 */
const pushSearch = useDebounceFn(
  (value: string | number) => setSearch(String(value)),
  SEARCH_DEBOUNCE_MS,
)

// query: reactive - search, filter, sort and page - refetches on every URL change
// lazy: non-blocking - use `status` to handle loading state - show skeleton
const { data, status, error, refresh } = await useFetch('/api/products', {
  query,
  lazy: true,
})

// 'Back' and pasted link refill the box.
watch(() => query.value.search, (value) => {
  if (value !== searchInput.value) searchInput.value = value
})

// Watcher on query - computed that yields new object whenever URL changes
// Covers search, filter, sort, page together
watch(query, () => {
  rowSelection.value = {}
})

// Unauthorised - handle a session that expires while the page is already open
watch(error, async (value) => {
  if (value?.statusCode !== 401) return
  await clearSession()
  await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
})

const isLoading = computed(() => status.value === 'pending')
const isFiltered = computed(() => !!query.value.search || !!query.value.status)
const isPastEnd = computed(() =>
  !!data.value && data.value.total > 0 && query.value.page > data.value.pageCount,
)
const selectedCount = computed(() => Object.keys(rowSelection.value).length)
const statusValue = computed(() => query.value.status || ALL_STATUSES)

// Selection - Day 5's bulk actions read this. Nothing acts on it yet.
const rowSelection = ref<Record<string, boolean>>({})
const searchInput = ref(query.value.search)

/**
 * Handles status change event
 * @param value The selected status value
 */
const onStatusChange = (value: string) => {
  setStatus(value === ALL_STATUSES ? '' : (value as ProductStatus))
}

/**
 * Returns sort icon based on the current sort state
 * @param field The field to check for sorting
 */
const sortIcon = (field: ProductListQuery['sort']) => {
  if (query.value.sort !== field) return 'i-lucide-arrow-up-down'
  return query.value.dir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

/**
 * Means no filter selected, but displayed `all` instead of empty string,
 * because Reka UI reserves '' for "no selection, show placeholder".
 * `statusValue` maps '' -> 'all' on the way in, `onStatusChange` maps it back on the way out.
 * So 'all' never reaches the URL.
 */
const ALL_STATUSES = 'all'

/**
 * Constants for the status items used in the product status filter
 */
const statusItems = [
  {
    label: 'All statuses',
    value: ALL_STATUSES,
  },
  ...PRODUCT_STATUSES.map(value => ({ label: value, value })),
]

/**
 * Defines the columns for the product table
 */
const columns: TableColumn<NonNullable<typeof data.value>['items'][number]>[] = [
  { id: 'select' },
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'priceCents', header: 'Price', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'stock', header: 'Stock', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'status', header: 'Status' },
]

const STATUS_COLOR = {
  active: 'success',
  draft: 'neutral',
  archived: 'warning',
} as const
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">
        Products
      </h1>
      <p
        v-if="selectedCount"
        class="text-sm text-muted"
      >
        {{ selectedCount }} selected
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchInput"
        icon="i-lucide-search"
        placeholder="Search name or SKU"
        class="w-full sm:w-72"
        @update:model-value="pushSearch"
      />

      <USelect
        :model-value="statusValue"
        :items="statusItems"
        value-key="value"
        class="w-44"
        @update:model-value="onStatusChange"
      />

      <UButton
        v-if="isFiltered"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        @click="reset"
      >
        Clear
      </UButton>

      <p
        v-if="data && !error"
        class="ml-auto text-sm text-muted"
      >
        {{ data.total }} product{{ data.total === 1 ? '' : 's' }}
      </p>
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Could not load products"
      :description="error.statusMessage || error.message"
      :actions="[{ label: 'Retry', color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <!-- Main -->
    <template v-else>
      <UTable
        v-model:row-selection="rowSelection"
        :data="data?.items ?? []"
        :columns="columns"
        :loading="isLoading"
        :get-row-id="(row: { id: number }) => String(row.id)"
        class="border border-default rounded-lg"
      >
        <template #select-header="{ table }">
          <UCheckbox
            :model-value="table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected()"
            aria-label="Select all rows on this page"
            @update:model-value="table.toggleAllPageRowsSelected(!!$event)"
          />
        </template>

        <template #select-cell="{ row }">
          <UCheckbox
            :model-value="row.getIsSelected()"
            :aria-label="`Select ${row.original.name}`"
            @update:model-value="row.toggleSelected(!!$event)"
          />
        </template>

        <template #name-header>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :trailing-icon="sortIcon('name')"
            class="-mx-2"
            @click="setSort('name')"
          >
            Name
          </UButton>
        </template>

        <template #priceCents-header>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :trailing-icon="sortIcon('price')"
            class="-mx-2"
            @click="setSort('price')"
          >
            Price
          </UButton>
        </template>

        <template #priceCents-cell="{ row }">
          {{ formatCents(row.original.priceCents) }}
        </template>

        <template #stock-cell="{ row }">
          <span :class="row.original.stock === 0 ? 'text-error' : undefined">
            {{ row.original.stock === 0 ? 'Out of stock' : row.original.stock }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="STATUS_COLOR[row.original.status]"
            variant="subtle"
          >
            {{ row.original.status }}
          </UBadge>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="space-y-3 py-2">
            <USkeleton
              v-for="n in TABLE_SKELETON_ROWS"
              :key="n"
              class="h-8 w-full"
            />
          </div>
        </template>

        <!-- Empty -->
        <template #empty>
          <div class="py-8 text-center space-y-3">
            <!-- Over End-of-Result-Page -->
            <template v-if="isPastEnd">
              <p class="text-sm text-muted">
                Page {{ query.page }} is past the end.
                {{ data?.total }} product{{ data?.total === 1 ? '' : 's' }}
                across {{ data?.pageCount }} page{{ data?.pageCount === 1 ? '' : 's' }}.
              </p>
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                @click="setPage(1)"
              >
                Go to page 1
              </UButton>
            </template>
            <template v-else-if="isFiltered">
              <p class="text-sm text-muted">
                No products match this filter.
              </p>
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                @click="reset"
              >
                Clear filters
              </UButton>
            </template>
            <p
              v-else
              class="text-sm text-muted"
            >
              No products yet.
            </p>
          </div>
        </template>
      </UTable>

      <!-- Pagination -->
      <div
        v-if="data && data.pageCount > 1"
        class="flex justify-end"
      >
        <UPagination
          :page="query.page"
          :items-per-page="PAGE_SIZE"
          :total="data.total"
          @update:page="setPage"
        />
      </div>
    </template>
  </div>
</template>

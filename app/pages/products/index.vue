<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { MESSAGES, PAGE_SIZE, SEARCH_DEBOUNCE_MS, TABLE_SKELETON_ROWS, finishedOrderWarning } from '#shared/constants'
import { PRODUCT_STATUSES } from '#shared/schemas/product'
import type { ProductListQuery, ProductStatus } from '#shared/schemas/product'
import type { RemovableCheck } from '~~/server/utils/productRemovable'

useHead({ title: 'Products' })

const toast = useToast()
const { handleUnauthorized } = useUnauthorized()
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

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

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

// Mirrors what `useFetch` hands back, not the Prisma row - the payload is serialised in transit.
type ProductRow = NonNullable<typeof data.value>['items'][number]

/**
 * Defines the columns for the product table
 */
const columns: TableColumn<ProductRow>[] = [
  { id: 'select' },
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'priceCents', header: 'Price', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'stock', header: 'Stock', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions' },
]

/**
 * ARCHIVE AND DELETE ARE TWO FEATURES — DATABASE-DESIGN.md §3.
 *
 * Archive is `status='archived'`: reversible, and the SKU stays taken.
 * Delete is `deletedAt`: irreversible, and the SKU is freed.
 */
const archiveTarget = ref<ProductRow | null>(null)
const deleteTarget = ref<ProductRow | null>(null)
const modalPending = ref(false)
const modalError = ref('')
const removable = ref<RemovableCheck | null>(null)

const deleteWarning = computed(() =>
  removable.value?.finishedOrderCount ? finishedOrderWarning(removable.value.finishedOrderCount) : undefined,
)
const isDeleteDisabled = computed(() => removable.value === null || !removable.value.ok)

/**
 * Row action menu.
 *
 * Archive is hidden on a row that is already archived. (hide in UI, non-block in endpoint)
 */
const rowActions = (row: ProductRow): DropdownMenuItem[][] => [
  [
    { label: 'View', icon: 'i-lucide-eye', to: `/products/${row.id}` },
    { label: 'Edit', icon: 'i-lucide-pencil', to: `/products/${row.id}/edit` },
  ],
  [
    ...(row.status === 'archived'
      ? []
      : [{ label: 'Archive', icon: 'i-lucide-archive', onSelect: () => openArchive(row) }]),
    { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDelete(row) },
  ],
]

const openArchive = (row: ProductRow) => {
  modalError.value = ''
  archiveTarget.value = row
}

const openDelete = async (row: ProductRow) => {
  modalError.value = ''
  removable.value = null
  deleteTarget.value = row

  try {
    const check = await $fetch<RemovableCheck>(productPath(row.id, 'removable'))
    removable.value = check
    if (!check.ok) modalError.value = check.reason ?? ''
  }
  catch (error) {
    if (!await handleUnauthorized(error)) {
      modalError.value = errorMessage(error)
    }
  }
}

/**
 * Shared code for the archive and delete modals after confirm.
 * @param request The write to run
 * @param successTitle What the toast says when it worked
 */
const runRemoval = async (request: () => Promise<unknown>, successTitle: string) => {
  modalPending.value = true
  modalError.value = ''

  try {
    await request()
    toast.add({ title: successTitle, color: 'success' })
    archiveTarget.value = null
    deleteTarget.value = null
    await refresh()
  }
  catch (error) {
    if (!await handleUnauthorized(error)) {
      modalError.value = errorMessage(error)
    }
  }
  finally {
    modalPending.value = false
  }
}

const confirmArchive = () => {
  const id = archiveTarget.value?.id
  if (!id) return
  return runRemoval(
    () => $fetch<{ id: number }>(productPath(id), { method: 'PATCH', body: { status: 'archived' } }),
    MESSAGES.productArchived,
  )
}

const confirmDelete = () => {
  const id = deleteTarget.value?.id
  if (!id) return
  return runRemoval(
    () => $fetch<{ ok: boolean }>(productPath(id), { method: 'DELETE' }),
    MESSAGES.productDeleted,
  )
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-semibold">
        Products
      </h1>
      <div class="flex items-center gap-3">
        <p
          v-if="selectedCount"
          class="text-sm text-muted"
        >
          {{ selectedCount }} selected
        </p>
        <UButton
          to="/products/new"
          icon="i-lucide-plus"
        >
          New product
        </UButton>
      </div>
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
        :get-row-id="(row: ProductRow) => String(row.id)"
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

        <template #name-cell="{ row }">
          <ULink
            :to="`/products/${row.original.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ row.original.name }}
          </ULink>
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
            :color="PRODUCT_STATUS_COLOR[row.original.status]"
            variant="subtle"
          >
            {{ row.original.status }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="text-right">
            <UDropdownMenu :items="rowActions(row.original)">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis-vertical"
                square
                :aria-label="`Actions for ${row.original.name}`"
              />
            </UDropdownMenu>
          </div>
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

    <!-- Archive modal -->
    <ConfirmModal
      :open="!!archiveTarget"
      :title="MESSAGES.archiveTitle"
      :description="MESSAGES.archiveBody"
      :confirm-label="MESSAGES.archiveConfirm"
      color="warning"
      :loading="modalPending"
      :server-error="modalError"
      @update:open="archiveTarget = null"
      @confirm="confirmArchive"
    />

    <!-- Delete modal -->
    <ConfirmModal
      :open="!!deleteTarget"
      :title="MESSAGES.deleteTitle"
      :description="MESSAGES.deleteBody"
      :confirm-label="MESSAGES.deleteConfirm"
      :color="isDeleteDisabled ? 'neutral' : 'error'"
      :warning="deleteWarning"
      :delete-disabled="isDeleteDisabled"
      :loading="modalPending"
      :server-error="modalError"
      @update:open="deleteTarget = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

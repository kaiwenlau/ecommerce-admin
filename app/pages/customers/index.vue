<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import { MESSAGES, PAGE_SIZE, SEARCH_DEBOUNCE_MS, TABLE_SKELETON_ROWS } from '#shared/constants'
import { customerListQuerySchema } from '#shared/schemas/customer'

useHead({ title: 'Customers' })

const { handleUnauthorized } = useUnauthorized()

// Same URL-is-the-state machinery the product list uses, minus the status filter and sorting.
// See app/composables/useUrlQuery.ts.
const { query, setSearch, setPage, reset } = useUrlQuery(customerListQuerySchema)

/**
 * Bound to `@update:model-value` - only fires on real typing.
 *
 * 2 writers: user typing, and the watcher below that refills the box after 'Back' / a pasted link.
 * If it fired on refill, 'Back' onto `?search=ali&page=3` would land on page 1.
 */
const pushSearch = useDebounceFn(
  (value: string | number) => setSearch(String(value)),
  SEARCH_DEBOUNCE_MS,
)

const searchInput = ref(query.value.search)

// query: reactive - refetches on every URL change
const { data, status, error, refresh } = await useFetch('/api/customers', {
  query,
  lazy: true,
})

// 'Back' and pasted link refill the box.
watch(() => query.value.search, (value) => {
  if (value !== searchInput.value) searchInput.value = value
})

// handles a session that expires while the page sits open.
watch(error, value => handleUnauthorized(value))

const isLoading = computed(() => status.value === 'pending')
const isFiltered = computed(() => !!query.value.search)
const isPastEnd = computed(() =>
  !!data.value && data.value.total > 0 && query.value.page > data.value.pageCount,
)

// Mirrors what `useFetch` hands back, not the Prisma row - the payload is serialised in transit.
type CustomerRow = NonNullable<typeof data.value>['items'][number]

const columns: TableColumn<CustomerRow>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'orderCount', header: 'Orders', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { accessorKey: 'totalSpentCents', header: 'Total spent', meta: { class: { th: 'text-right', td: 'text-right' } } },
]
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">
      Customers
    </h1>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="searchInput"
        icon="i-lucide-search"
        placeholder="Search name or email"
        class="w-full sm:w-72"
        @update:model-value="pushSearch"
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
        {{ data.total }} customer{{ data.total === 1 ? '' : 's' }}
      </p>
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="MESSAGES.customersLoadFailed"
      :description="error.statusMessage || error.message"
      :actions="[{ label: MESSAGES.retry, color: 'error', variant: 'solid', onClick: () => refresh() }]"
    />

    <!-- Main -->
    <template v-else>
      <UTable
        :data="data?.items ?? []"
        :columns="columns"
        :loading="isLoading"
        :get-row-id="(row: CustomerRow) => String(row.id)"
        class="border border-default rounded-lg"
      >
        <template #name-cell="{ row }">
          <ULink
            :to="`/customers/${row.original.id}`"
            class="font-medium text-primary hover:underline"
          >
            {{ row.original.name }}
          </ULink>
        </template>

        <template #totalSpentCents-cell="{ row }">
          {{ formatCents(row.original.totalSpentCents) }}
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
                {{ data?.total }} customer{{ data?.total === 1 ? '' : 's' }}
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
                {{ MESSAGES.noCustomerMatches }}
              </p>
              <UButton
                color="neutral"
                variant="subtle"
                size="sm"
                @click="reset"
              >
                Clear search
              </UButton>
            </template>
            <p
              v-else
              class="text-sm text-muted"
            >
              {{ MESSAGES.noCustomers }}
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

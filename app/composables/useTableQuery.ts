/**
 * HOW THIS AVOIDS THE INFINITE LOOP
 *
 * The loop happens when a watcher writes the URL and thereby retriggers itself.
 * Two rules make that structurally impossible here:
 * 1. The URL is READ-ONLY state. `query` is a computed over `route.query`
 * 2. There is only ONE writer - `patch()`. It is only called from user action.
 *    No watcher in this file or its callers calls it.
 * So the data flows one way: user action -> patch -> URL -> computed -> fetch
 */

import type { LocationQueryRaw } from 'vue-router'
import {
  PRODUCT_LIST_QUERY_DEFAULTS,
  productListQuerySchema,
} from '#shared/schemas/product'
import type { ProductListQuery, ProductSortField } from '#shared/schemas/product'

// Strip anything that is in default state, so it displayed as `/products`
const stripDefaults = (query: ProductListQuery): LocationQueryRaw => {
  const stripped: LocationQueryRaw = {}

  for (const [key, value] of Object.entries(query)) {
    if (value !== PRODUCT_LIST_QUERY_DEFAULTS[key as keyof ProductListQuery]) {
      stripped[key] = String(value)
    }
  }

  return stripped
}

export const useTableQuery = () => {
  const route = useRoute()
  const router = useRouter()

  // Anything unsupported info in URL fallback to default inside the schema
  const query = computed(() => productListQuerySchema.parse(route.query))

  const patch = (next: Partial<ProductListQuery>) => {
    const merged = { ...query.value, ...next }
    if (!('page' in next)) merged.page = 1
    router.push({ query: stripDefaults(merged) })
  }

  const setSearch = (search: string) => {
    patch({ search })
  }

  const setStatus = (status: ProductListQuery['status']) => {
    patch({ status })
  }

  const setSort = (sort: ProductSortField) => {
    patch({
      sort,
      dir: query.value.sort === sort && query.value.dir === 'asc' ? 'desc' : 'asc',
    })
  }

  const setPage = (page: number) => {
    patch({ page })
  }

  const reset = () => {
    router.push({ query: {} })
  }

  return { query, setSearch, setStatus, setSort, setPage, reset }
}

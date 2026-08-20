/**
 * The product list's URL state.
 *
 * The generic half — parsing the URL, the single writer, stripping defaults —
 * is in `useUrlQuery`, and `app/pages/customers/index.vue` uses that directly.
 * This file adds the two controls only the product table has: the status filter and the sortable columns.
 */

import { productListQuerySchema } from '#shared/schemas/product'
import type { ProductListQuery, ProductSortField } from '#shared/schemas/product'

export const useTableQuery = () => {
  const { query, patch, setSearch, setPage, reset } = useUrlQuery(productListQuerySchema)

  const setStatus = (status: ProductListQuery['status']) => {
    patch({ status })
  }

  /**
   * Clicking the column you are already sorting by flips the direction.
   * Clicking a different one starts it ascending.
   */
  const setSort = (sort: ProductSortField) => {
    patch({
      sort,
      dir: query.value.sort === sort && query.value.dir === 'asc' ? 'desc' : 'asc',
    })
  }

  return { query, setSearch, setStatus, setSort, setPage, reset }
}

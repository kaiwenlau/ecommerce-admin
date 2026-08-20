/**
 * HOW THIS AVOIDS THE INFINITE LOOP
 *
 * The loop happens when a watcher writes the URL and thereby retriggers itself.
 * Two rules make that structurally impossible here:
 * 1. The URL is READ-ONLY state. `query` is a computed over `route.query`
 * 2. There is only ONE writer - `patch()`. It is only called from user action.
 *    No watcher in this file or its callers calls it.
 * So the data flows one way: user action -> patch -> URL -> computed -> fetch
 *
 * The list-specific half lives in the caller:
 * `useTableQuery` adds the product list's sort and status, `app/pages/customers/index.vue` needs neither.
 * Everything both lists share is here.
 */

import type { z } from 'zod'
import type { LocationQueryRaw } from 'vue-router'

/**
 * What a list query can hold. It comes from the address bar, so nothing nested.
 *
 * `page` and `search` are named because this file writes them itself —
 * `patch()` resets the page, and `setSearch` exists for every list.
 *
 * The `Record` half lets a caller's schema add whatever else it wants;
 * the product list adds `status`, `sort` and `dir`.
 */
type QueryValues = { page: number, search: string } & Record<string, string | number>

/**
 * Reads a list's paging/search/sort state off the URL and writes it back.
 *
 * @param schema The Zod schema for this list's query. Every field must `.catch()` a default,
 *   so a hand-mangled URL degrades instead of throwing. `schema.parse({})` IS the default state
 * @returns The parsed query as a computed, plus the only functions allowed to change the URL
 */
export const useUrlQuery = <Output extends QueryValues>(schema: z.ZodType<Output>) => {
  const route = useRoute()
  const router = useRouter()

  // Parsing an empty object runs every `.catch()`, which is exactly the default for each field.
  const defaults = schema.parse({})

  // Strip anything that is in default state, so it displays as `/customers` not `/customers?page=1`
  const stripDefaults = (query: Output): LocationQueryRaw => {
    const stripped: LocationQueryRaw = {}

    for (const [key, value] of Object.entries(query)) {
      if (value !== defaults[key]) stripped[key] = String(value)
    }

    return stripped
  }

  // Anything unsupported in the URL falls back to the default inside the schema
  const query = computed(() => schema.parse(route.query))

  /**
   * The single writer. Merges a change into the current URL state.
   * Any change other than paging sends the user back to page 1 —
   * page 4 of a new search is usually past the end.
   */
  const patch = (next: Partial<Output>) => {
    const merged = { ...query.value, ...next }
    if (!('page' in next)) merged.page = 1
    router.push({ query: stripDefaults(merged) })
  }

  const setSearch = (search: string) => {
    patch({ search } as Partial<Output>)
  }

  const setPage = (page: number) => {
    patch({ page } as Partial<Output>)
  }

  const reset = () => {
    router.push({ query: {} })
  }

  return { query, patch, setSearch, setPage, reset }
}

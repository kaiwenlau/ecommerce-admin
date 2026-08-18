/**
 * Lives in `./shared` dir so browser and server route validate against the SAME rules.
 * If this file changes, both sides change together
 */

import { z } from 'zod'
import { SEARCH_MAX_LENGTH } from '#shared/constants'

export type ProductListQuery = z.infer<typeof productListQuerySchema>
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number]

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const
export const PRODUCT_SORT_FIELDS = ['name', 'price'] as const

/**
 * Schema for validating product list query parameters
 * - Every field catches its default instead of throwing
 * - These are read-only display filters read straight off the address bar, `?page=abc` should show page 1
 * - Day 3's write endpoints do NOT do this — a bad product price must fail loudly
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  search: z.string().trim().max(SEARCH_MAX_LENGTH).catch(''),
  status: z.enum(PRODUCT_STATUSES).or(z.literal('')).catch(''),
  sort: z.enum(PRODUCT_SORT_FIELDS).catch('name'),
  dir: z.enum(['asc', 'desc']).catch('asc'),
})

export const PRODUCT_LIST_QUERY_DEFAULTS: ProductListQuery = productListQuerySchema.parse({})

/**
 * Lives in `./shared` dir so browser and server route validate against the SAME rules.
 * If this file changes, both sides change together.
 */

import { z } from 'zod'
import { SEARCH_MAX_LENGTH } from '#shared/constants'

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>

/**
 * Schema for validating customer list query parameters.
 *
 * Same rule as `productListQuerySchema`: every field catches its default instead of throwing,
 * because these come straight off the address bar. `?page=abc` shows page 1, it does not 500.
 *
 * The customer list has no status to filter by and no second sort column, so carries only what it uses.
 */
export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  search: z.string().trim().max(SEARCH_MAX_LENGTH).catch(''),
})

export const CUSTOMER_LIST_QUERY_DEFAULTS: CustomerListQuery = customerListQuerySchema.parse({})

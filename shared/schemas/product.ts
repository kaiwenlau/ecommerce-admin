/**
 * Lives in `./shared` dir so browser and server route validate against the SAME rules.
 * If this file changes, both sides change together.
 */

import { z } from 'zod'
import {
  CATEGORY_MAX_LENGTH,
  CENTS_PER_UNIT,
  DESCRIPTION_MAX_LENGTH,
  MESSAGES,
  NAME_MAX_LENGTH,
  PRICE_MAX_UNITS,
  SEARCH_MAX_LENGTH,
  SKU_MAX_LENGTH,
  STOCK_MAX,
} from '#shared/constants'
import { parseCents } from '#shared/utils/money'

export type ProductListQuery = z.infer<typeof productListQuerySchema>
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number]

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const
export const PRODUCT_SORT_FIELDS = ['name', 'price'] as const

/**
 * Schema for validating product list query parameters.
 *
 * - Every field catches its default instead of throwing.
 * - These are read-only display filters read straight off the address bar, `?page=abc` should show page 1.
 * - Day 3's write endpoints do NOT do this — a bad product price must fail loudly.
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  search: z.string().trim().max(SEARCH_MAX_LENGTH).catch(''),
  status: z.enum(PRODUCT_STATUSES).or(z.literal('')).catch(''),
  sort: z.enum(PRODUCT_SORT_FIELDS).catch('name'),
  dir: z.enum(['asc', 'desc']).catch('asc'),
})

export const PRODUCT_LIST_QUERY_DEFAULTS: ProductListQuery = productListQuerySchema.parse({})

/**
 * Write schemas — create and edit.
 *
 * The opposite of `productListQuerySchema` above: NO `.catch()` anywhere.
 * A malformed URL should degrade to default.
 * A failed validation on a form must fail loudly.
 */

/**
 * Schema for validating the price in cents.
 *
 * The user types price as string, e.g., `"19.99"`, and it reach Prisma as whole cents, `1999`.
 *
 * The regex runs before the conversion, returns digits with at most two decimal places.
 */
const priceCentsSchema = z
  .string({ error: MESSAGES.priceRequired })
  .trim()
  .min(1, MESSAGES.priceRequired)
  .regex(/^\d+(\.\d{1,2})?$/, MESSAGES.priceInvalid)
  .transform(parseCents)
  .refine(cents => cents > 0, MESSAGES.priceNotPositive)
  .refine(cents => cents < PRICE_MAX_UNITS * CENTS_PER_UNIT, MESSAGES.priceTooLarge)

const stockSchema = z
  .number({ error: MESSAGES.stockInvalid })
  .int(MESSAGES.stockInvalid)
  .min(0, MESSAGES.stockNegative)
  .max(STOCK_MAX, MESSAGES.stockTooLarge)

/**
 * Create. Lists every field the form shows, and nothing else.
 *
 * Zod keeps only fields listed here and throws away anything else given.
 * `POST /api/products` checks request body against this schema and saves what comes back.
 * So request that sent `deletedAt` or `id` dropped here, never reach database.
 */
export const productCreateSchema = z.object({
  sku: z.string({ error: MESSAGES.skuRequired }).trim().min(1, MESSAGES.skuRequired).max(SKU_MAX_LENGTH, MESSAGES.skuTooLong),
  name: z.string({ error: MESSAGES.nameRequired }).trim().min(1, MESSAGES.nameRequired).max(NAME_MAX_LENGTH, MESSAGES.nameTooLong),
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH, MESSAGES.descriptionTooLong).optional(),
  category: z.string({ error: MESSAGES.categoryRequired }).trim().min(1, MESSAGES.categoryRequired).max(CATEGORY_MAX_LENGTH, MESSAGES.categoryTooLong),
  priceCents: priceCentsSchema,
  stock: stockSchema,
  status: z.enum(PRODUCT_STATUSES, { error: MESSAGES.statusInvalid }),
})

/**
 * Edit. Every field is optional.
 */
export const productUpdateSchema = productCreateSchema.partial()

export type ProductCreateInput = z.input<typeof productCreateSchema>
export type ProductCreateData = z.output<typeof productCreateSchema>
export type ProductUpdateData = z.output<typeof productUpdateSchema>

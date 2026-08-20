/**
 * `GET /api/products/:id` — every column the edit form needs.
 * Called by `app/pages/products/[id]/edit.vue` to fill the form.
 *
 * `GET /api/products` cannot do this job: the list omits `description`, and a browser landing
 * straight on `/products/12/edit` has no list in memory to read from anyway.
 *
 * A soft-deleted product 404s here, because a deleted product must not be editable. The detail
 * page needs the opposite answer, which is why it has its own route in `[id]/detail.get.ts`.
 */

import { MESSAGES } from '#shared/constants'
import type { Prisma } from '~~/generated/prisma/client'

/**
 * Every column the edit form shows.
 *
 * `satisfies` type-checks the object against Prisma's select shape while keeping the exact keys,
 * so `ProductDetail` below stays in step with it.
 */
const productDetailSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  category: true,
  priceCents: true,
  stock: true,
  status: true,
} satisfies Prisma.ProductSelect

/**
 * The response shape, derived from the select rather than hand-written.
 *
 * `app/pages/products/[id]/edit.vue` imports this to type its `useFetch`.
 */
export type ProductDetail = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: productDetailSelect,
  })
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  return product
})

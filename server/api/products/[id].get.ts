/**
 * The edit form fills itself from here.
 *
 * `GET /api/products` cannot do it: the list omits `description`, and a browser landing
 * straight on `/products/12/edit` has no list in memory to read from anyway.
 *
 * Day 4's detail page reads the same route.
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

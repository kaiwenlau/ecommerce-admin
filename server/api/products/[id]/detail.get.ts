/**
 * `GET /api/products/:id/detail` — one product plus every customer who bought it.
 * Called by `app/pages/products/[id]/index.vue`.
 *
 * This answers the brief's second tracing question: given a product, who bought it.
 *
 * A deleted product resolves here instead of 404ing, so an old order line pointing at it opens a
 * page marked "deleted" rather than a dead end.
 *
 * Separate from `[id].get.ts` because that route feeds the edit form and must 404 on a deleted
 * product. See docs/decisions/DATABASE-DESIGN.md §3, the "Its own page" row.
 */

import { MESSAGES } from '#shared/constants'
import type { Prisma } from '~~/generated/prisma/client'

/**
 * Everything the detail page shows.
 */
const productPageSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  category: true,
  priceCents: true,
  stock: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect

export type ProductPage = Prisma.ProductGetPayload<{ select: typeof productPageSelect }>

const handler = defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: productPageSelect,
  })
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  /**
   * ONE query for the whole "who bought this" table.
   *
   * `OrderItem` has an index on `productId`, so Postgres finds the lines directly;
   * the `select` joins the order and its customer in the same statement.
   *
   * The alternative — fetch the lines, then loop and fetch each order — N+1 makes this take seconds.
   *
   * Cancelled orders excluded: `cancelled` means we never sent the goods, so the customer did not buy it.
   * The same rule decides `totalSpent` on /api/customers.
   */
  const lines = await prisma.orderItem.findMany({
    where: { productId: id, order: { status: { not: 'cancelled' } } },
    select: {
      qty: true,
      unitPriceCents: true,
      order: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  // Grouping up per customer - buyer list.
  const buyers = groupBuyers(lines)

  return {
    product: {
      ...product,
      deletedAt: toIso(product.deletedAt),
      createdAt: toIso(product.createdAt),
      updatedAt: toIso(product.updatedAt),
    },
    buyers,
    totals: {
      customerCount: buyers.length,
      unitCount: buyers.reduce((sum, buyer) => sum + buyer.unitCount, 0),
      revenueCents: buyers.reduce((sum, buyer) => sum + buyer.totalSpentCents, 0),
    },
  }
})

export default handler

/**
 * What the Product Detail page `/products/:id` receives.
 */
export type ProductDetailResponse = Awaited<ReturnType<typeof handler>>

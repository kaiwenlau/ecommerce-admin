/**
 * [CURRENT] `products/[id]/detail.get.ts` - `GET /api/products/:id/detail`
 * - 1 product & who bought it - brief's second tracing question.
 * - Information serves the DETAIL PAGE.
 * - Resolves deleted row, returns with `deletedAt` set
 *    - so old order linked to deleted product opens a page saying "deleted" instead of dead-end.
 *
 * [EXISTED] `products/[id].get.ts` - `GET /api/products/:id`
 * - 1 product & what reads it.
 * - Information serves the EDIT FORM.
 * - Deleted product must return 404. Deleted product must not be editable.
 *    - `app/pages/products/[id]/edit.vue` reads that 404 as exactly that.
 *
 * [ALTERNATIVE] One route that do both has to add a query flag.
 * But the Edit Form 404 is depending on that flag its caller must remember not to send.
 * See docs/decisions/DATABASE-DESIGN.md §3, the "Its own page" row.
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
 * What the Product Detail page `/products/:id` receives
 */
export type ProductDetailResponse = Awaited<ReturnType<typeof handler>>

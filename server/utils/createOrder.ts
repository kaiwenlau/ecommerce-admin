/**
 * Places an order and takes the stock off the shelf, in one transaction.
 * Called by `POST /api/orders`, and directly by `test/db/create-order.test.ts`, which needs a
 * real database — `npm run db:up` first.
 *
 * This is the only write path that creates orders. The seed writes its rows straight into the
 * tables and skips all of this, which is fine for fixed demo data but proves nothing.
 *
 * Two rules from docs/decisions/DATABASE-DESIGN.md live here, and nowhere else:
 *
 *   §4 Overselling — stock is never read and then written. See the `updateMany` below.
 *   §2 Price snapshot — the name and price are COPIED onto the order line, so repricing the
 *      product later does not rewrite last month's receipt.
 *
 * `prisma` is imported by hand rather than left to Nitro's auto-import, because vitest does not
 * do auto-imports and this file has to be callable from a plain test.
 */

import { MESSAGES } from '#shared/constants'
import { prisma } from './db'

/**
 * One order line as the caller asks for it: which product, how many.
 * Name and price are not accepted from the caller — the transaction below copies both off the
 * product row itself, so a client cannot name its own price.
 */
export type OrderLineInput = {
  productId: number
  qty: number
}

/**
 * `items` rather than `lines`, because that is the field name `orderCreateSchema` in
 * `shared/schemas/order.ts` validates and the one the request body carries.
 */
export type CreateOrderInput = {
  customerId: number
  items: OrderLineInput[]
}

/**
 * One order line as it will be stored, price snapshot included.
 *
 * This is a shape built in this file, not a database type. The table it is written to is the
 * `OrderItem` model in prisma/schema.prisma — same row, and the two names sit close together.
 */
export type OrderLine = {
  productId: number
  name: string
  unitPriceCents: number
  qty: number
}

/**
 * Thrown when an order line asks for more than is left on the shelf.
 */
export class OutOfStockError extends Error {
  constructor(readonly productId: number) {
    super(MESSAGES.productOutOfStock)
    this.name = 'OutOfStockError'
  }
}

/**
 * Thrown when the product id matches nothing, or the product is not `active`
 * — drafted, archived, or soft-deleted.
 */
export class ProductNotSellableError extends Error {
  constructor(readonly productId: number) {
    super(MESSAGES.productNotSellable)
    this.name = 'ProductNotSellableError'
  }
}

/**
 * Creates an order, decrementing stock atomically per order line.
 *
 * @param input The customer and the order lines they are buying
 * @returns The new order's id and its total in whole cents
 * @throws {OutOfStockError} An order line asked for more than is left
 * @throws {ProductNotSellableError} An order line named a product that cannot be sold
 */
export const createOrder = async ({ customerId, items }: CreateOrderInput) => {
  if (items.length === 0) {
    throw new Error(MESSAGES.orderNeedsItems)
  }

  for (const item of items) {
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      throw new Error(MESSAGES.orderQtyInvalid)
    }
  }

  // Sorted by product id so every transaction locks its rows in the same order.
  // `sort()` mutates the source array, so `[...items]` makes a copy out from source.
  const requestedLines = [...items].sort((a, b) => a.productId - b.productId)

  // Transaction: the order exists AND the stock moved, else rollback.
  return prisma.$transaction(async (tx) => {
    const productIds = [...new Set(requestedLines.map(requestedLine => requestedLine.productId))]

    // Get the name and price of the products at current state.
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, status: 'active' },
      select: { id: true, name: true, priceCents: true },
    })

    // Keyed by id so the loop below is a lookup, not a scan per order line.
    const byId = new Map(products.map(product => [product.id, product]))

    // Build the order lines, contain products the customer buying. Name and price copied here.
    const orderLines: OrderLine[] = requestedLines.map((requestedLine) => {
      const product = byId.get(requestedLine.productId)
      if (!product) {
        throw new ProductNotSellableError(requestedLine.productId)
      }

      return {
        productId: product.id,
        name: product.name,
        unitPriceCents: product.priceCents,
        qty: requestedLine.qty,
      }
    })

    for (const orderLine of orderLines) {
      // The overselling guard. Checking and decrementing are a single SQL statement with no gap for a second buyer to slip into.
      // Postgres runs on READ COMMITTED - Concurrency.
      // Bug with `update`: takes only a unique id, so it would force a read-then-write.
      const { count } = await tx.product.updateMany({
        where: {
          id: orderLine.productId,
          deletedAt: null,
          status: 'active',
          stock: { gte: orderLine.qty },
        },
        data: { stock: { decrement: orderLine.qty } },
      })

      // Either the stock ran out or the product not sellable in the moments.
      if (count === 0) {
        throw new OutOfStockError(orderLine.productId)
      }
    }

    const totalCents = orderLines.reduce((sum, orderLine) => sum + orderLine.unitPriceCents * orderLine.qty, 0)

    return tx.order.create({
      data: {
        customerId,
        totalCents,
        items: { create: orderLines }, // inserts the order and all its order lines together
      },
      select: { id: true, totalCents: true },
    })
  })
}

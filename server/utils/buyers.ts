/**
 * "Which customers bought this product" — the grouping half, kept away from the database.
 *
 * `GET /api/products/:id/detail` runs ONE query for every order line that mentions the product and hands the rows here.
 *
 * Grouping in JS rather than in SQL is the deliberate choice:
 * the query is a single indexed read on `OrderItem.productId`, and this file stays a pure function,
 * that test/buyers.test.ts can exercise with plain objects and no Postgres running.
 *
 * If a product ever collects tens of thousands of lines, replace the caller with a grouped SQL
 * query (`GROUP BY customer_id`) and delete this. At ~200 seeded orders that is not yet worth it.
 */

import type { OrderStatus } from '~~/generated/prisma/enums'
import { toIso } from './toIso'

/**
 * One order line, as the route selects it.
 *
 * Written structurally rather than with `Prisma.OrderItemGetPayload` so the tests can pass
 * hand-built objects without importing the generated client.
 */
export type BuyerLine = {
  qty: number
  unitPriceCents: number // the paid price, copied during order placed
  order: {
    id: number
    createdAt: Date
    status: OrderStatus
    customer: { id: number, name: string, email: string }
  }
}

export type BuyerOrder = {
  id: number
  createdAt: string
  status: OrderStatus
  qty: number
  lineTotalCents: number
}

export type Buyer = {
  customerId: number
  name: string
  email: string
  orderCount: number // distinct orders
  unitCount: number // units of THIS product, across all their orders
  totalSpentCents: number // amount they paid for this product, at the prices on the lines
  lastPurchaseAt: string
  orders: BuyerOrder[]
}

/**
 * The same rows while they are still being built.
 *
 * Dates stay real `Date` objects in here because the roll-up COMPARES them
 * — the last purchase, and the two sorts at the bottom.
 */
type BuyerDraft = Omit<Buyer, 'lastPurchaseAt' | 'orders'> & {
  lastPurchaseAt: Date
  orders: (Omit<BuyerOrder, 'createdAt'> & { createdAt: Date })[]
}

/**
 * Rolls order lines up into one row per customer.
 *
 * Dates are compared as instants throughout and serialized at the exit
 * — so the returned shape is exactly what `/products/:id` receives.
 *
 * @param lines Every line mentioning the product, each carrying its order and that order's customer
 * @returns One row per customer, most recent buyer first. Orders within a buyer are newest first
 */
export const groupBuyers = (lines: BuyerLine[]): Buyer[] => {
  // Keyed by customer id. `Map` rather than an object so the ids stay numbers.
  const byCustomer = new Map<number, BuyerDraft>()

  for (const line of lines) {
    const { customer, id: orderId, createdAt, status } = line.order
    const lineTotalCents = line.unitPriceCents * line.qty

    let buyer = byCustomer.get(customer.id)
    if (!buyer) {
      buyer = {
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        orderCount: 0,
        unitCount: 0,
        totalSpentCents: 0,
        lastPurchaseAt: createdAt,
        orders: [],
      }
      byCustomer.set(customer.id, buyer)
    }

    buyer.unitCount += line.qty
    buyer.totalSpentCents += lineTotalCents

    // Two lines of the same product on one order are one order, but two lots of units.
    const existing = buyer.orders.find(order => order.id === orderId)
    if (existing) {
      existing.qty += line.qty
      existing.lineTotalCents += lineTotalCents
    }
    else {
      buyer.orders.push({ id: orderId, createdAt, status, qty: line.qty, lineTotalCents })
      buyer.orderCount += 1
    }

    if (createdAt > buyer.lastPurchaseAt) buyer.lastPurchaseAt = createdAt
  }

  const drafts = [...byCustomer.values()]
    .sort((a, b) => b.lastPurchaseAt.getTime() - a.lastPurchaseAt.getTime())

  // Sort first, serialize second. Once these are strings there is nothing sensible to sort on.
  return drafts.map(draft => ({
    ...draft,
    lastPurchaseAt: toIso(draft.lastPurchaseAt),
    orders: draft.orders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(order => ({ ...order, createdAt: toIso(order.createdAt) })),
  }))
}

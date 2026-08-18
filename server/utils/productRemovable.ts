/**
 * One guard, three callers — see docs/decisions/DATABASE-DESIGN.md §3.
 *
 * Archive and delete both ask the same question: "Is anyone still waiting for this product?"
 * Delete is the more destructive, so it can never be the more permissive.
 *
 * Re-implementing the rule per route is how the bulk action ends up refusing what the edit page allows.
 *
 *   PATCH  /api/products/:id  — only on a move to `archived`
 *   DELETE /api/products/:id  — always
 *   POST   /api/products/bulk — per item, Day 5
 */

import { MESSAGES } from '#shared/constants'
import type { OrderStatus } from '~~/generated/prisma/enums'

/**
 * Still owed to a customer. Blocks both archive and delete.
 */
const OPEN_ORDER_STATUSES: OrderStatus[] = ['pending', 'paid']

/**
 * Already dealt with. History — warns, never blocks.
 */
const FINISHED_ORDER_STATUSES: OrderStatus[] = ['shipped', 'delivered']

/**
 * The result of checking whether a product can be archived or deleted.
 * @property ok - False when the product sits on a pending or paid order
 * @property reason - Why not, ready to show. Absent when `ok`
 * @property openOrderCount - How many open orders block it
 * @property finishedOrderCount - How many finished orders mention it. Does not block — the delete modal shows the number
 */
export type RemovableCheck = {
  ok: boolean
  reason?: string
  openOrderCount: number
  finishedOrderCount: number
}

/**
 * Decides whether a product can be archived or deleted.
 * @param productId The product to check
 */
export const checkRemovable = async (productId: number): Promise<RemovableCheck> => {
  const countOrders = (statuses: OrderStatus[]) =>
    prisma.order.count({
      where: {
        status: { in: statuses },
        items: { some: { productId } },
      },
    })

  // Counts orders, not order lines — a product twice on one order counts once.
  // `$transaction` runs both counts against the same snapshot of the data.
  const [openOrderCount, finishedOrderCount] = await prisma.$transaction([
    countOrders(OPEN_ORDER_STATUSES),
    countOrders(FINISHED_ORDER_STATUSES),
  ])

  if (openOrderCount > 0) {
    return {
      ok: false,
      reason: `${MESSAGES.productOnOpenOrders} (${openOrderCount}).`,
      openOrderCount,
      finishedOrderCount,
    }
  }

  return { ok: true, openOrderCount, finishedOrderCount }
}

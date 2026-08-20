/**
 * `GET /api/orders/:id` — one order, its lines, its customer and its audit events.
 * Called by `app/pages/orders/[id].vue`.
 *
 * The middle of the tracing loop: a customer's order row links to that page, and every line on
 * that page links back out to a product.
 *
 * `statusEvents` ships in this payload and the page renders it as a plain list. The seed writes
 * those rows, so the list has content — but nothing writes them at RUNTIME. There is no route
 * that changes an order's status, so the audit trail is read-only for now.
 */

import { MESSAGES } from '#shared/constants'

const handler = defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.orderNotFound })
  }

  /**
   * Order, customer, lines and audit events in ONE call.
   *
   * Nesting `select` inside `select` is how Prisma expresses a join.
   * Nothing here loops, so there is no per-line query no matter how many items the order has.
   */
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalCents: true,
      createdAt: true,
      customer: { select: { id: true, name: true, email: true } },
      items: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          qty: true,
          name: true, // The snapshot name during order placed
          unitPriceCents: true, // The snapshot price during order placed
          productId: true,
          product: { select: { id: true, deletedAt: true } }, // the live product, fetched to decide how the row links
        },
      },
      // Oldest first: this reads as a history, and Day 5 renders it as a timeline.
      statusEvents: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, fromStatus: true, toStatus: true, changedBy: true, createdAt: true },
      },
    },
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.orderNotFound })
  }

  return {
    ...order,
    createdAt: toIso(order.createdAt),
    statusEvents: order.statusEvents.map(event => ({
      ...event,
      createdAt: toIso(event.createdAt),
    })),
    items: order.items.map(({ product, ...item }) => ({
      ...item,
      lineTotalCents: item.unitPriceCents * item.qty,
      productDeleted: !!product.deletedAt,
    })),
    lineSumCents: order.items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0),
  }
})

export default handler

/**
 * What the Order page `/orders/:id` receives.
 */
export type OrderDetailResponse = Awaited<ReturnType<typeof handler>>

/**
 * `GET /api/customers/:id` — one customer and every order they placed.
 * Called by `app/pages/customers/[id].vue`.
 *
 * This answers the brief's first tracing question: given a customer, what have they bought,
 * when, and for how much.
 *
 * Line items are NOT here. Each order row links on to `/orders/:id`, which shows them.
 */

import { MESSAGES } from '#shared/constants'

const handler = defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.customerNotFound })
  }

  /**
   * Customer and every order in ONE call.
   *
   * `include` on a relation makes Prisma fetch the orders alongside the customer
   *    rather than leaving the page to ask for them afterwards.
   *
   * `_count` on `items` is a `COUNT(*)` Postgres runs while it is already there —
   *    cheaper than loading every line just to call `.length`.
   *
   * The lines themselves belong to /api/orders/:id, one click further in.
   */
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalCents: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
    },
  })

  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.customerNotFound })
  }

  // Summed from the rows already in hand. A second aggregate query would only re-read them.
  // Cancelled orders still appear - part of the history, but left out of the total - money never spend.
  const spendingOrders = customer.orders.filter(order => order.status !== 'cancelled')

  return {
    ...customer,
    createdAt: toIso(customer.createdAt),
    orders: customer.orders.map(({ _count, ...order }) => ({
      ...order,
      createdAt: toIso(order.createdAt),
      itemCount: _count.items,
    })),
    totals: {
      orderCount: spendingOrders.length,
      cancelledCount: customer.orders.length - spendingOrders.length,
      totalSpentCents: spendingOrders.reduce((sum, order) => sum + order.totalCents, 0),
      // Orders come back newest first, so the last row is the oldest.
      // `?? null` first: a customer with no orders has no date to convert.
      firstOrderAt: toIso(customer.orders.at(-1)?.createdAt ?? null),
      lastOrderAt: toIso(customer.orders.at(0)?.createdAt ?? null),
    },
  }
})

export default handler

/**
 * What the Customer page `/customers/:id` receives.
 */
export type CustomerDetailResponse = Awaited<ReturnType<typeof handler>>

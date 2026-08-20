/**
 * `GET /api/customers` — one page of customers, each with their order count and lifetime spend.
 * Called by `app/pages/customers/index.vue`, whose paging and search live in the URL — see
 * `app/composables/useUrlQuery.ts`.
 */

import { PAGE_SIZE } from '#shared/constants'
import { customerListQuerySchema } from '#shared/schemas/customer'
import type { Prisma } from '~~/generated/prisma/client'

const handler = defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const query = customerListQuerySchema.parse(getQuery(event))

  const where: Prisma.CustomerWhereInput = {
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      // Two keys, so a page boundary can never fall in the middle of a set of identical names.
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.customer.count({ where }),
  ])

  /**
   * Order count and lifetime spend for the 20 customers on THIS page, in one round trip.
   *
   * `groupBy` is SQL's `GROUP BY`:
   * one row back per `customerId`, with the sum and count already added up by Postgres.
   * Asking per customer instead would be 20 more queries for one screen — N+1 makes pages slow.
   *
   * Cancelled orders are excluded. `cancelled` means we never sent the goods, so that money was never spent.
   * Same rule as the buyers list on /api/products/:id/detail.
   */
  const customerIds = customers.map(customer => customer.id)
  const totals = customerIds.length
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds }, status: { not: 'cancelled' } },
        _sum: { totalCents: true },
        _count: true,
      })
    : []

  // Map lookup instead of `totals.find()` per row — one pass instead of 20 scans.
  const totalsByCustomer = new Map(totals.map(row => [row.customerId, row]))

  return {
    items: customers.map(customer => ({
      ...customer,
      createdAt: toIso(customer.createdAt),
      orderCount: totalsByCustomer.get(customer.id)?._count ?? 0, // 0 order: customer with no orders gets no `groupBy` row
      totalSpentCents: totalsByCustomer.get(customer.id)?._sum.totalCents ?? 0,
    })),
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
})

export default handler

/**
 * What Customer page `/customers` receives, one page of rows plus the paging envelope.
 */
export type CustomerListResponse = Awaited<ReturnType<typeof handler>>

/**
 * `GET /api/products` — one page of products, filtered, searched and sorted.
 * Called by `app/pages/products/index.vue` through `app/composables/useTableQuery.ts`, which
 * keeps every one of those controls in the URL.
 *
 * `deletedAt: null` is unconditional, and the `status` filter layers on top of it. The two are
 * different features: archive is a reversible status, delete is not.
 * docs/decisions/DATABASE-DESIGN.md §3.
 *
 * `findMany` and `count` go inside one `$transaction` so the rows and the total describe the
 * same snapshot. Run separately, a write landing between them yields a page count that does not
 * match the rows above it.
 */

import { PAGE_SIZE } from '#shared/constants'
import { productListQuerySchema } from '#shared/schemas/product'
import type { Prisma } from '~~/generated/prisma/client'

const SORT_COLUMN = {
  name: 'name',
  price: 'priceCents',
} as const

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const query = productListQuerySchema.parse(getQuery(event))

  // `status` - lifecycle state, `deletedAt` - soft delete
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { sku: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  // if both products is same name and price, product with smaller ID first
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { [SORT_COLUMN[query.sort]]: query.dir },
    { id: 'asc' },
  ]

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        name: true,
        priceCents: true,
        stock: true,
        category: true,
        status: true,
      },
    }),
    prisma.product.count({ where }),
  ])

  return {
    items,
    total,
    page: query.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
})

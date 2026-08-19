/**
 * Answers `checkRemovable()` for one product without writing anything.
 *
 * `DELETE` runs the same guard on every call and `PATCH` runs it on a move to `archived`,
 * but both only answer as part of the write itself — a blocked product comes back as a 409
 * on a request the user has already confirmed.
 *
 * The delete modal needs the answer before that. `openDelete()` in
 * app/pages/products/index.vue fetches this route to fill the modal's warning line with the
 * finished-order count, and to keep the confirm button disabled when the product still sits
 * on an open order.
 *
 * Day 5's bulk action will use the same route, per item, to grey out rows it would refuse.
 */

import { MESSAGES } from '#shared/constants'

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  const exists = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })
  if (!exists) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  // Two `count` queries inside one transaction — see server/utils/productRemovable.ts.
  return await checkRemovable(id)
})

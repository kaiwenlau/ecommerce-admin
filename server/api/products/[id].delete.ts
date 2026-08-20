/**
 * `DELETE /api/products/:id` — soft delete. Stamps `deletedAt` and leaves the row in place.
 * Called by the delete modal in `app/pages/products/index.vue`.
 *
 * Deletion here is ONLY ever soft. A real delete would orphan the order lines that reference
 * this product, or take the sales history down with it — DATABASE-DESIGN.md §3.
 *
 * The `checkRemovable` guard runs on every call. Delete is more destructive than archive, so it
 * can never be the more permissive of the two.
 */

import { MESSAGES } from '#shared/constants'

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  const existing = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  // ALWAYS CHECK. Delete is more destructive than archive, so it can never be the more permissive.
  const removable = await checkRemovable(id)
  if (!removable.ok) {
    throw createError({ statusCode: 409, statusMessage: removable.reason })
  }

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: { id: true },
  })

  return { ok: true, finishedOrderCount: removable.finishedOrderCount }
})

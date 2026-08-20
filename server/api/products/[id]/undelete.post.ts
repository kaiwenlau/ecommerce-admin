/**
 * `POST /api/products/:id/undelete` — DEVELOPMENT ONLY. Clears `deletedAt`, putting a
 * soft-deleted product back.
 * Called from the deleted-product banner in `app/pages/products/[id]/index.vue`.
 *
 * It exists so a demo run or a manual test does not have to end in a database reset.
 *
 * `import.meta.dev` becomes a literal at build time, so a production build compiles the body
 * below away entirely and the route answers 404.
 */

import { MESSAGES } from '#shared/constants'

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  // The mirror image of every other product query:
  // this is the ONLY handler that looks for a row WITH `deletedAt` set.
  const deleted = await prisma.product.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, sku: true },
  })

  // id is still live
  if (!deleted) {
    const exists = await prisma.product.count({ where: { id } })
    throw createError({
      statusCode: 404,
      statusMessage: exists ? MESSAGES.productNotDeleted : MESSAGES.productNotFound,
    })
  }

  try {
    // clearing `deletedAt` restores the product.
    return await prisma.product.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, sku: true, name: true, status: true },
    })
  }
  catch (error) {
    // Other product may have claimed the SKU since it was deleted. `product_sku_active` constraint will refuse its recovery.
    // Not recoverable here: the caller has to rename one of them first.
    if (uniqueViolationField(error)) {
      throw createError({ statusCode: 409, statusMessage: `${MESSAGES.skuReused} (${deleted.sku}).` })
    }
    throw error
  }
})

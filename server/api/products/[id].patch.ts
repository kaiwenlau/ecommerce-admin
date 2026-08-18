import { MESSAGES } from '#shared/constants'
import { productUpdateSchema } from '#shared/schemas/product'

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  const result = productUpdateSchema.safeParse(await readBody(event))
  if (!result.success) {
    return respondFieldErrors(event, result.error)
  }

  // A soft-deleted row is not editable.
  const existing = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: MESSAGES.productNotFound })
  }

  // Archive is a status move, and the ONLY status move that is guarded.
  const isArchiving = result.data.status === 'archived' && existing.status !== 'archived'
  if (isArchiving) {
    const removable = await checkRemovable(id)
    if (!removable.ok) {
      throw createError({ statusCode: 409, statusMessage: removable.reason })
    }
  }

  try {
    return await prisma.product.update({
      where: { id },
      data: result.data,
      select: { id: true, status: true },
    })
  }
  catch (error) {
    const field = uniqueViolationField(error)
    if (field) {
      return respondFieldError(event, field, MESSAGES.skuTaken)
    }
    throw error
  }
})

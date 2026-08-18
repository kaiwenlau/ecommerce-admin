import { MESSAGES } from '#shared/constants'
import { productCreateSchema } from '#shared/schemas/product'

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const result = productCreateSchema.safeParse(await readBody(event))

  if (!result.success) {
    return respondFieldErrors(event, result.error)
  }

  try {
    const product = await prisma.product.create({
      data: result.data,
      select: { id: true },
    })
    setResponseStatus(event, 201)
    return product
  }
  catch (error) {
    const field = uniqueViolationField(error)
    if (field) {
      return respondFieldError(event, field, MESSAGES.skuTaken)
    }
    throw error
  }
})

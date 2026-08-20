/**
 * `POST /api/products` — creates a product and answers 201 with its new id.
 * Called by `app/pages/products/new.vue`.
 *
 * A duplicate SKU cannot be caught by Zod, which only ever sees the request body. Only Postgres
 * knows what is already in the table, so the clash arrives as a thrown error out of `create`.
 * The `catch` turns it into the same `{ fieldErrors }` body a validation failure produces, so
 * the form handles both the same way.
 */

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

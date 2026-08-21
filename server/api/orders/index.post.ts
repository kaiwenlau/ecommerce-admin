/**
 * `POST /api/orders` — places an order and answers 201 with its id and total.
 * Nothing in `app/` calls this: the build is an admin panel with no storefront.
 *
 * It exists so the oversell rule can be demonstrated against a running server with two
 * concurrent `curl`s, rather than only inside vitest.
 *
 * All the real work is in `server/utils/createOrder.ts`. This file only translates:
 * request body in, HTTP status out.
 */

import { orderCreateSchema } from '#shared/schemas/order'
import { createOrder, OutOfStockError, ProductNotSellableError } from '~~/server/utils/createOrder'

export default defineEventHandler(async (event) => {
  // protected route, 401 before any database work
  await requireUserSession(event)

  const result = orderCreateSchema.safeParse(await readBody(event))

  if (!result.success) {
    return respondFieldErrors(event, result.error)
  }

  try {
    const order = await createOrder(result.data)
    setResponseStatus(event, 201)
    return order
  }
  catch (error) {
    // 409 Conflict, not 422: the body was valid, the shelf just disagreed with it.
    // Same status `PATCH /api/products/:id` returns when `checkRemovable()` blocks an archive.
    if (error instanceof OutOfStockError || error instanceof ProductNotSellableError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
        data: { productId: error.productId },
      })
    }
    throw error
  }
})

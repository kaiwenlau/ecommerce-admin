/**
 * Lives in `./shared` dir so browser and server route validate against the SAME rules.
 * If this file changes, both sides change together.
 *
 * Two unrelated exports: the `ORDER_STATUSES` list the order pages read,
 * and `orderCreateSchema` is the body that `POST /api/orders` accepts.
 */

import { z } from 'zod'
import { MESSAGES, STOCK_MAX } from '#shared/constants'

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * The body `POST /api/orders` accepts.
 *
 * The price is read from the product inside `server/utils/createOrder.ts`.
 */
export const orderCreateSchema = z.object({
  customerId: z.number().int().positive(),
  items: z
    .array(z.object({
      productId: z.number().int().positive(),
      qty: z.number().int().min(1, MESSAGES.orderQtyInvalid).max(STOCK_MAX),
    }))
    .min(1, MESSAGES.orderNeedsItems),
})

export type OrderCreateInput = z.infer<typeof orderCreateSchema>

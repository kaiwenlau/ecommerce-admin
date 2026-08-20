/**
 * Lives in `./shared` dir so browser and server route agree on the order lifecycle.
 *
 * Day 5 status control validates a transition against this list.
 * Day 4 only needs the order of the statuses.
 */

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

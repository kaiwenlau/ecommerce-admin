/**
 * Badge colours, in one place.
 *
 * Files in `app/utils` are auto-imported by Nuxt, so pages use these without an import line.
 */

import type { ProductStatus } from '#shared/schemas/product'
import type { OrderStatus } from '#shared/schemas/order'

type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'

export const PRODUCT_STATUS_COLOR: Record<ProductStatus, BadgeColor> = {
  active: 'success',
  draft: 'neutral',
  archived: 'warning',
}

/**
 * Each stage gets its own colour, and no two adjacent stages share one.
 */
export const ORDER_STATUS_COLOR: Record<OrderStatus, BadgeColor> = {
  pending: 'neutral',
  paid: 'info',
  shipped: 'warning',
  delivered: 'success',
  cancelled: 'error',
}

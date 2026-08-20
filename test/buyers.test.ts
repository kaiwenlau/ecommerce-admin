import { describe, expect, it } from 'vitest'
import { groupBuyers } from '../server/utils/buyers'
import type { BuyerLine } from '../server/utils/buyers'

const customer = (id: number) => ({ id, name: `Customer ${id}`, email: `c${id}@example.com` })

/**
 * @param overrides Anything to change about the default line
 */
const line = (overrides: {
  customerId: number
  orderId: number
  qty?: number
  unitPriceCents?: number
  createdAt?: string
}): BuyerLine => ({
  qty: overrides.qty ?? 1,
  unitPriceCents: overrides.unitPriceCents ?? 1000,
  order: {
    id: overrides.orderId,
    createdAt: new Date(overrides.createdAt ?? '2026-08-01T00:00:00Z'),
    status: 'delivered',
    customer: customer(overrides.customerId),
  },
})

describe('groupBuyers', () => {
  it('returns nothing for a product no one bought', () => {
    expect(groupBuyers([])).toEqual([])
  })

  it('rolls several orders up into one row per customer', () => {
    const buyers = groupBuyers([
      line({ customerId: 1, orderId: 10 }),
      line({ customerId: 1, orderId: 11 }),
      line({ customerId: 2, orderId: 12 }),
    ])

    expect(buyers).toHaveLength(2)
    expect(buyers.find(b => b.customerId === 1)?.orderCount).toBe(2)
  })

  // Same rule as `checkRemovable()`: a product listed twice on one order is still one order.
  it('counts a product listed twice on one order as one order, two lots of units', () => {
    const [buyer] = groupBuyers([
      line({ customerId: 1, orderId: 10, qty: 2 }),
      line({ customerId: 1, orderId: 10, qty: 3 }),
    ])

    expect(buyer?.orderCount).toBe(1)
    expect(buyer?.unitCount).toBe(5)
    expect(buyer?.orders).toHaveLength(1)
    expect(buyer?.orders[0]?.qty).toBe(5)
  })

  it('totals from the price on the line, times quantity', () => {
    const [buyer] = groupBuyers([
      line({ customerId: 1, orderId: 10, qty: 3, unitPriceCents: 1999 }),
      line({ customerId: 1, orderId: 11, qty: 1, unitPriceCents: 500 }),
    ])

    expect(buyer?.totalSpentCents).toBe(3 * 1999 + 500)
  })

  it('keeps the most recent order date, whatever order the lines arrive in', () => {
    const [buyer] = groupBuyers([
      line({ customerId: 1, orderId: 10, createdAt: '2026-08-05T00:00:00Z' }),
      line({ customerId: 1, orderId: 11, createdAt: '2026-01-01T00:00:00Z' }),
    ])

    // groupBuyers() serializes at its own exit, exactly what /products/:id sends.
    expect(buyer?.lastPurchaseAt).toBe('2026-08-05T00:00:00.000Z')
    // Newest order first within the buyer.
    expect(buyer?.orders.map(order => order.id)).toEqual([10, 11])
  })

  it('sorts buyers by their most recent purchase', () => {
    const buyers = groupBuyers([
      line({ customerId: 1, orderId: 10, createdAt: '2026-01-01T00:00:00Z' }),
      line({ customerId: 2, orderId: 11, createdAt: '2026-08-05T00:00:00Z' }),
    ])

    expect(buyers.map(buyer => buyer.customerId)).toEqual([2, 1])
  })
})

/**
 * Proves the two claims in `docs/decisions/DATABASE-DESIGN.md` that are worth demonstrating:
 * §4 overselling is impossible, and §2 an order keeps the price that was paid.
 * Both exercise `server/utils/createOrder.ts`, the only write path that creates an order.
 *
 * `test/` files are unit tests - a pure function and need nothing.
 * `test/db/` files are integration tests - need to connect REAL DATABASE and `npm run db:up` first.
 *
 * Concurrency cannot be faked: what Postgres does when two UPDATEs land on one row?
 * So it will builds its own rows rather than leaning on the seed.
 * Test data are marked — SKUs start `SKU-TEST-`, customer emails end `@test.invalid` — easy cleanup own rows.
 */

import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../../server/utils/db'
import { createOrder, OutOfStockError } from '../../server/utils/createOrder'

// Unique SKUs and emails
const TEST_SKU_PREFIX = 'SKU-TEST-'
const TEST_EMAIL_DOMAIN = '@test.invalid'

let counter = 0

/**
 * A customer and a product of our own, ready to order.
 * @param stock How many units the product starts with
 * @param priceCents The product's price now — test 2 changes it afterwards
 */
const makeFixture = async (stock: number, priceCents = 1000) => {
  counter += 1
  const tag = `${Date.now()}-${counter}`

  const [customer, product] = await Promise.all([
    prisma.customer.create({
      data: { name: `Test Buyer ${tag}`, email: `buyer-${tag}${TEST_EMAIL_DOMAIN}` },
      select: { id: true },
    }),
    prisma.product.create({
      data: {
        sku: `${TEST_SKU_PREFIX}${tag}`,
        name: 'Test Shirt',
        priceCents,
        stock,
        category: 'Shirts',
        status: 'active',
      },
      select: { id: true },
    }),
  ])

  return { customerId: customer.id, productId: product.id }
}

const stockOf = async (productId: number) => {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stock: true },
  })
  return product.stock
}

afterAll(async () => {
  /**
   * `customers` is data type `any`: `test/` sits outside every Nuxt tsconfig.
   * So the shape is written out by hand to match the `select`.
   *
   * The cleanup item in `docs/implementation/IMP-DAY6.md` will fixes the cause.
   */
  const customers = await prisma.customer.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    select: { id: true },
  })
  const customerIds: number[] = customers.map((customer: { id: number }) => customer.id)

  // Orders go before the products - foreign key on OrderItem.productId will refuses the delete.
  // OrderItem needs no delete of its own — Order.items is onDelete: Cascade in the schema.
  await prisma.order.deleteMany({ where: { customerId: { in: customerIds } } })
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })
  await prisma.product.deleteMany({ where: { sku: { startsWith: TEST_SKU_PREFIX } } })
  await prisma.$disconnect()
})

describe('createOrder — overselling', () => {
  it('lets exactly one of two simultaneous orders take the last item', async () => {
    const { customerId, productId } = await makeFixture(1)

    const results = await Promise.allSettled([
      createOrder({ customerId, items: [{ productId, qty: 1 }] }),
      createOrder({ customerId, items: [{ productId, qty: 1 }] }),
    ])

    const placed = results.filter(result => result.status === 'fulfilled')
    const refused = results.filter(result => result.status === 'rejected')

    expect(placed).toHaveLength(1)
    expect(refused).toHaveLength(1)
    expect(refused[0]?.reason).toBeInstanceOf(OutOfStockError)
    expect(await stockOf(productId)).toBe(0) // minimum zero, never negative
  })

  it('refuses a single order for more than is on the shelf', async () => {
    const { customerId, productId } = await makeFixture(2)

    await expect(createOrder({ customerId, items: [{ productId, qty: 3 }] }))
      .rejects.toBeInstanceOf(OutOfStockError)

    expect(await stockOf(productId)).toBe(2) // transaction rolled back, stock quantity no change
  })
})

describe('createOrder — price snapshot', () => {
  it('keeps the price the customer paid after the product is repriced', async () => {
    const { customerId, productId } = await makeFixture(5, 1000)

    const order = await createOrder({ customerId, items: [{ productId, qty: 2 }] })
    expect(order.totalCents).toBe(2000)

    await prisma.product.update({ where: { id: productId }, data: { priceCents: 5000 } })

    const orderLine = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: order.id },
      select: { unitPriceCents: true, qty: true },
    })
    expect(orderLine.unitPriceCents).toBe(1000) // still what they actually paid (per unit)

    const reread = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { totalCents: true },
    })
    expect(reread.totalCents).toBe(2000) // still what the total price paid during order
  })
})

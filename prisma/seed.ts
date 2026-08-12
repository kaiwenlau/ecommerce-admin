import { faker } from '@faker-js/faker'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

// nuxt-auth-utils hashes with @adonisjs/hash + scrypt. We cannot import its
// hashPassword() here because it reads Nuxt's runtime config, so we use the
// same library directly. The output is a self-describing PHC string, so
// verifyPassword() accepts it at login.
const hasher = new Hash(new Scrypt({}))

const CATEGORIES = ['Shirts', 'Trousers', 'Shoes', 'Jackets', 'Accessories', 'Bags']
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const

// Deterministic data, so re-seeding gives the same demo every time.
faker.seed(20260811)

async function main() {
  console.log('Clearing existing data...')
  // Order matters: children before parents.
  await prisma.orderStatusEvent.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.adminUser.deleteMany()

  // ---------------------------------------------------------------- admin
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234'

  await prisma.adminUser.create({
    data: { email, passwordHash: await hasher.make(password) },
  })
  console.log(`Admin user: ${email} / ${password}`)

  // ------------------------------------------------------------ customers
  await prisma.customer.createMany({
    data: Array.from({ length: 30 }, () => {
      const name = faker.person.fullName()
      return {
        name,
        // Derive the email from the name so the data looks coherent, and add a
        // unique suffix so faker never collides on the unique constraint.
        email: faker.internet.email({
          firstName: name.split(' ')[0],
          lastName: `${name.split(' ')[1]}${faker.string.numeric(3)}`,
        }).toLowerCase(),
      }
    }),
  })
  const customers = await prisma.customer.findMany({ select: { id: true } })
  console.log(`Created ${customers.length} customers`)

  // ------------------------------------------------------------- products
  await prisma.product.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({
      sku: `SKU-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      // Money is whole cents. $19.99 is 1999.
      priceCents: faker.number.int({ min: 499, max: 29999 }),
      // A few zero-stock products so the "out of stock" path is visible.
      stock: faker.helpers.weightedArrayElement([
        { weight: 8, value: faker.number.int({ min: 1, max: 120 }) },
        { weight: 1, value: 0 },
      ]),
      category: faker.helpers.arrayElement(CATEGORIES),
      status: faker.helpers.weightedArrayElement([
        { weight: 8, value: 'active' as const },
        { weight: 1, value: 'draft' as const },
        { weight: 1, value: 'archived' as const },
      ]),
    })),
  })
  const products = await prisma.product.findMany({
    select: { id: true, name: true, priceCents: true },
    orderBy: { id: 'asc' },
  })
  console.log(`Created ${products.length} products`)

  // --------------------------------------------------------------- orders
  // Build the orders first so we can compute totals from their line items.
  const orderPlans = Array.from({ length: 200 }, (_, index) => {
    const picked = faker.helpers.arrayElements(products, faker.number.int({ min: 1, max: 4 }))

    const items = picked.map(product => ({
      productId: product.id,
      // Snapshot: if the product is later renamed or repriced, this order
      // still shows what the customer actually bought and paid.
      name: product.name,
      unitPriceCents: product.priceCents,
      qty: faker.number.int({ min: 1, max: 3 }),
    }))

    // The first 3 orders are forced to 'pending' and to contain products 1-3.
    // Day 5's bulk archive refuses to archive a product with unfulfilled
    // orders, so this guarantees the partial-failure demo has real failures.
    const forced = index < 3

    return {
      customerId: faker.helpers.arrayElement(customers).id,
      status: forced ? 'pending' as const : faker.helpers.arrayElement(ORDER_STATUSES),
      totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0),
      createdAt: faker.date.between({ from: '2026-02-01', to: '2026-08-10' }),
      items: forced
        ? [{
            productId: products[index]!.id,
            name: products[index]!.name,
            unitPriceCents: products[index]!.priceCents,
            qty: 1,
          }]
        : items,
    }
  })

  await prisma.order.createMany({
    data: orderPlans.map(({ items: _items, ...order }) => order),
  })
  const orders = await prisma.order.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  // Recompute totals for the forced orders, whose items were replaced above.
  await prisma.orderItem.createMany({
    data: orderPlans.flatMap((plan, i) =>
      plan.items.map(item => ({ ...item, orderId: orders[i]!.id })),
    ),
  })

  for (const [i, plan] of orderPlans.entries()) {
    const total = plan.items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0)
    if (total !== plan.totalCents) {
      await prisma.order.update({
        where: { id: orders[i]!.id },
        data: { totalCents: total },
      })
    }
  }

  const itemCount = await prisma.orderItem.count()
  console.log(`Created ${orders.length} orders with ${itemCount} line items`)

  // -------------------------------------------------- audit trail history
  // Give every order the status trail it would have accumulated.
  // Every order starts as `pending`, so every trail must start there
  // including `cancelled` status, which were pending, paid, until someone cancelled them.
  const flow = ['pending', 'paid', 'shipped', 'delivered'] as const
  const placed = await prisma.order.findMany({ select: { id: true, status: true, createdAt: true } })

  await prisma.orderStatusEvent.createMany({
    data: placed.flatMap((order) => {
      const path = order.status === 'cancelled'
        ? (['pending', 'paid', 'cancelled'] as const)
        : flow.slice(0, flow.indexOf(order.status) + 1)

      return path.map((toStatus, step) => ({
        orderId: order.id,
        fromStatus: step === 0 ? null : path[step - 1]!,
        toStatus,
        changedBy: email,
        createdAt: new Date(order.createdAt.getTime() + step * 86_400_000),
      }))
    }),
  })
  console.log(`Created ${await prisma.orderStatusEvent.count()} status events`)
}

main()
  .then(async () => {
    console.log('Seed complete.')
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })

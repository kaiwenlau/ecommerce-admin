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

const main = async () => {
  console.log('Clearing existing data...')
  // Order matters: children before parents.
  await prisma.orderStatusEvent.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.adminUser.deleteMany()

  // admin
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234'
  await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await hasher.make(password),
    },
  })
  console.log(`Admin user: ${email} / ${password}`)

  // customers
  await prisma.customer.createMany({
    data: Array.from({ length: 30 }, () => {
      const name = faker.person.fullName()
      return {
        name,
        // Derive the email from the name and add a unique suffix,
        // so faker never collides on unique constraint
        email: faker.internet.email({
          firstName: name.split(' ')[0],
          lastName: `${name.split(' ')[1]}${faker.string.numeric(3)}`,
        }).toLowerCase(),
      }
    }),
  })
  const customers = await prisma.customer.findMany({
    select: { id: true },
  })
  console.log(`Created ${customers.length} customers`)

  // products
  await prisma.product.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({
      sku: `SKU-${String(i + 1).padStart(4, '0')}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 499, max: 29999 }), // price in whole cents
      stock: faker.helpers.weightedArrayElement([
        {
          weight: 8,
          value: faker.number.int({ min: 1, max: 120 }),
        },
        {
          weight: 1,
          value: 0,
        }, // some zero-stock products to display out-of-stock condition
      ]),
      category: faker.helpers.arrayElement(CATEGORIES),
      status: faker.helpers.weightedArrayElement([
        {
          weight: 8,
          value: 'active' as const,
        },
        {
          weight: 1,
          value: 'draft' as const,
        },
        {
          weight: 1,
          value: 'archived' as const,
        },
      ]),
    })),
  })
  const products = await prisma.product.findMany({
    select: { id: true, name: true, priceCents: true },
    orderBy: { id: 'asc' },
  })
  console.log(`Created ${products.length} products`)

  // orders - build orders first, then orderItems
  const orderPlans = Array.from({ length: 200 }, (_, index) => {
    const pickedProduct = faker.helpers.arrayElements(products, faker.number.int({ min: 1, max: 4 }))

    // Snapshot name and price of the product
    // shows what actually bought and paid if product later renamed or repriced
    const items = pickedProduct.map(product => ({
      productId: product.id,
      name: product.name,
      unitPriceCents: product.priceCents,
      qty: faker.number.int({ min: 1, max: 3 }),
    }))

    // The first 3 orders are forced to 'pending' and to contain products 1-3
    // Day 5's bulk archive refuses to archive a product with unfulfilled orders,
    // so this guarantees the partial-failure demo has real failures
    const isForced = index < 3

    return {
      customerId: faker.helpers.arrayElement(customers).id,
      status: isForced ? 'pending' as const : faker.helpers.arrayElement(ORDER_STATUSES),
      totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0),
      createdAt: faker.date.between({ from: '2026-02-01', to: '2026-08-10' }),
      items: isForced
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
  // Recompute totals for the forced orders
  for (const [i, plan] of orderPlans.entries()) {
    const total = plan.items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0)
    if (total !== plan.totalCents) {
      await prisma.order.update({
        where: { id: orders[i]!.id },
        data: { totalCents: total },
      })
    }
  }

  // orderItems - 200 orders with 1-4 items each (except first 3 forced orders 1 item each)
  const orders = await prisma.order.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  })
  await prisma.orderItem.createMany({
    data: orderPlans.flatMap((plan, i) =>
      plan.items.map(item => ({
        ...item,
        orderId: orders[i]!.id,
      })),
    ),
  })
  const itemCount = await prisma.orderItem.count()
  console.log(`Created ${orders.length} orders with ${itemCount} line items`)

  // audit trail history - accumulated status of each order, every order starts as `pending`
  const flow = ['pending', 'paid', 'shipped', 'delivered'] as const
  const placed = await prisma.order.findMany({
    select: { id: true, status: true, createdAt: true },
  })

  // `cancelled` status were pending or pending-paid
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

  // soft deletions - no hard delete
  // Create 3 new products for soft-deletion.
  // The orders above either `pending` or `paid` order, Day 3's `checkRemovable()` will refuses to delete
  await prisma.product.createMany({
    data: Array.from({ length: 3 }, (_, i) => ({
      sku: `SKU-${String(i + 51).padStart(4, '0')}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 499, max: 29999 }), // price in whole cents
      stock: faker.number.int({ min: 1, max: 120 }),
      category: faker.helpers.arrayElement(CATEGORIES),
      status: 'active' as const,
    })),
  })
  const doomedProduct = await prisma.product.findMany({
    where: { sku: { in: ['SKU-0051', 'SKU-0052', 'SKU-0053'] } },
    select: { id: true, sku: true, name: true, priceCents: true },
    orderBy: { id: 'asc' },
  })

  // Find the first delivered order, add a doom product, update the order total
  const finishedOrder = await prisma.order.findFirst({
    where: { status: 'delivered' },
    select: { id: true, totalCents: true },
    orderBy: { id: 'asc' },
  })
  if (finishedOrder) {
    const line = doomedProduct[0]! // non-null assertion
    await prisma.orderItem.create({
      data: {
        orderId: finishedOrder.id,
        productId: line.id,
        name: line.name,
        unitPriceCents: line.priceCents,
        qty: 1,
      },
    })
    await prisma.order.update({
      where: { id: finishedOrder.id },
      data: { totalCents: finishedOrder.totalCents + line.priceCents },
    })
  }

  // Irreversible. Deleting does NOT touch `status`, keeps whatever status it had.
  await prisma.product.updateMany({
    where: { id: { in: doomedProduct.map(product => product.id) } },
    data: { deletedAt: faker.date.between({ from: '2026-06-01', to: '2026-08-10' }) },
  })

  // Create new product with reused SKU - partial unique index in action
  const reusedSku = doomedProduct[0]!.sku
  await prisma.product.create({
    data: {
      sku: reusedSku,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      priceCents: faker.number.int({ min: 499, max: 29999 }),
      stock: faker.number.int({ min: 1, max: 120 }),
      category: faker.helpers.arrayElement(CATEGORIES),
      status: 'active',
    },
  })
  const live = await prisma.product.count({
    where: { deletedAt: null },
  })
  const deleted = await prisma.product.count({
    where: { deletedAt: { not: null } },
  })
  console.log(`Products: ${live} live, ${deleted} soft-deleted (SKU ${reusedSku} reused by a live product)`)
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

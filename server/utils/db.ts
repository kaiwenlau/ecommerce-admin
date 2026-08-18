import { PrismaPg } from '@prisma/adapter-pg'
import { MESSAGES } from '#shared/constants'
import { PrismaClient } from '~~/generated/prisma/client'

// Prisma 7 no longer bundles a query engine. It connects through a driver
// adapter instead, so the pg adapter below is required — v6 guides that just
// call `new PrismaClient()` will not work here.

// The client is cached on globalThis because Nuxt's dev server hot-reloads this
// module on every change. Without the cache, each reload would open a new pool
// and eventually exhaust Postgres connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const createClient = () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(MESSAGES.missingDatabaseUrl)
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

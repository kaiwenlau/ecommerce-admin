import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Prisma 7 moved the datasource URL out of schema.prisma and into this file.
// The `url` below is what the CLI (migrate, studio, db seed) connects with.
// The app itself connects through the driver adapter in server/utils/db.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})

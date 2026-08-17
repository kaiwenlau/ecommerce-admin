# Day 1 — Tuesday 11 August

**Goal:** Install everything. Database is running with fake data in it. No screens yet.

## Install everything

```bash
npm i @nuxt/ui @prisma/client @prisma/adapter-pg zod pinia nuxt-auth-utils
npm i -D prisma @pinia/nuxt tsx @faker-js/faker @nuxt/eslint vitest @nuxt/test-utils dotenv @adonisjs/hash
```

**What each one does:**

| Package | What it is for |
|---|---|
| `@nuxt/ui` | Buttons, tables, modals, forms. Also brings Tailwind CSS, dark mode, and icons |
| `@prisma/client` | Talks to the database from my code |
| `@prisma/adapter-pg` | Connects Prisma to Postgres. **Prisma 7 needs this** — older versions did not |
| `zod` | Checks that data is valid. Used by the browser and the server |
| `pinia` | Holds the tick-box selection for bulk actions |
| `nuxt-auth-utils` | Login, sessions, password hashing |
| `prisma` | The command line tool: build the database, make migrations, view data |
| `@pinia/nuxt` | Plugs Pinia into Nuxt |
| `tsx` | Runs my seed script, which is TypeScript |
| `@faker-js/faker` | Makes fake names, products and prices that look real |
| `@nuxt/eslint` | Finds mistakes and formats my code |
| `vitest` | Runs my 2 tests |
| `@nuxt/test-utils` | Lets Vitest start a Nuxt app for testing |
| `dotenv` | Reads `.env` for the Prisma command line. **Prisma 7 needs this** — its new `prisma.config.ts` imports it |
| `@adonisjs/hash` | Hashes the admin password in the seed. Needed because `hashPassword()` reads Nuxt's runtime config, which a standalone `tsx` script does not have |

**Not installing:** `pg`, `@types/pg` (already inside `@prisma/adapter-pg`), `tailwindcss` (inside `@nuxt/ui`), `@tanstack/vue-table` (inside `@nuxt/ui`, and the standalone one is a different
version that would clash).

## Tasks

**Install — runtime packages**

- [x] `npm i @nuxt/ui`
- [x] `npm i @prisma/client`
- [x] `npm i @prisma/adapter-pg`
- [x] `npm i zod`
- [x] `npm i pinia`
- [x] `npm i nuxt-auth-utils`

**Install — dev packages**

- [x] `npm i -D prisma`
- [x] `npm i -D @pinia/nuxt`
- [x] `npm i -D tsx`
- [x] `npm i -D @faker-js/faker`
- [x] `npm i -D @nuxt/eslint`
- [x] `npm i -D vitest`
- [x] `npm i -D @nuxt/test-utils`
- [x] `npm i -D dotenv` ← not in the original plan, Prisma 7 needs it
- [x] `npm i -D @adonisjs/hash` ← not in the original plan; the seed was importing it without declaring it

**Setup**

- [x] Add modules to `nuxt.config.ts`: `@nuxt/ui`, `@pinia/nuxt`, `nuxt-auth-utils`, `@nuxt/eslint`
- [x] Turn on formatting: `eslint: { config: { stylistic: true } }`
- [x] Write `app/assets/css/main.css` — the Tailwind v4 + Nuxt UI entry point
- [x] Write `docker-compose.yml` with one Postgres 16 service
- [x] Run `docker compose up -d`
- [x] Write `.env` — `DATABASE_URL` and `NUXT_SESSION_PASSWORD`
- [x] Write `.env.example` with fake values, so the reviewer knows what is needed
- [x] Write `prisma.config.ts` — Prisma 7 keeps the database URL here now, not in the schema
- [x] Write `prisma/schema.prisma` — 6 tables (below)
- [x] Run `npx prisma migrate dev --create-only`
- [x] **Hand-add the 2 SQL rules to the migration file** (below), then run `npx prisma migrate dev`
- [x] Write `server/utils/db.ts` — one shared Prisma client
- [x] Write `prisma/seed.ts` with Faker — 50 products, 30 customers, 200 orders
- [x] Run the seed. Check the numbers in `npx prisma studio`
- [x] Add `db:*` scripts to `package.json`, and `generated` to `.gitignore`

## The 6 tables

```
Product     id, sku, name, description, priceCents, stock, category, status, deletedAt, createdAt, updatedAt

Customer    id, name, email, createdAt

Order       id, customerId, status, totalCents, createdAt

OrderItem   id, orderId, productId, name, unitPriceCents, qty

OrderStatusEvent  id, orderId, fromStatus, toStatus, changedBy, createdAt

AdminUser   id, email, passwordHash
```

Note:
1. Money is always whole cents. `$19.99` is stored as `1999`. Never a decimal.
2. OrderItem name and price are COPIES, taken when the order is made.
3. OrderStatusEvent is the audit trail for Day 5.
4. **`Product.status` and `Product.deletedAt` are two different features.** `status` (`draft`/`active`/`archived`) is a lifecycle state — archiving is reversible and keeps the SKU. `deletedAt` is soft delete — not reversible here, and it frees the SKU via the partial index below. Neither substitutes for the other. Full rules in [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3.

## The 2 SQL rules to add by hand

Prisma cannot write these. I add them to the generated migration file before running it.

```sql
ALTER TABLE "Product" ADD CONSTRAINT "product_stock_non_negative" CHECK ("stock" >= 0);
CREATE UNIQUE INDEX "product_sku_active" ON "Product" ("sku") WHERE "deletedAt" IS NULL;
```

- Rule 1 stops stock ever going below zero. This is the base of the Day 5 stock feature.
- Rule 2 lets a deleted product's SKU be used again.

**Do not skip this.** If I forget, the stock promise on Day 5 does not really exist and I cannot demo it.

### Done when

- [x] `docker compose up -d` gives me a running database
- [x] `npx prisma studio` shows 50 products, 30 customers, 200 orders
- [x] This is **refused** by the database:
      `UPDATE "Product" SET stock = -1 WHERE id = 1;`
- [x] `npm run dev` starts with no errors

That last check is the important one. If the database accepts `-1`, the hand-written SQL did not
get applied. Fix it now, not on Day 5.

## Expected blockers

Written **before** starting. The Blocker log below is what actually happened.

**Most likely today:** Prisma 7 being different from every guide online.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| ✅ **Prisma 7 guides online are out of date** | `prisma-client-js` is not a valid generator, or the schema will not generate | v7 dropped the built-in engine and moved the database URL out of the schema. Run `prisma init` in a scratch folder to see what v7 really produces, then copy that | High |
| ❌ Port 5432 already used | `docker compose up` fails with "port is already allocated" | Something else runs Postgres. Map `5433:5432` in Compose and update `DATABASE_URL` | Medium |
| ❌ `NUXT_SESSION_PASSWORD` too short | App fails at startup with an unclear message | Must be **32 characters or more** | Medium |
| ❌ Prisma client not found | `Cannot find module` when importing the client | Run `npx prisma generate` after any schema change | Medium |
| ❌ Seed is slow | Seeding takes minutes, not seconds | Do not insert 200 orders one by one. Use `createMany` | Low |

✅ = happened · ❌ = did not happen

**Two blockers I did not predict:** the Docker daemon not running, and VS Code's built-in formatter fighting ESLint over semicolons. Both are in the log below. Neither was a design problem — but it shows the predictions were about the library I was worried about, not about the environment around it. Worth widening the net on later days.

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **Prisma 7 changed three things at once.** The generator is now `prisma-client` (not `prisma-client-js`), it needs an explicit `output` path, and the database URL moved out of `schema.prisma` into a new `prisma.config.ts` file | Every guide and blog post online is written for Prisma 6. Following them produces a schema that will not generate | Ran `prisma init` in a scratch folder to see what v7 actually generates, then copied that shape. Also had to install `dotenv`, which the new config file imports | ~30 min |
| **Docker daemon was not running.** The `docker` command existed, so it looked installed, but every call failed with "cannot connect to the Docker API" | The error points at a socket path, not at "Docker Desktop is closed", so it reads like a broken install | Started Docker Desktop and waited for the daemon | ~5 min |
| **Cannot use `hashPassword()` in the seed script.** nuxt-auth-utils' version reads Nuxt's runtime config, which does not exist in a standalone `tsx` script | Would have meant either running the seed through Nuxt, or hashing with the wrong algorithm and being unable to log in | Read the module source. It is a thin wrapper over `@adonisjs/hash` with the scrypt driver, so the seed calls that directly. The hash is a self-describing PHC string, so `verifyPassword()` still accepts it at login | ~15 min |
| **VS Code and ESLint fought over semicolons.** Saving `nuxt.config.ts` added a semicolon that ESLint immediately marked red: `Extra semicolon (@stylistic/semi)` | I chose ESLint over Prettier so only one tool formats. But VS Code has its **own** built-in formatter that runs on save and wants semicolons | Added `.vscode/settings.json` turning off format-on-save and running ESLint's fix on save instead. Added `.vscode/extensions.json` marking Prettier as unwanted | ~10 min |

**Total lost: about 1 hour.** All four were setup or tooling problems, not design problems. Two worth keeping in mind: the Prisma 7 one will hit anyone starting on v7 today, and the semicolon one is a direct consequence of choosing a single formatter — the editor is the second formatter nobody thinks about.

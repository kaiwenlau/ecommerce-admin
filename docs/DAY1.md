# Day 1 — Tuesday 11 August

**Goal:** database running with realistic fake data. No screens.

**Result:** done. All checks passed.

---

## What works now

- Postgres 16 runs in Docker.
- 6 tables exist, built from migrations (not a hand-written SQL dump).
- 50 products, 30 customers, 200 orders, 478 order lines, 1 admin user.
- The database **refuses** to let stock go below zero.
- A deleted product's SKU can be used again.
- `npm run dev` starts and returns a page.

---

## Packages added — 14

I installed everything for the whole project on Day 1, so I never have to stop mid-feature later.

### Runtime — 6

| Package | Version | What it is for |
|---|---|---|
| `@nuxt/ui` | 4.10.0 | Buttons, tables, modals, forms. Also brings Tailwind CSS v4, dark mode and icons |
| `@prisma/client` | 7.9.1 | Talks to the database from my code |
| `@prisma/adapter-pg` | 7.9.1 | Connects Prisma to Postgres. Prisma 7 needs this; older versions did not |
| `zod` | 4.4.3 | Checks data is valid. Same rules used by browser and server |
| `pinia` | 4.0.2 | Will hold the tick-box selection for bulk actions (Day 5) |
| `nuxt-auth-utils` | 0.5.30 | Login, sessions, password hashing |

### Dev — 8

| Package | Version | What it is for |
|---|---|---|
| `prisma` | 7.9.1 | Command line: migrations, seeding, database viewer |
| `@pinia/nuxt` | 1.0.1 | Plugs Pinia into Nuxt |
| `tsx` | 4.23.12 | Runs the seed script, which is TypeScript |
| `@faker-js/faker` | 10.5.0 | Makes fake names, products and prices that look real |
| `@nuxt/eslint` | 1.17.0 | Finds mistakes and formats code |
| `vitest` | 4.1.10 | Will run the 2 tests (Day 5) |
| `@nuxt/test-utils` | 4.1.0 | Lets Vitest start a Nuxt app |
| `dotenv` | 17.4.2 | **Not planned.** Prisma 7's new config file imports it |

### Not installed, on purpose

- `pg` and `@types/pg` — already inside `@prisma/adapter-pg`.
- `tailwindcss` — already inside `@nuxt/ui`.
- `@tanstack/vue-table` — already inside `@nuxt/ui` at v8. The standalone package is v9 and would clash.
- `prettier` — `@nuxt/eslint` does the formatting instead.

---

## Files added — 14

### Documentation

Roughly half of Day 1 went into writing these, not into code.

| File | Lines | What it does |
|---|---|---|
| `docs/DECISIONS.md` | 427 | Every tool choice, what I rejected, and the downside of each. The reviewer's entry point |
| `docs/IMPLEMENTATION.md` | 569 | The 6-day plan: tasks, expected blockers, blocker logs, demo script |
| `docs/DAY1.md` | this file | My own log of what changed and why. Not a deliverable |

### Code and config

| File | Lines | What it does |
|---|---|---|
| `docker-compose.yml` | 25 | Runs Postgres 16. Has a health check so `--wait` blocks until the database really accepts connections |
| `prisma.config.ts` | 16 | **New in Prisma 7.** Holds the database URL and points at the seed script |
| `prisma/schema.prisma` | 121 | The 6 tables |
| `prisma/migrations/20260811035304_init/migration.sql` | 146 | The generated SQL, plus 2 rules I added by hand |
| `prisma/seed.ts` | 184 | Fills the database with Faker data |
| `server/utils/db.ts` | 31 | One shared Prisma client for the whole server |
| `app/assets/css/main.css` | 2 | Tailwind v4 + Nuxt UI entry point |
| `.env` | 4 | The real local settings. Not committed |
| `.env.example` | 4 | Placeholders and starting defaults, so a reviewer knows what is needed and can copy it straight to `.env` |
| `.vscode/settings.json` | 25 | Makes ESLint the only formatter, so the editor stops adding semicolons ESLint rejects |
| `.vscode/extensions.json` | 13 | Recommends the ESLint extension, marks Prettier as unwanted |

`eslint.config.mjs` (6 lines) was created automatically by `@nuxt/eslint` on first run.

---

## Files changed — 3

### `nuxt.config.ts`

```diff
+ modules: ['@nuxt/ui', '@pinia/nuxt', 'nuxt-auth-utils', '@nuxt/eslint'],
+ css: ['~/assets/css/main.css'],
+ eslint: { config: { stylistic: true } },
```

`stylistic: true` is what lets me skip Prettier. ESLint does the formatting too.

### `package.json`

Added short commands so nothing needs remembering:

| Command | What it does |
|---|---|
| `npm run db:up` | Start the database |
| `npm run db:down` | Stop the database |
| `npm run db:migrate` | Create and apply a migration after I change the schema. For building |
| `npm run db:deploy` | Apply the migrations already in the repo. For a fresh clone |
| `npm run db:seed` | Fill with fake data |
| `npm run db:reset` | Wipe and rebuild. **For resetting before the demo** |
| `npm run db:studio` | Open the database viewer |
| `npm run lint` / `lint:fix` | Check and fix code |
| `npm test` | Run tests |

Also changed `postinstall` to `prisma generate && nuxt prepare`, so a fresh `npm install` builds the
Prisma client automatically.

### `.gitignore`

Added `generated`. The Prisma client is generated code — it is rebuilt from `schema.prisma`, so it
should not be committed.

---

## Files removed

Nothing was deleted this day.

---

## The 6 tables

```
Product     id, sku, name, description, priceCents, stock, category,
            status, deletedAt, createdAt, updatedAt

Customer    id, name, email, createdAt

Order       id, customerId, status, totalCents, createdAt

OrderItem   id, orderId, productId, name, unitPriceCents, qty
            ↑ name and price are COPIES, taken when the order is made

OrderStatusEvent   id, orderId, fromStatus, toStatus, changedBy, createdAt
                   ↑ the audit trail for Day 5

AdminUser   id, email, passwordHash
```

Three choices worth explaining:

**1. Money is whole cents.** `$19.99` is stored as `1999`.

Computers cannot store `0.1` exactly, so `0.1 + 0.2` gives `0.30000000000000004`. Across 200 orders
that makes the revenue total wrong. Whole numbers have no such problem.

**2. `OrderItem` copies the name and price.** It does not look them up.

If it looked up the current price, then changing a product's price would silently rewrite every past
order. A customer who paid $10 in January would suddenly show as having paid $15. An order is a
record of what happened, not a live view of the product table.

**3. `Product.deletedAt` instead of really deleting.**

A product can appear in 40 past orders. Really deleting it either breaks those orders or destroys
sales history.

---

## The 2 SQL rules I added by hand

Prisma's schema language cannot express either of these, so I generated the migration **without running it** (`--create-only`), added the SQL, then applied it.

```sql
-- Stock can never go below zero.
ALTER TABLE "Product"
  ADD CONSTRAINT "product_stock_non_negative" CHECK ("stock" >= 0);

-- SKU is unique only among products that are NOT deleted.
CREATE UNIQUE INDEX "product_sku_active"
  ON "Product" ("sku")
  WHERE "deletedAt" IS NULL;
```

**Why rule 1 matters:** it is the base of the Day 5 "cannot oversell" feature. Careful code is not a guarantee. A database rule is. Even a bug, a bad migration, or someone editing the database by hand cannot get past it.

**Why rule 2 matters:** a normal unique index would keep a deleted product's SKU locked forever. A partial index frees it once the product is marked deleted.

### I tested both, I did not assume

| Test | Expected | Actual |
|---|---|---|
| `UPDATE "Product" SET stock = -1` | Rejected | **Rejected** — `product_stock_non_negative` |
| Insert a second product with the same SKU, both active | Rejected | **Rejected** — `product_sku_active` |
| Mark the first deleted, then insert the same SKU | Allowed | **Allowed** |

This matters because if the hand-written SQL had silently not applied, I would only have found out on Day 5, when the main bonus feature could not be demonstrated.

---

## The seed data

Set up so later demos actually work, not just to fill tables.

- **Fixed random seed** (`faker.seed(20260811)`). Re-running gives the same data every time, so the demo looks identical each run.
- **The first 3 orders are forced** to `pending` and to contain products 1, 2 and 3. Day 5's bulk archive refuses to archive a product that has unfinished orders, so this **guarantees** the partial-failure demo has real failures to show. Without this I would be relying on luck.
- **5 products have zero stock**, so the out-of-stock state is visible straight away.
- **491 status events** were generated, so orders already have a believable history for the Day 5 audit trail.

### Checked after seeding

| Check | Result |
|---|---|
| Row counts | 50 products, 30 customers, 200 orders, 478 lines, 1 admin |
| Orders whose total does not match their line items | **0** |
| Products with unfinished orders (needed for Day 5) | Present |
| Prices are whole cents | 672 to 29367 |

---

## Problems I hit

### 1. Prisma 7 changed three things at once (~30 min)

Every guide online is written for Prisma 6. On version 7:

- the generator is `prisma-client`, not `prisma-client-js`
- it needs an explicit `output` folder
- **the database URL moved out of `schema.prisma`** into a new `prisma.config.ts` file
- that config file imports `dotenv`, which was not in my plan

**How I solved it:** instead of guessing, I ran `prisma init` in a scratch folder to see what version 7 actually produces, then copied that shape. Faster and more reliable than reading blog posts written for the old version.

### 2. Docker was installed but not running (~5 min)

The `docker` command existed, so it looked fine. Every call failed with "cannot connect to the Docker API at unix:///...". The error points at a socket file, so it reads like a broken install rather than "the app is closed".

**How I solved it:** started Docker Desktop and waited for the daemon.

### 3. Could not use `hashPassword()` in the seed script (~15 min)

nuxt-auth-utils' `hashPassword()` reads Nuxt's runtime config, which does not exist in a standalone `tsx` script.

If I had hashed the password with a different method, login would have failed on Day 2 — and it would have looked like a login bug, not a seeding bug.

**How I solved it:** read the module's source. It is a thin wrapper around `@adonisjs/hash` using the scrypt driver, so the seed calls that library directly. The result is a self-describing PHC string, so `verifyPassword()` still accepts it at login.

### 4. VS Code and ESLint fought over semicolons (~10 min)

Saving `nuxt.config.ts` in VS Code added a semicolon, and ESLint immediately marked it red: `Extra semicolon (@stylistic/semi)`.

**The cause:** I chose ESLint instead of Prettier so there would be only one formatter. But VS Code has its **own** built-in TypeScript formatter, and it runs on save. It wants semicolons. ESLint does not. So the two disagreed on every save.

This is the exact problem `eslint-config-prettier` normally solves — except the second formatter here is the editor itself, not Prettier.

**How I solved it:** added `.vscode/settings.json` that turns off the built-in format-on-save and runs ESLint's auto-fix on save instead:

```json
"editor.formatOnSave": false,
"editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
```

Also added `.vscode/extensions.json`, which recommends the ESLint extension and marks Prettier as **unwanted** — so VS Code does not suggest installing the thing this project deliberately avoids.

Committing these means the next person gets the working setup without hitting the same conflict.

**Total lost: about 1 hour.** All four were setup or tooling problems. None were design problems.

---

## How to run it

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```

**Why `.env` comes first:** `npm install` runs `postinstall`, which runs `prisma generate`, which reads `prisma.config.ts`, which reads `DATABASE_URL`. On a fresh clone that variable does not exist until `.env` does.

**Why `db:deploy` and not `db:migrate`:** `deploy` applies the migrations already in the repo. `db:migrate` is `prisma migrate dev`, which *creates* a new migration from schema changes — right while building, wrong on a clone.

Login: `admin@example.com` / `admin1234`

---

## Next — Day 2 (Wed 12 Aug)

- Login working end to end, with the check on the **server**, not just hidden in the UI.
- Product list with paging, search, one filter and two sortable columns — all done in SQL.
- Filter state kept in the URL so it survives a refresh and can be shared.
- Clear the tick-box selection whenever the query changes, so the count never lies about what is selected.
- The 4 UI states on the list itself, not retrofitted on Day 3. It is the first screen anyone opens.
- A note to myself at the end of the day, because Day 3 is 4 days later.

**Most likely blocker:** an infinite loop in the URL state, where a watcher writes to the URL and that triggers the same watcher again.

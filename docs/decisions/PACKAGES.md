# Packages

## Nuxt 4

**Pick:** Nuxt 4, not Nuxt 3.

**Why:**

- Nuxt 4 has a `shared/` folder. Code there is used by the browser **and** the server.
- So I write the "product name must not be empty" rule **once**.
- In Nuxt 3 I would write it twice. Two copies drift apart over time.

**Example:**

```
shared/schemas/product.ts   ← one file
   ├─ used by the form in the browser
   └─ used by the API on the server
```

**Rejected:** Nuxt 3. It works, but I would lose the shared folder, and it reaches end-of-life on 31 July 2026.

**Downside:** Fewer blog posts and Stack Overflow answers exist for Nuxt 4. The official docs are fine, so this did not hurt.

---

## PostgreSQL

**Pick:** PostgreSQL 16, started with Docker.

**Why:** Two features do real work in this project.

### 1. It can refuse bad data

```sql
ALTER TABLE "Product"
  ADD CONSTRAINT "product_stock_non_negative" CHECK ("stock" >= 0);
```

**What this actually is:** a rule stored *inside the table itself*. Once added, it becomes part of what the `Product` table is.

**How Postgres detects the bad write:**

1. New `INSERT` or `UPDATE` carries new value for `stock`.
2. Before write the row to disk, Postgres evaluates the expression `stock >= 0` against the new row.
3. TRUE: The write proceeds as normal.
4. FALSE: Postgres **raises an error and does not write the row**. If the write was inside a transaction, the whole transaction is aborted — so any other changes in it are undone too.

**How it avoids the bad data:** The row never reaches the table. There is no "saved but invalid" state to clean up afterwards.

**Proof, run on day 1:**

```
=> UPDATE "Product" SET stock = -1 WHERE sku = 'TEST-01';

ERROR:  new row for relation "Product" violates check constraint "product_stock_non_negative"
DETAIL:  Failing row contains (1, TEST-01, Test Product, null, 1999, -1, test, active, ...)
```

**And it takes the rest of the transaction down with it**. An order is several writes at once — create the order, add the lines, reduce the stock. If
the stock write is refused, Postgres refuses to do any more work in the transaction. So there is no way to end up with an order that exists but was never paid for in stock.

**Why put the rule there instead of in my code?** Because the database is the one place every write must pass through. The check runs no matter where the write came from (API code, Prisma query, hard-coded SQL). Application code only protects the paths I remembered to guard. A constraint removes the possibility.

### 2. It lets a deleted product's code be reused

I do not really delete products (soft delete) - set a `deletedAt` date. A plain `UNIQUE` rule on `sku` would then keep `SHIRT-01` reserved forever, even though that product is gone from the shop. Postgres solves this with a **partial index** — an index with a `WHERE` on it:

```sql
CREATE UNIQUE INDEX "product_sku_active"
  ON "Product" ("sku")
  WHERE "deletedAt" IS NULL;
```

**How it works:** a unique index enforces "no duplicates" across the rows *that are in the index*.

- A product with `deletedAt = NULL` - not deleted → **is** in the index.
- A product with a `deletedAt` date - deleted → **is not** in the index.

**The index keys on `deletedAt` only.** It knows nothing about `status`, so **archiving does not free a SKU** — an archived product is still in the index and still owns `SHIRT-01`. Only deleting frees it. Full rules in [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) §3.

(The name `product_sku_active` is older than that distinction. "Active" there means "not deleted", not `status = 'active'`.)

**Rejected:** MySQL. I know MySQL better, but it is weaker to implement feature 1 and it cannot do the feature 2. The code I write is nearly the same either way, so my MySQL knowledge still carries over.

**Downside:** I am less confident with my knowledge about Postgres, but Docker handles setup and Prisma Studio handles looking at data, so this is manageable.

---

## Prisma

**Pick:** Prisma 7, with the `@prisma/adapter-pg` driver.

**Why:**

- I describe my tables in one file (`schema.prisma`), and one command builds the database and writes the migration.
- Fetching linked data is short. This one query powers the whole "what did this customer buy" page:

```ts
prisma.customer.findUnique({
  where: { id },
  include: { orders: { include: { items: { include: { product: true } } } } },
})
```

**Rejected:** Drizzle. It sits closer to raw SQL and my MySQL knowledge would transfer straight over. For a real long-term project I would pick it. Prisma wins here only because it is faster to set up, and this project has 6 days and no future.

Prisma cannot do two things I need. Both have a fix, and they are the interesting part.

### Problem 1: Prisma cannot lock a row

**The problem:** 1 item left in stock. Two people click Buy at the same time. Both checks say "yes, 1 left". Both orders go through. Now stock is -1.

The usual fix is `SELECT ... FOR UPDATE`, which locks the row. Prisma has no command for this.

**My fix:** put the check inside the update itself.

```ts
const { count } = await tx.product.updateMany({
  where: { id, stock: { gte: qty } },   // only update IF enough stock
  data:  { stock: { decrement: qty } },
})
if (count === 0) throw new OutOfStockError(id)
```

**Why it works:** this is **one** command, not a read then a write, so it cannot be interrupted halfway. A's command updates 1 row and stock hits 0. B's then matches no row, updates **0**, and `count === 0` tells me to show "out of stock".

I think this is better than locking the row, not a worse substitute. It is the normal way to do this in SQL.

**Also considered:** serializable isolation with a retry loop (more moving parts, and retries need a limit), and raw SQL with `FOR UPDATE` (drops out of Prisma for something it can handle).

### Problem 2: Prisma cannot write two Postgres rules I need

`schema.prisma` cannot express a `CHECK` rule or a "unique only when not deleted" index — the two rules in the PostgreSQL section above.

**My fix:** generate the migration without running it, add the SQL by hand, then apply it.

```bash
npx prisma migrate dev --create-only
```

15 minutes, done once on day one. I am writing it down because it is easy to skip, and then the stock guarantee quietly does not exist.

### Side effect: I write the Zod rules by hand

Drizzle can generate validation rules from your tables. Prisma has no official tool for it, so I wrote 5 schemas by hand.

That is fine, and probably better — the form and the table are not the same shape. The table has `id`, `createdAt` and `deletedAt`; the form has none of them, and it sends price as text (`"19.99"`) where the table stores `1999`. A generated copy would need overriding on almost every field.

**Downside:** if I change a column and forget the Zod rule, nothing warns me. The two tests catch the important case.

---

## Zod

**Pick:** Zod 4, with the rules in `shared/` so both sides use them.

**Why:** the brief only needs an error shape, which I could hand-write. Zod earns its place for other reasons:

| What Zod does                             | Without Zod                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Drops keys I did not declare              | Pick fields one by one on every endpoint, and never forget                   |
| One rule file in `shared/`                | Write every rule twice, browser and server, and watch them drift             |
| Returns a typed object                    | `readBody` returns `any`, so I write the type separately and hope it matches |
| One `.transform()` for `"19.99"` → `1999` | Convert in every handler that touches a price                                |

- Security: Row 1 - `readBody` returns whatever was sent, so `create({ data: body })` would let a `curl` set `stock` or `deletedAt`. `parse()` strips them.
- `status` is different: it **is** on the form, so Zod keeps it. But it may only be `draft`/`active`/`archived`, and a move to `archived` still has to clear `checkRemovable()`. Zod decides the shape is legal; only the guard decides the move is allowed.
- URL: someone edits `?page=abc` by hand, Zod turns it back into `page=1` instead of crashing the page.

**Rejected:** Valibot and ArkType — `UForm` accepts any **Standard Schema** library, so all three work. Zod is the most widely used, so error shapes and examples are easiest to check. Yup: weaker TypeScript inference.

**Downside:** the rules are hand-written, so they can drift from the Prisma model. Covered in the Prisma section.

---

## Nuxt UI v4

**Pick:** Nuxt UI v4 for components.

**Why:** One install gives me things I would otherwise build or install separately:

| Feature           | What it saves me                                                        |
| ----------------- | ----------------------------------------------------------------------- |
| Tailwind CSS v4   | Required by the brief. No separate setup                                |
| TanStack Table v8 | Table that supports server-side paging and sorting                      |
| Reka UI dialogs   | Modals where Tab stays inside and Esc closes. Accessibility bonus, free |
| Color mode        | Dark mode is nearly a one-line toggle                                   |
| `UForm`           | The `setErrors()` half of the Zod flow above                            |
| VueUse            | `useDebounceFn` so search does not fire on every keystroke              |

**One correction to that table:** VueUse arrives *through* Nuxt UI, but Day 2 installed `@vueuse/core` as a direct dependency anyway. Importing a package that is only present because something else hoisted it is the same latent fault the Day 1 review found with `@adonisjs/hash` — it works until the parent changes its own dependencies. If I import it, I declare it.

**Rejected:** building every component myself with Reka UI + Tailwind. More of my own work to show, but it costs days I do not have. I spent them on the brief instead.

**Downside:** the app looks like stock Nuxt UI. The brief left the component library to me, and I would rather the transaction handling be right than the dropdown be mine.

---

## Pinia

**Pick:** Pinia, used for a small number of things only.

**Why I need it:** the bulk actions screen. User ticks 10 products and clicks Archive, 7 success 3 fails. That state has to be shared by multiple components at once. It also has to survive a component unmounting. Passing it through props would be painful.

Example:

- the toolbar (shows "10 selected")
- the table (shows which rows are ticked and which are loading)
- the retry panel (shows the 3 that failed and why)

**What I keep OUT of Pinia:** set boundary, only holds the things nothing else can hold.

| State                       | Where it goes instead | Why                                                                                                       |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- |
| Who is logged in            | `useUserSession()`    | nuxt-auth-utils already provides it                                                                       |
| Product list, order details | `useAsyncData`        | Nuxt already caches this. Copying it into a store creates two versions that drift apart                   |
| Search, filter, page, sort  | The **URL**           | The brief says this must survive refresh and be shareable. A store cannot do that. A URL does it for free |

**Rejected:** No store at all. The retry state would end up passed down through many components.

**Downside:** the selection and the list are two separate things, and they drift apart. The rows come from `useAsyncData`; the store holds selected product IDs. Nothing keeps the two in step.

1. **Bulk action.** Tick 10 products, click Archive. 7 succeed, 3 fail. Archive is a **status change, not a delete** — the two are different features, see [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) §3. The 3 failures are products sitting on unfinished orders.
   - The list is filtered `status=active`, so the 7 archived disappear and the 3 failed stay on screen.
   - The store still holds all 10 IDs — **toolbar says "10 selected", list shows 3**.
   - Retry acts on the selection, so it would re-archive the 7 that already worked.

2. **Filter.** Tick 10 products, then search "shirt". Most of the selection goes out of view.

So the store has 2 rules:

| When                                  | What happens to the selection                              |
| ------------------------------------- | ---------------------------------------------------------- |
| Search, filter, sort or page changes  | Clear it                                                   |
| A bulk action returns partial failure | Reduce it to exactly the failed IDs (`splice` succeed IDs) |

---

## nuxt-auth-utils

**Pick:** nuxt-auth-utils, one admin user.

**Why:** The brief stated server routes must be protected on the server-side, not just hidden in the UI.

```ts
// server/api/products.post.ts
export default defineEventHandler(async (event) => {
  await requireUserSession(event)   // ← blocks here if not logged in
  ...
})
```

- Anyone can call the API directly with `curl`. This blocks it.
- includes password hashing.

**Rejected:** `@sidebase/nuxt-auth`. Built for Google login, multiple roles, and more. I have one admin user.

**Downside:** No password reset, no roles, no refresh tokens.

---

## ESLint, no Prettier

**Pick:** `@nuxt/eslint` with `stylistic: true`. No Prettier.

**Why:** They do different jobs. ESLint finds mistakes - ex: used a variable you never defined. Prettier only formatting. `@nuxt/eslint` can do the rearranging too. So only use one tool, one config file, one save action.

```ts
// nuxt.config.ts
eslint: { config: { stylistic: true } }
```

**Rejected:** ESLint + Prettier + eslint-config-prettier. This is the right pick on a **team** codebase to minimise formatting arguments.

**Downside:** Markdown and YAML files are not auto-formatted. Does not matter here.
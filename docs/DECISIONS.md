# Technical Decisions

Based on `docs/BRIEF.md`, why I picked each tool, what I said no to, and the downside of each.

**The situation:** This project is an onboarding task. Expected to deliver within 6 working days (Demo on Day 7, Fri 21st Aug). So I picked tools that are fast to set up, making this project like delivering a prototype.

---

## The stack

| Layer | Pick | Reason |
|---|---|---|
| Framework | Nuxt 4 | Lets me write one validation rule and use it on both browser and server. |
| Styling | Tailwind CSS v4 | Required by the brief. Comes free inside Nuxt UI |
| Components | Nuxt UI v4 | One install gives me table, modals, forms, dark mode |
| Database | PostgreSQL 16 | Can block bad data at the database level |
| ORM | Prisma 7 | Fastest way to go from idea to working database |
| Validation | Zod 4 | Its error format matches what the form needs |
| Client state | Pinia 4 | Holds checkbox selection for bulk actions |
| Auth | nuxt-auth-utils | Login check runs on the server, not just the UI |
| Lint + format | @nuxt/eslint | One tool instead of two |
| Seed data | Faker | Fake products that look real |
| Tests | Vitest, 2 tests | Proves the stock fix works |

---

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

**Rejected:** Nuxt 3. It works, but I would lose the shared folder. Its' End-Of-Life on 31st July 2026

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

**Why put the rule there instead of in my code?** Because the database is the one place every write must pass through. The check runs no matter where the write came from (API code, Prisma query, hard-coded SQL). Application code only protect paths I remembered to guard. A constraint removes the possibility.

### 2. It lets a deleted product's code be reused

I do not really delete products (soft delete) - set a `deletedAt` date. A plain `UNIQUE` rule on `sku` would then keep `SHIRT-01` reserved forever, even though that product is gone from the shop. Postgres solves this with a **partial index** — an index with a `WHERE` on it:

```sql
CREATE UNIQUE INDEX "product_sku_active"
  ON "Product" ("sku")
  WHERE "deletedAt" IS NULL;
```

**How it works:** a unique index enforces "no duplicates" across the rows *that are in the index*.

- A product with `deletedAt = NULL` - still active → **is** in the index.
- A product with a `deletedAt` date - deleted → **is not** in the index.

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

| What Zod does | Without Zod |
|---|---|
| Drops keys I did not declare | Pick fields one by one on every endpoint, and never forget |
| One rule file in `shared/` | Write every rule twice, browser and server, and watch them drift |
| Returns a typed object | `readBody` returns `any`, so I write the type separately and hope it matches |
| One `.transform()` for `"19.99"` → `1999` | Convert in every handler that touches a price |

- Security: Row 1 - `readBody` returns whatever was sent, so `create({ data: body })` would let a `curl` set `stock` or `deletedAt`. `parse()` strips them.
- URL: someone edits `?page=abc` by hand, Zod turns it back into `page=1` instead of crashing the page.

**Rejected:** Valibot and ArkType — `UForm` accepts any **Standard Schema** library, so all three work. Zod is the most widely used, so error shapes and examples are easiest to check. Yup: weaker TypeScript inference.

**Downside:** the rules are hand-written, so they can drift from the Prisma model. Covered in the Prisma section.

---

## Nuxt UI v4

**Pick:** Nuxt UI v4 for components.

**Why:** One install gives me things I would otherwise build or install separately:

| Feature | What it saves me |
|---|---|
| Tailwind CSS v4 | Required by the brief. No separate setup |
| TanStack Table v8 | Table that supports server-side paging and sorting |
| Reka UI dialogs | Modals where Tab stays inside and Esc closes. Accessibility bonus, free |
| Color mode | Dark mode is nearly a one-line toggle |
| `UForm` | The `setErrors()` half of the Zod flow above |
| VueUse | `useDebounceFn` so search does not fire on every keystroke |

**Rejected:** Building every component myself with Reka UI + Tailwind. More of my own work but requires more time. Instead use the time saved to focus on more important task in brief.

**Downside:** the UI looks like Nuxt UI theme. The brief said the component library is my choice, and I would more happy if the transaction handling is working as expected than on a dropdown I make my own.

---

## Pinia

**Pick:** Pinia, used for a small number of things only.

**Why I need it:** the bulk actions screen. User ticks 10 products and clicks Archive, 7 success 3 fails. That state has to be shared by multiple components at once. It also has to survive a component unmounting. Passing it through props would be painful.

Example:
- the toolbar (shows "10 selected")
- the table (shows which rows are ticked and which are loading)
- the retry panel (shows the 3 that failed and why)

**What I keep OUT of Pinia:** set boundary, only holds the things nothing else can hold.

| State | Where it goes instead | Why |
|---|---|---|
| Who is logged in | `useUserSession()` | nuxt-auth-utils already provides it |
| Product list, order details | `useAsyncData` | Nuxt already caches this. Copying it into a store creates two versions that drift apart |
| Search, filter, page, sort | The **URL** | The brief says this must survive refresh and be shareable. A store cannot do that. A URL does it for free |

**Rejected:** No store at all. The retry state would end up passed down through many components.

**Downside:** the selection and the list are two separate things, and they drift apart. The rows come from `useAsyncData`; the store holds selected product IDs. Nothing keeps the two in step.

1. Example for bulk action:

- Tick 10 products, click Archive. 7 succeed, 3 fail.
- The list is filtered `status=active`, 7 archived disappear, 3 failed are still active, so they stay on screen.
- But the store still holds all 10 IDs - **toolbar shows "10 selected", list shows 3**.
- Retry acts on the selection — so it would re-archive the 7 that already worked.

2. Example for filter: Tick 10 products and filter for "shirt", most of them will invisible from view.

So the store has 2 rules:

| When | What happens to the selection |
|---|---|
| Search, filter, sort or page changes | Clear it |
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

---

## Database design

The brief asks about the first three directly. The fourth is a bonus item.

### 1. Money Handling: store cents, never decimals

**No money library installed.** Convert currency format to whole number. `$19.99` is stored as `1999` into cents, whole number.

**Why not store 19.99?**

- Computers cannot store `0.1` exactly.
- So `0.1 + 0.2` gives `0.30000000000000004`.
- Do for 200 orders and your revenue total is wrong.
- Whole numbers have no such problem. `1999 + 500` is always exactly `2499`.

**Data massaging:** Convert before the form is submitted to server. Format with `Intl.NumberFormat` (built-in) before display on client.

### 2. Price Changes: copy the price onto the order

When an order is placed, I **copy** the price and the product name onto the order line.

**Example of getting it wrong:**

```
Jan 1  – Customer buys a shirt for $10. Order says: shirt, $10
Feb 1  – I raise the shirt price to $15
Feb 2  – Open the January order...
```

If the order looked up the *current* price, January's order now says **$15**. The customer paid $10. The receipt is wrong, and last month's revenue just changed by itself.

So the order line stores its own copy:

```
OrderItem { productId, name: "Blue Shirt", unitPriceCents: 1000, qty: 1 }
```

An order is a record of what happened. It is not a live view of the product table.

I copy the **name** too, so a renamed or deleted product still shows correctly on an old receipt.

### 3. Deleting Products: mark, do not remove

Products get a `deletedAt` date instead of being erased.

**Why:** A product might appear in 40 past orders. Actual deletion will breaks those orders or deletes real sales history with it.

What "deleted" means here:

- Hidden from the product list
- Cannot be added to new orders
- Still opens on its own page, so old links do not 404
- Its SKU is able for reuse (Postgres index from earlier)

### 4. Overselling: 3 layers

**Overselling is selling more than what's available.** Example: 1 shirt in stock, 2 people click Buy at same time, both orders go through. Stock goes to `-1`, an unwanted outcome.

**Why It happen**: B get the value before A finish the buying process. B read and decide to buy on a stale data.

**Counter measure:** 3 layers of checking.

| Layer | What it does | Catches |
|---|---|---|
| 1. The `updateMany` in the Prisma section | Check and update in one step, so there is no gap | Two people buying at the same moment |
| 2. `CHECK (stock >= 0)` | Database refuses negative stock | My own bugs, a bad migration, someone editing the database by hand |
| 3. `CHECK ("qty" > 0)` on `OrderItem` | Database refuses a nonsense quantity | A negative quantity, which slips past layers 1 and 2 |

**Why layer 3 exists.** Layers 1 and 2 both check the *result*. Layer 3 checks the *input*.

### 5. Cancelling an order: put the stock back

**Rule:** order once `shipped`, it cannot be cancelled. Can be cancelled from `pending` and `paid` only.

**Why the rule matters:** `cancelled` means *we never sent it*. The goods are still on the shelf, so cancelling **returns the stock**.

**`OrderItem.qty` is never made negative.** the order is a record of what was ordered. Cancelling then restock changes `Product.stock`, not the order.

**The concurrency catch:** cancelling does three things — set the status, write the audit event, and return the stock. If it can run twice, stock inflates. So the legality check goes in the `WHERE`, exactly like the oversell fix:

```ts
const { count } = await tx.order.updateMany({
  where: { id, status: { in: ['pending', 'paid'] } },
  data:  { status: 'cancelled' },
})
if (count === 0) throw new IllegalTransitionError(id)
```

**Note on the limit of "put it in the database":** a `CHECK` constraint cannot enforce this rule. It only sees the new row, not the move from the old one. Enforcing it in the database would need a trigger. The conditional `UPDATE` above is the pragmatic equivalent — atomic, but application-level.

---

## Search and filters live in the URL

**Why URL:**

- Refresh the page → filters still there.
- Send the link to a colleague → they see the same list.
- Press back → you get the previous filter, not the previous page.

```
/products?search=shirt&status=active&page=2&sort=price
```

A store loses all of this on refresh. The brief asks for both, and a URL gives both for free. Built as one composable, `useTableQuery`, with Zod checking the values. No library needed.

---

## Packages I chose not to install

| Package | Why not |
|---|---|
| `@tanstack/vue-query` | Duplicates Nuxt's fetching. I need its undo feature on one screen, so I wrote that myself |
| `@tanstack/vue-table` | Already inside Nuxt UI at v8. Installing v9 too would break it |
| `tailwindcss` | Nuxt UI installs it |
| `vee-validate` / FormKit | `UForm` + Zod already does form validation and field errors |
| `bcrypt` / `argon2` | nuxt-auth-utils has password hashing built in |
| `dinero.js` / `big.js` | Whole-number cents already solves money |
| `date-fns` / `dayjs` | `Intl.DateTimeFormat` is built into the browser |
| `@prisma/nuxt` | It is version 0.3.0 and only saves ~15 lines. Not worth an unfinished package |
| `pg` / `@types/pg` | `@prisma/adapter-pg` already installs them |
| `nuxt-security` | Rate limiting is ~20 lines of my own code if I have time |
| `papaparse` | Only needed for CSV, which is out of scope |

---

## What I built and what I skipped

**Bonus items I did, in this order:**

1. **Stock that cannot oversell** — best value for the time. Most likely to be asked about.
2. **Order status + audit trail** — mostly just a table recording who changed what and when. Cheap, and makes the order page much better.
3. **Bulk actions with partial failure** — the most expensive of the three, so I did it last. If I lost a day, I would lose a bonus, not a core requirement.

**Skipped:** storefront and checkout, product variants, image upload, CSV, analytics. Each is a day or more. Three finished bonuses beat five half-built ones.

**Tests — I cut these down instead of cutting them out.** Two tests on the data layer:

1. Two orders hit the last item at the same time → exactly one succeeds.
2. Change a product's price → the old order still shows the old price.

About an hour. These two cover the claims in this document that would otherwise just be me saying so. I skipped the Playwright browser test. That is the weakest part of my scope — if I found another half day, that is where it would go.

---

## What I would do differently for a real product

Most choices above are shaped by "6 days, then nobody touches it." If that were not true:

- **Drizzle instead of Prisma.** For anything long-lived, being closer to SQL wins, and both problems I described above disappear.
- **Playwright tests** on login and checkout, not just the data layer.
- **A proper seed script** that can be run twice without creating duplicates.
- **Customer deletion and a GDPR path.** Any system holding real customer data needs this. This one ignores it on purpose.

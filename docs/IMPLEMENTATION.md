# Implementation Plan

Day-by-day build plan. Stack choices and reasons are in `docs/DECISIONS.md`.

## Calendar

| Day | Date | Task |
|---|---|---|
| **Day 1** | Tue 11 Aug | Setup, database, seed |
| **Day 2** | Wed 12 Aug | Login + product list |
| — | Thu 13 – Sun 16 | **Not Working** |
| **Day 3** | Mon 17 Aug | Product add / edit / delete + UI states |
| **Day 4** | Tue 18 Aug | Detail pages + purchase tracing |
| **Day 5** | Wed 19 Aug | All 3 bonus features |
| **Day 6** | Thu 20 Aug | Fix, polish, practise the demo |
| **Day 7** | **Fri 21 Aug** | **DEMO** |

---

## Day 1 — Tuesday 11 August

**Goal:** Install everything. Database is running with fake data in it. No screens yet.

### Install everything

```bash
npm i @nuxt/ui @prisma/client @prisma/adapter-pg zod pinia nuxt-auth-utils
npm i -D prisma @pinia/nuxt tsx @faker-js/faker @nuxt/eslint vitest @nuxt/test-utils dotenv
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

**Not installing:** `pg`, `@types/pg` (already inside `@prisma/adapter-pg`), `tailwindcss` (inside `@nuxt/ui`), `@tanstack/vue-table` (inside `@nuxt/ui`, and the standalone one is a different
version that would clash).

### Tasks

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

### The 6 tables

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

### The 2 SQL rules to add by hand

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

### Expected blockers

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

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **Prisma 7 changed three things at once.** The generator is now `prisma-client` (not `prisma-client-js`), it needs an explicit `output` path, and the database URL moved out of `schema.prisma` into a new `prisma.config.ts` file | Every guide and blog post online is written for Prisma 6. Following them produces a schema that will not generate | Ran `prisma init` in a scratch folder to see what v7 actually generates, then copied that shape. Also had to install `dotenv`, which the new config file imports | ~30 min |
| **Docker daemon was not running.** The `docker` command existed, so it looked installed, but every call failed with "cannot connect to the Docker API" | The error points at a socket path, not at "Docker Desktop is closed", so it reads like a broken install | Started Docker Desktop and waited for the daemon | ~5 min |
| **Cannot use `hashPassword()` in the seed script.** nuxt-auth-utils' version reads Nuxt's runtime config, which does not exist in a standalone `tsx` script | Would have meant either running the seed through Nuxt, or hashing with the wrong algorithm and being unable to log in | Read the module source. It is a thin wrapper over `@adonisjs/hash` with the scrypt driver, so the seed calls that directly. The hash is a self-describing PHC string, so `verifyPassword()` still accepts it at login | ~15 min |
| **VS Code and ESLint fought over semicolons.** Saving `nuxt.config.ts` added a semicolon that ESLint immediately marked red: `Extra semicolon (@stylistic/semi)` | I chose ESLint over Prettier so only one tool formats. But VS Code has its **own** built-in formatter that runs on save and wants semicolons | Added `.vscode/settings.json` turning off format-on-save and running ESLint's fix on save instead. Added `.vscode/extensions.json` marking Prettier as unwanted | ~10 min |

**Total lost: about 1 hour.** All four were setup or tooling problems, not design problems. Two worth keeping in mind: the Prisma 7 one will hit anyone starting on v7 today, and the semicolon one is a direct consequence of choosing a single formatter — the editor is the second formatter nobody thinks about.

---

## Day 2 — Wednesday 12 August

**Goal:** I can log in, and I can see a product list that pages, searches, filters and sorts.

### Tasks

**Login (morning)**

- [ ] Add the admin user to the seed, password hashed with `hashPassword()`
- [ ] Build `/login` page with `UForm`
- [ ] Build `POST /api/auth/login` — check password, start session
- [ ] Build `POST /api/auth/logout`
- [ ] Add `requireUserSession(event)` to every protected API route
- [ ] Add client middleware to send logged-out users to `/login`
- [ ] Test with `curl` that the API returns **401** when logged out

**Product list (afternoon)**

- [ ] Build `GET /api/products` — takes `page`, `search`, `status`, `sort`, `dir`
- [ ] Paging, searching and sorting all happen **in SQL**, not in the browser
- [ ] Return `{ items, total, page, pageCount }`
- [ ] Build `/products` page with `UTable`
- [ ] Search box, debounced so it does not fire on every keystroke
- [ ] One filter dropdown (status)
- [ ] Two sortable columns (name, price)
- [ ] Write `useTableQuery` composable — keeps all of the above in the URL
- [ ] Write the Zod schema that reads the URL safely
- [ ] **Clear the tick-box selection whenever search, filter, sort or page changes** — one watcher on the whole query object, not four separate ones. Rule 1 of the two in `DECISIONS.md`
- [ ] **The 4 UI states on this list** — loading, empty, error, 'unauthorised'. Do it now, not on Day 3. This is the first data screen and the first thing a reviewer opens, and the brief says it looks closely at these

**End of day (do not skip)**

- [ ] Write a short note in `docs/NOTES.md`: what works, what is half-done, what is next

### Done when

- [ ] Logging out and visiting `/products` sends me to `/login`
- [ ] `curl http://localhost:3000/api/products` returns 401 with no cookie
- [ ] This URL works after a full refresh: `/products?search=shirt&status=active&page=2&sort=price&dir=desc`
- [ ] Copying that URL into a new tab shows the same filtered list
- [ ] The browser back button goes back to the previous filter

### Expected blockers

**Most likely today:** the URL state infinite loop. Budget an hour for it.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Infinite loop in URL state** | The page re-renders forever, or the network tab shows the same request firing over and over | A watcher writes to the URL, which retriggers the same watcher. Only write to the URL from **user actions**, never from a watcher on the value it just wrote | High |
| **`UTable` column definitions look wrong** | Examples copied from the TanStack docs throw, or columns render empty | Nuxt UI pins TanStack Table **v8**. Most online examples are v9 and the column API differs. Use the Nuxt UI docs, not TanStack's | High |
| `UTable` sorts only the current page | Sorting reorders 20 rows but page 2 is unchanged | That is client-side sorting, the default. Turn it off and send `sort`/`dir` to the server | Medium |
| Search fires on every letter | A request per keystroke in the network tab | Wrap in `useDebounceFn` from `@vueuse/core`, ~300ms | Medium |
| Page number stays too high | Search returns nothing, but there are clearly matches | Landed on page 2 of a 1-page result. Reset to page 1 whenever search or filter changes | Medium |
| Session lost on refresh | Login works, then refreshing logs me out | Cookie must be `httpOnly`, and `NUXT_SESSION_PASSWORD` must be set and 32+ chars | Medium |
| Server route still returns data when logged out | `curl` without a cookie returns 200 and real rows | `requireUserSession(event)` is missing from that handler. It must be on **every** protected route, not just the page | High |

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

---

## Day 3 — Monday 17 August

**Goal:** I can add, edit and delete a product. Every screen handles all 4 states.

**First 15 minutes:** read `docs/NOTES.md` and run the app. It has been 4 days.

### Tasks

**Forms**

- [ ] Write the shared Zod schemas in `shared/schemas/product.ts`
- [ ] `POST /api/products` — parse with Zod, then **pass the parsed object to Prisma, never the raw `body`**. `parse()` drops undeclared keys; `create({ data: body })` would not
- [ ] `PATCH /api/products/:id`
- [ ] `DELETE /api/products/:id` — set `deletedAt`, do not really delete
- [ ] Build create and edit pages using `UForm` with the same schema
- [ ] **Field-level errors:** on failure return `error.flatten().fieldErrors`, turn it into `[{ name, message }]`, pass to `form.setErrors()`
- [ ] Catch Prisma error `P2002` (duplicate) and turn it into a `sku` field error, not a toast
- [ ] Delete needs a confirm modal, and says if the product is used in orders

**The 4 UI states — every screen that loads data**

- [ ] **Loading** — skeleton rows, not a spinner over the whole page
- [ ] **Empty** — "No products yet" with a Create button. Different message for "no search results"
- [ ] **Error** — message plus a Retry button
- [ ] **'Unauthorised'** — a 401 from any endpoint sends the user to `/login`

**Why no 403:** 403 is unreachable in this version. Because there is only one admin user and no roles, so every logged-in request is admin, and he allowed to do everything. There is no request that is both authenticated and forbidden.

- **401** = Unauthenticated. Not logged in, or session expired.
- **403** = Authenticated, but unauthorised. Access denied.

### Done when

- [ ] Saving a duplicate SKU shows **"SKU already exists" under the SKU box** — not a toast
- [ ] Turning off JavaScript validation and posting bad data still fails on the server
- [ ] Every list screen shows something sensible when empty
- [ ] Stopping the database mid-use shows the error state, and Retry works after restart

### Expected blockers

**Most likely today:** the Zod → `setErrors` shape mismatch. It is the core requirement of the day, so solve it first and reuse the helper everywhere.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **`setErrors` does nothing** | Server rejects the save, but no red text appears under any field | Shape mismatch. `UForm` wants `[{ name: "sku", message: "..." }]`; Zod gives `{ sku: ["..."] }`. Write **one** helper to convert, use it on every form | High |
| **Prisma duplicate error is unreadable** | A wall of Prisma text instead of "SKU already exists" | Catch code `P2002`. The offending field is in `err.meta.target`. Map it to a field error, never a toast | High |
| Zod v4 `flatten()` differs from v3 | `fieldErrors` is undefined, or nested unexpectedly | This project is on Zod 4. Check the shape in a REPL once, then build the helper around what it really returns | Medium |
| Price sent as `"19.99"`, stored as `1999` | Prices show 100× too small, or as `19.99` in the database | Convert in the Zod schema with `.transform()`, in **one** place. Never convert ad hoc in a component | Medium |
| Deleted products still show | A product I deleted reappears in the list | A query is missing `where: { deletedAt: null }`. Easy to miss on one of several queries | Medium |
| Client validation passes, server rejects | Form submits happily, then fails server-side | The two are using different schemas. They must import the same file from `shared/` | High |
| **A `curl` can set columns the form never showed** | `curl -d '{"name":"X","stock":999999}'` succeeds and the stock really changes | The handler passed raw `body` to Prisma instead of the parsed object. Only `parse()` output goes to the database | High |
| Empty state hard to test | Cannot tell whether the empty state works | Force it with `?search=zzzzzz` | Low |

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

---

## Day 4 — Tuesday 18 August

**Goal:** Answer both tracing questions from the brief.

### Tasks

- [ ] `GET /api/products/:id` — product plus the customers who bought it
- [ ] `GET /api/customers` — list with paging
- [ ] `GET /api/customers/:id` — customer plus their orders and items
- [ ] `GET /api/orders/:id` — order, its line items, its customer, its status events
- [ ] Build `/products/[id]` — details, stock, and **who bought this**
- [ ] Build `/customers` — list
- [ ] Build `/customers/[id]` — **what they bought, when, how much**, plus total spent
- [ ] Build `/orders/[id]` — line items at the price paid, plus the customer. **Day 5 adds the status control and the timeline to this page**, so it has to exist first
- [ ] Every order row links to the customer *and* to the order. Every product row links to the product
- [ ] Show the **price paid at the time**, from `OrderItem`, not today's price
- [ ] All 4 UI states on these pages too

### Done when

- [ ] Pasting `/customers/12` into a fresh tab works with no white flash
- [ ] Pasting `/products/5` into a fresh tab works
- [ ] Pasting `/orders/42` into a fresh tab works
- [ ] A deleted product's page still opens, marked as deleted
- [ ] I can start at a customer, click to an order, click to a product, click to another customer

### Expected blockers

**Most likely today:** N+1 queries making the detail pages slow.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **N+1 queries** | The page takes seconds, and the terminal shows dozens of near-identical queries | One query per row instead of one query total. Use a single `include`, not a loop | High |
| Cold load flashes empty then fills | Hard refresh shows a blank table for a moment before data appears | The fetch is running only in the browser. `useAsyncData` should run it on the server too | Medium |
| Bad id crashes the page | `/products/abc` shows a stack trace instead of a page | Validate the param and `throw createError({ statusCode: 404 })` | Medium |
| "Who bought this" query is heavy | The product page is much slower than the customer page | Query `OrderItem` by `productId` and group by customer. Do not load every order and filter in JS | Medium |
| Deleted product's page 404s | Clicking through from an old order hits a dead end | Detail routes must still resolve soft-deleted products, and mark them as deleted. Only **lists** exclude them | Medium |
| Old order shows today's price | The order total does not match the sum of its lines | The page is reading `Product.priceCents` instead of `OrderItem.unitPriceCents`. Always read the snapshot | High |

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

---

## Day 5 — Wednesday 19 August

**Goal:** All 3 bonus features. This is the fullest day.

**Do them in this order.** If I run out of time, the last one is the one to drop.

### 1. Stock that cannot oversell (morning, ~2 hours)

- [ ] Write the order-creating service using one atomic update:

```ts
const { count } = await tx.product.updateMany({
  where: { id, stock: { gte: qty } },
  data:  { stock: { decrement: qty } },
})
if (count === 0) throw new OutOfStockError(id)
```

- [ ] Wrap the order and the stock change in one `$transaction`
- [ ] Write **test 1**: two orders for the last item at the same time → exactly one wins
- [ ] Write **test 2**: change a product price → the old order still shows the old price

### 2. Order status + audit trail (midday, ~2 hours)

- [ ] Allowed moves only: `pending → paid → shipped → delivered`, and `cancelled` from anywhere before delivered
- [ ] Reject anything else on the server
- [ ] `PATCH /api/orders/:id/status` writes an `OrderStatusEvent` row in the same transaction
- [ ] Record who did it, from the session
- [ ] Show the history as a timeline on `/orders/[id]` — the page built on Day 4

### 3. Bulk actions with partial failure (afternoon, ~3 hours)

- [ ] Tick boxes on the product table, state kept in a Pinia store
- [ ] `POST /api/products/bulk` — try every item, **do not stop at the first failure**
- [ ] Return one result per item: `{ id, ok, reason? }`
- [ ] Update the screen straight away (optimistic), keeping a copy of the old rows
- [ ] On the reply: keep the ones that worked, **put back the ones that failed**
- [ ] Show a panel listing the failures **and why each one failed**
- [ ] **Reduce the selection to exactly the failed IDs** once the response lands. Rule 2 of the two in `DECISIONS.md` — and it means Retry is just the same action run again, with no separate retry queue to keep in step
- [ ] A Retry button that only retries the failed ones

### Done when

- [ ] `npx vitest run` — both tests pass
- [ ] I can force a bad status change and the server refuses it
- [ ] The order page shows who changed the status and when
- [ ] Bulk archive 10 products where 3 fail → 7 change, 3 go back, panel lists the 3 with reasons
- [ ] Retry works and only touches the 3

### Expected blockers

**Most likely today:** running out of time. Three bonuses in one day is the tightest point of the week. Also the day where a test can *look* green while proving nothing.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Concurrency test passes but proves nothing** | It goes green on the first try, and still passes if I delete the `gte` guard | `await` one then the other is sequential, not concurrent. Must be `Promise.all([...])`. **Sanity check: break the guard on purpose and confirm the test fails.** A test that cannot fail is not a test | High |
| **Bulk request stops at the first failure** | 10 items sent, 1 fails, and the other 9 never ran | `Promise.all` rejects on first failure. Use `Promise.allSettled` and return one result per item | High |
| Rollback restores the wrong rows | After a partial failure the table shows stale or wrong values | Snapshot **before** the optimistic update, and restore **only** the ids that came back failed | High |
| **Retry re-runs the 7 that already worked** | Toolbar still says "10 selected" after a 7/3 result, and Retry archives everything again | The selection was never reduced to the failed IDs. Do that as soon as the response lands, before enabling Retry | High |
| No failures to demo | Bulk archive succeeds on all 10, so the interesting case is invisible | Already handled: the seed forces orders 1–3 to `pending` on products 1–3, which the archive rule rejects. Verify this still holds after any re-seed | Medium |
| Prisma `$transaction` times out | `Transaction already closed` or a timeout error under concurrency | Default timeout is short. Keep the transaction to the update and insert only — no slow work inside it | Medium |
| Status guard is only in the UI | Disabling the dropdown in devtools lets me set any status | The allowed-transition check must run **server-side**. The UI is a convenience, not the rule | High |
| **Day runs out** | It is 4pm and bulk actions is not working | **Drop bulk actions.** Two finished bonuses beat three half-done. Decide at 4pm, not 7pm | High |

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

---

## Day 6 — Thursday 20 August

**Goal:** Make it demo-ready. **No new features.**

If something is unfinished, I hide it or remove it. I do not start it.

### Tasks

- [ ] Click through every screen and write down what is broken
- [ ] Fix the broken things, worst first
- [ ] Check all 4 UI states on every screen once more
- [ ] Check dark mode on every screen
- [ ] Keyboard check: Tab through a form, open a modal, press Esc
- [ ] Run `npx eslint . --fix`
- [ ] Write `README.md`: how to run it, login details, link to the two docs
- [ ] Reset the database and re-seed, so the demo starts clean
- [ ] Fill in any missing rows in the blocker logs above
- [ ] Practise the demo below, out loud, with a timer

### Done when

- [ ] Fresh clone → `docker compose up -d`, `npm i`, `npx prisma migrate deploy`, `npx prisma db seed`, `npm run dev` → it works
- [ ] I have run the demo end to end without getting stuck

### Expected blockers

**Most likely today:** finding a bug big enough to be tempting to fix properly. Do not. There is no
day after this one.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Fixing turns into building** | It is 3pm and I am writing a new feature "while I am in there" | No new features today. If it is not broken, leave it. If it is broken and big, hide it instead of fixing it | High |
| **Reset wipes the demo data** | The app runs but every list is empty | `prisma migrate reset` drops everything. Always re-seed **after** resetting, and check the counts before stopping | High |
| Fresh clone does not run | The clean-checkout test fails on a missing `.env` or an unbuilt Prisma client | `.env.example` must be copied, and `postinstall` runs `prisma generate`. Test in a **separate folder**, not the one I have been working in | Medium |
| Dark mode breaks one screen | White boxes on a dark page | Nuxt UI handles most of it. Fix by using its colour tokens rather than hard-coded classes | Low |
| Demo runs long | The practice run takes 20 minutes | Cut steps 6 and 7 to one example each. 11 steps is the target, not the floor | Medium |
| Something breaks the night before | A last-minute change breaks a working screen | Stop changing code once the practice run passes. Commit that state and do not touch it | High |

### Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

---

## Demo script — Friday 21 August

11 steps. It shows the hard parts on purpose, instead of wandering around the app.

1. Show the app logged out → sent to login.
2. Show `curl` on an API route → **401**. Say: the lock is on the server, not the UI.
3. Log in. Show the product list.
4. Search, filter, sort. **Copy the URL, paste in a new tab** → same view. Press back.
5. Create a product with a duplicate SKU → error appears **under the SKU box**.
6. Open a customer → what they bought, when, how much.
7. Open a product → who bought it. Note the price shown is the price they paid, not today's price.
8. Change a product's price → go back to the old order → still shows the old price.
9. Open an order → move it `pending → paid` → **the timeline records who and when**. Then try an illegal jump (`pending → delivered`) → the server refuses it. Say: the rule is server-side, the dropdown is only a convenience.
10. Run `psql` and try `UPDATE "Product" SET stock = -1` → **the database refuses it**. Then show the concurrency test passing.
11. Bulk archive 10 products, 3 fail → show the failure list with reasons, then Retry the 3.

Have ready to answer: money as whole cents, soft delete, why Prisma, why Postgres. All in `docs/DECISIONS.md`.

---

## If I fall behind

Drop things in this order. Top of the list goes first.

| Order | What to drop | Why it is safe |
|---|---|---|
| 1 | Bulk actions | A bonus, not a requirement. The most expensive thing here |
| 2 | Dark mode polish | Nice to have. Nuxt UI mostly does it anyway |
| 3 | Customer list page | Tracing still works from the product side |
| 4 | Audit trail timeline UI | Keep saving the events, just show them as a plain list |

**Never drop these.** They are core requirements in the brief, and dropping one means failing it:

- Login with the check on the server
- Field-level validation errors
- URL that survives a refresh
- The 4 UI states
- Both tracing directions

---

## The two blocker sections

Every day has two, and they are a matched pair:

| Section | Written | Answers |
|---|---|---|
| **Expected blockers** | **Before** starting the day | "What could go wrong, and how will I spot it early?" |
| **Blocker log** | **After** it happens | "What actually went wrong, and what did I do?" |

The **"How I will know"** column is the important one. A fix is only useful if I recognise the problem, and most time is lost *before* realising which problem I have — not after.

At the end of each day, mark the predictions ✅ or ❌ (Day 1 shows the format). The gap between the two lists is worth looking at:

- **Predicted and it happened** — the prep worked, and the fix was already written down.
- **Predicted and it did not** — fine. Cheap insurance.
- **Not predicted** — the interesting case. On Day 1 both misses were *environment* problems (Docker not running, VS Code's formatter), not *library* problems. I had been thinking about the code and not about the machine around it.

## How to write the blocker logs

The point is to show how I think, not to make excuses. So each row should say the **cause** and the **decision**, not just that something was hard.

**Weak:** "Prisma was confusing, lost 2 hours."

**Strong:** "Prisma 7 removed the built-in engine, so every guide I found was for v6 and did not work. Found it in the v7 docs — it needs the `@prisma/adapter-pg` driver. Lost 1 hour. Now noted in `DECISIONS.md` so nobody repeats it."

The second one tells them I found the real cause, fixed it, and wrote it down. That is the thing being tested.

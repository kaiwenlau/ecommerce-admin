# Day 4 — Tuesday 18 August

**Goal:** Answer both tracing questions from the brief.

## Carried in from Day 3

Day 3's evening spilled into this slot. What landed under the `DAY4:` commits was the
write path, its tests and the typecheck script — not the tracing pages below, which are
still unstarted. Three things from that spillover change the work here.

**`GET /api/products/:id` already exists, and currently refuses deleted rows.**
`server/api/products/[id].get.ts:47` is scoped `where: { id, deletedAt: null }` and 404s
otherwise. That is right for the edit form, which must not edit a deleted product, and
`app/pages/products/[id]/edit.vue:25` reads the 404 as exactly that. It is **wrong for the
detail page** — "A deleted product's page still opens, marked as deleted" is a Done-when
below. The route needs a way to return the row with a deleted flag, without the edit form
losing its 404. Decide which before building `/products/[id]`.

**`server/api/products/[id]/undelete.post.ts` is untracked and has no caller.** It works,
nothing in `app/` invokes it. Either wire it to a button or drop it — an endpoint reachable
only by `curl` is not a feature.

**Use `app/utils/productPath.ts` for every new `$fetch`.** Day 3 lost 25 minutes to
"Excessive stack depth": a template literal makes TypeScript match the URL against every
route Nitro knows. The helper returns a plain `string` to opt out. The customer and order
routes below will hit the same wall.

**One Day 3 invariant now has an exception.** Day 3 said every write scopes by
`deletedAt: null`. `undelete.post.ts` deliberately does the opposite — it finds a row
*because* it is deleted. The rule still holds for every other write.

## Tasks

- [ ] `GET /api/products/:id` — **exists already.** Add the customers who bought it, and make it resolve soft-deleted rows (see above)
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

## Done when

- [ ] Pasting `/customers/12` into a fresh tab works with no white flash
- [ ] Pasting `/products/5` into a fresh tab works
- [ ] Pasting `/orders/42` into a fresh tab works
- [ ] A deleted product's page still opens, marked as deleted
- [ ] I can start at a customer, click to an order, click to a product, click to another customer

## Expected blockers

**Most likely today:** N+1 queries making the detail pages slow.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **N+1 queries** | The page takes seconds, and the terminal shows dozens of near-identical queries | One query per row instead of one query total. Use a single `include`, not a loop | High |
| Cold load flashes empty then fills | Hard refresh shows a blank table for a moment before data appears | The fetch is running only in the browser. `useAsyncData` should run it on the server too | Medium |
| Bad id crashes the page | `/products/abc` shows a stack trace instead of a page | Validate the param and `throw createError({ statusCode: 404 })` | Medium |
| "Who bought this" query is heavy | The product page is much slower than the customer page | Query `OrderItem` by `productId` and group by customer. Do not load every order and filter in JS | Medium |
| Deleted product's page 404s | Clicking through from an old order hits a dead end | **Already the case** — `[id].get.ts:47` scopes `deletedAt: null`. Detail routes must resolve soft-deleted products and mark them deleted; only **lists** exclude them. Keep the edit form's 404. An **archived** product's page just opens normally — it is a status, not a deletion | High |
| Old order shows today's price | The order total does not match the sum of its lines | The page is reading `Product.priceCents` instead of `OrderItem.unitPriceCents`. Always read the snapshot | High |

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **Day 3's evening ran into this slot** — the write path, `ProductForm`, both confirm modals and the error helpers were finished here, not on Day 3 | Not a debugging cost. Day 3's evening was six screens' worth of work priced as half a day, and the two read routes it needed were only discovered at planning time | Finished it rather than cutting it — every item on it is a brief requirement (field errors, the 4 states). The tracing pages below have not started | ~1 day |
|  |  |  |  |

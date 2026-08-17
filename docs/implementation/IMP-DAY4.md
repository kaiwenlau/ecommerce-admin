# Day 4 — Tuesday 18 August

**Goal:** Answer both tracing questions from the brief.

## Tasks

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
| Deleted product's page 404s | Clicking through from an old order hits a dead end | Detail routes must still resolve soft-deleted products, and mark them as deleted. Only **lists** exclude them. An **archived** product's page just opens normally — it is a status, not a deletion | Medium |
| Old order shows today's price | The order total does not match the sum of its lines | The page is reading `Product.priceCents` instead of `OrderItem.unitPriceCents`. Always read the snapshot | High |

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

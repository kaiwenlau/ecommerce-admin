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

- [x] The detail payload got its **own route**, `GET /api/products/:id/detail` — product plus buyers, and the only read route that resolves a soft-deleted row. `[id].get.ts` keeps `deletedAt: null`, so the edit form keeps its 404
- [x] `GET /api/customers` — list with paging **and search**
- [x] `GET /api/customers/:id` — customer plus their orders and items
- [x] `GET /api/orders/:id` — order, its line items, its customer, its status events
- [x] Build `/products/[id]` — details, stock, and **who bought this**
- [x] Build `/customers` — list
- [x] Build `/customers/[id]` — **what they bought, when, how much**, plus total spent
- [x] Build `/orders/[id]` — line items at the price paid, plus the customer. **Day 5 adds the status control and the timeline to this page**, so it has to exist first
- [x] Every order row links to the customer *and* to the order. Every product row links to the product
- [x] Show the **price paid at the time**, from `OrderItem`, not today's price
- [x] All 4 UI states on these pages too
- [x] `undelete.post.ts` now has a caller — a dev-only **Restore** button on the deleted banner

## Done when

- [x] Pasting `/customers/12` into a fresh tab works with no white flash
- [x] Pasting `/products/5` into a fresh tab works
- [x] Pasting `/orders/42` into a fresh tab works
- [x] A deleted product's page still opens, marked as deleted — and Restore brings it back
- [x] I can start at a customer, click to an order, click to a product, click to another customer

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
| **`[id].vue` next to `[id]/edit.vue` makes the detail page a PARENT route** | Caught before writing the file, from Nuxt's nested-routes rule | `pages/x.vue` plus `pages/x/child.vue` is how Nuxt declares a layout with children: `/products/12/edit` would then render the detail page **around** the form, and only if the detail page had a `<NuxtPage />` in it. Put the detail page at `[id]/index.vue` instead — two siblings, no nesting | ~0, predicted |
| **The generic half of `useTableQuery` was product-shaped** | The customer list needed paging and search from the URL and nothing else, but the composable imported `productListQuerySchema` directly | Split it: `useUrlQuery(schema)` holds the one-way-data-flow rule, the single writer and the default-stripping; `useTableQuery` is now a four-line wrapper adding the product table's sort and status. `/products` did not change | ~15 min |
| **`Date` on the server is a `string` in the browser** | Not a crash — a lie in the types. The route's return type says `createdAt: Date`, and typing a page with it promises a `Date` where JSON delivers an ISO string | First fix was a hand-written `Wire<T>` mapping `Date` to `string`. **Replaced on review:** it duplicated Nitro's own `Serialize`, which Nuxt already applies to every route. The routes now call `toIso()` themselves, so a handler's return type IS the wire type and no mapping is needed on either side. `formatDate()` was narrowed to `string` to make a missed conversion a compile error | ~15 min, +25 to redo |
| **Day 3's evening ran into this slot** — the write path, `ProductForm`, both confirm modals and the error helpers were finished here, not on Day 3 | Not a debugging cost. Day 3's evening was six screens' worth of work priced as half a day, and the two read routes it needed were only discovered at planning time | Finished it rather than cutting it — every item on it is a brief requirement (field errors, the 4 states). The tracing pages below have not started | ~1 day |
|  |  |  |  |

**Predictions that did not fire:** all four of the medium-and-high risks about queries. No N+1 —
each page is one `include` or one `groupBy`, and the buyers table is a single indexed read on
`OrderItem.productId` grouped in JS by `server/utils/buyers.ts`. No cold-load flash, because
`useFetch(..., { lazy: true })` still runs during SSR; `lazy` only decides whether the *navigation*
blocks. No stack trace on a bad id — every route validates the param before touching Postgres. And
no stale price: the order page reads `OrderItem.unitPriceCents`, and `Product.priceCents` is never
selected on that route, so reading the wrong one is not possible rather than merely avoided.

**Two small things changed after seeing them on screen**, neither of them provable server-side:
`shipped` and `delivered` were both green in the customer's order table and unreadable at a glance,
and a deleted product was showing an `archived` badge next to its deleted banner — implying the two
columns are one scale. The badge is now hidden while the row is deleted.

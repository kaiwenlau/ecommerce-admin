# Day 5 — Wednesday 19 August

**Goal:** All 3 bonus features. This is the fullest day.

**Do them in this order.** If I run out of time, the last one is the one to drop.

## 1. Stock that cannot oversell (morning, ~2 hours)

- [x] Write the order-creating service using one atomic update — `server/utils/createOrder.ts`:

```ts
const { count } = await tx.product.updateMany({
  where: { id, stock: { gte: qty } },
  data:  { stock: { decrement: qty } },
})
if (count === 0) throw new OutOfStockError(id)
```

- [x] Wrap the order and the stock change in one `$transaction`
- [x] Write **test 1**: two orders for the last item at the same time → exactly one wins
- [x] Write **test 2**: change a product price → the old order still shows the old price
- [x] Sanity check done: deleted the `gte` guard, test 1 failed, put it back
- [x] Added `POST /api/orders` over the service, so the rule can also be shown with two
      concurrent `curl`s and not only inside vitest. Nothing in `app/` calls it — there is no
      storefront. Verified: no cookie → 401, `qty: 0` → 422, archived product → 409,
      more than the shelf holds → 409, two at once for the last item → one 201 and one 409

`npx vitest run` now needs Postgres up (`npm run db:up`). A concurrency test cannot be faked,
so `test/db/create-order.test.ts` talks to the real database. It builds its own rows — `SKU-TEST-`
and `@test.invalid` — and deletes them again, so it never touches the seeded demo data.

## 2. Order status + audit trail (midday, ~2 hours)

- [ ] Forward moves only: `pending → paid → shipped → delivered`
- [ ] `cancelled` **only from `pending` or `paid`**. Once shipped cannot be cancelled. Return which is a different thing and out of scope
- [ ] Reject anything else on the server. The dropdown is a convenience, not the rule
- [ ] `PATCH /api/orders/:id/status` writes an `OrderStatusEvent` row in the same transaction
- [ ] Record who did it, from the session
- [ ] **Cancelling puts the stock back** — `pending`/`paid` means it never shipped, so the goods are still on the shelf. Same transaction as the status change and the event
- [ ] **Guard the transition in the `WHERE`, not with a read-then-write**, so two concurrent cancels cannot both restock
- [ ] Show the history as a timeline on `/orders/[id]` — the page built on Day 4

## 3. Bulk actions with partial failure (afternoon, ~3 hours)

**The bulk action is Archive — a `status` change, not a delete.** There is no bulk delete. Archive and soft delete are two different features ([DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3), and the destructive one does not belong behind a 10-row tick-box.

- [ ] Tick boxes on the product table, state kept in a Pinia store
- [ ] `POST /api/products/bulk` — try every item, **do not stop at the first failure**
- [ ] It calls the **same `checkRemovable()`** from `server/utils/productRemovable.ts` that Day 3's `PATCH` and `DELETE` use. One function, three callers — collect each result rather than throwing, so one blocked product does not stop the other nine
- [ ] Return one result per item: `{ id, ok, reason? }`
- [ ] Update the screen straight away (optimistic), keeping a copy of the old rows
- [ ] On the reply: keep the ones that worked, **put back the ones that failed**
- [ ] Show a panel listing the failures **and why each one failed**
- [ ] **Reduce the selection to exactly the failed IDs** once the response lands. Rule 2 of the two in `DECISIONS.md` — and it means Retry is just the same action run again, with no separate retry queue to keep in step
- [ ] A Retry button that only retries the failed ones

## Done when

- [x] `npx vitest run` — both tests pass (needs `npm run db:up` first)
- [ ] I can force a bad status change and the server refuses it
- [ ] The order page shows who changed the status and when
- [ ] Bulk archive 10 products where 3 fail → 7 change, 3 go back, panel lists the 3 with reasons
- [ ] Retry works and only touches the 3

## Expected blockers

**Most likely today:** running out of time. Three bonuses in one day is the tightest point of the week. Also the day where a test can *look* green while proving nothing.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Concurrency test passes but proves nothing** | It goes green on the first try, and still passes if I delete the `gte` guard | `await` one then the other is sequential, not concurrent. Must be `Promise.all([...])`. **Sanity check: break the guard on purpose and confirm the test fails.** A test that cannot fail is not a test | High |
| **Bulk request stops at the first failure** | 10 items sent, 1 fails, and the other 9 never ran | `Promise.all` rejects on first failure. Use `Promise.allSettled` and return one result per item | High |
| Rollback puts back the wrong rows | After a partial failure the table shows stale or wrong values | Snapshot **before** the optimistic update, and put back **only** the ids that came back failed. ("Put back", not "restore" — restore means un-deleting a record, which this build does not do) | High |
| **Retry re-runs the 7 that already worked** | Toolbar still says "10 selected" after a 7/3 result, and Retry archives everything again | The selection was never reduced to the failed IDs. Do that as soon as the response lands, before enabling Retry | High |
| No failures to demo | Bulk archive succeeds on all 10, so the interesting case is invisible | Already handled: the seed forces orders 1–3 to `pending` on products 1–3, which `checkRemovable()` rejects. Verify this still holds after any re-seed | Medium |
| Prisma `$transaction` times out | `Transaction already closed` or a timeout error under concurrency | Default timeout is short. Keep the transaction to the update and insert only — no slow work inside it | Medium |
| Status guard is only in the UI | Disabling the dropdown in devtools lets me set any status | The allowed-transition check must run **server-side**. The UI is a convenience, not the rule | High |
| **Double Cancelling restocks twice** | Stock climbs above what it should be after a double-click or a retried request | Do not read the status then write it. Put `status: { in: ['pending','paid'] }` in the `WHERE` and restock only if `count === 1` | High |
| **Day runs out** | It is 4pm and bulk actions is not working | **Drop bulk actions.** Two finished bonuses beat three half-done. Decide at 4pm, not 7pm | High |

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| Sanity check on test 1 | None — it did what the row above says to do | Deleted `stock: { gte: qty }` and re-ran. Test 1 failed, but on `PrismaClientKnownRequestError`, not a stock of `-1`: layer 2, the `CHECK (stock >= 0)`, caught what layer 1 stopped guarding. Both layers shown working in one run | 0 |

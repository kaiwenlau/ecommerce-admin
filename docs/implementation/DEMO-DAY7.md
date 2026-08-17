# Demo script — Friday 21 August

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
11. Bulk archive 10 products, 3 fail → show the failure list with reasons, then Retry the 3. Say: **archive is a status change, not a delete** — two separate features.
12. Filter `?status=archived` → the archived products are still there, reversible. Then show the seeded reused SKU: it appears once in the list, and the deleted product it took the SKU from appears under no filter at all. **Archiving keeps the SKU, deleting frees it.**

Have ready to answer: money as whole cents, **archive vs soft delete**, why Prisma, why Postgres. All in `docs/DECISIONS.md`.

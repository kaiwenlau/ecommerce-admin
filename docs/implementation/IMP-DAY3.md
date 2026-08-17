# Day 3 — Monday 17 August

**Goal:** I can add, edit and delete a product. Every screen handles all 4 states.

**First 15 minutes:** read `docs/NOTES.md` and run the app. It has been 4 days.

## Tasks

**Forms**

- [ ] Write the shared Zod schemas in `shared/schemas/product.ts`
- [ ] `POST /api/products` — parse with Zod, then **pass the parsed object to Prisma, never the raw `body`**. `parse()` drops undeclared keys; `create({ data: body })` would not
**Archive and delete — two features, not one**

Full rules in [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3. Archive is `status = 'archived'`, reversible, keeps the SKU. Delete is `deletedAt`, neither. Build the guard once, here — Day 5's bulk action calls the same function.

- [ ] Write `server/utils/productRemovable.ts` — `checkRemovable(productId) → { ok, reason? }`. Not `ok` when the product sits on a `pending` or `paid` order
- [ ] `PATCH /api/products/:id` — status may move between `draft`/`active`/`archived`. **Run the guard on a move to `archived`**
- [ ] `DELETE /api/products/:id` — set `deletedAt`, do not really delete. **Runs the same guard.** Delete is more destructive than archive, so it can never be the more permissive
- [ ] Do **not** touch `status` when deleting. A deleted row keeps its old status and nothing ever reads it
- [ ] Build create and edit pages using `UForm` with the same schema
- [ ] **Field-level errors:** on failure return `error.flatten().fieldErrors`, turn it into `[{ name, message }]`, pass to `form.setErrors()`
- [ ] Catch Prisma error `P2002` (duplicate) and turn it into a `sku` field error, not a toast
- [ ] Both archive and delete need a confirm modal, and **the wording differs** — archive: reversible, SKU stays reserved. Delete: not reversible here, frees the SKU
- [ ] The delete modal also **warns** (does not block) when the product appears on *finished* orders, and says how many. That is history, not outstanding work

**The 4 UI states — every screen that loads data**

- [ ] **Loading** — skeleton rows, not a spinner over the whole page
- [ ] **Empty** — "No products yet" with a Create button. Different message for "no search results"
- [ ] **Error** — message plus a Retry button
- [ ] **'Unauthorised'** — a 401 from any endpoint sends the user to `/login`

**Why no 403:** 403 is unreachable in this version. Because there is only one admin user and no roles, so every logged-in request is admin, and he allowed to do everything. There is no request that is both authenticated and forbidden.

- **401** = Unauthenticated. Not logged in, or session expired.
- **403** = Authenticated, but unauthorised. Access denied.

## Done when

- [ ] Saving a duplicate SKU shows **"SKU already exists" under the SKU box** — not a toast
- [ ] Turning off JavaScript validation and posting bad data still fails on the server
- [ ] Every list screen shows something sensible when empty
- [ ] Stopping the database mid-use shows the error state, and Retry works after restart

## Expected blockers

**Most likely today:** the Zod → `setErrors` shape mismatch. It is the core requirement of the day, so solve it first and reuse the helper everywhere.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **`setErrors` does nothing** | Server rejects the save, but no red text appears under any field | Shape mismatch. `UForm` wants `[{ name: "sku", message: "..." }]`; Zod gives `{ sku: ["..."] }`. Write **one** helper to convert, use it on every form | High |
| **Prisma duplicate error is unreadable** | A wall of Prisma text instead of "SKU already exists" | Catch code `P2002`. The offending field is in `err.meta.target`. Map it to a field error, never a toast | High |
| Zod v4 `flatten()` differs from v3 | `fieldErrors` is undefined, or nested unexpectedly | This project is on Zod 4. Check the shape in a REPL once, then build the helper around what it really returns | Medium |
| Price sent as `"19.99"`, stored as `1999` | Prices show 100× too small, or as `19.99` in the database | Convert in the Zod schema with `.transform()`, in **one** place. Never convert ad hoc in a component | Medium |
| Deleted products still show | A product I deleted reappears in the list | A query is missing `where: { deletedAt: null }`. Easy to miss on one of several queries | Medium |
| **Archive and delete get muddled** | The Archive button sets `deletedAt`, or Delete sets `status='archived'`, or `?status=archived` hides deleted rows by accident | Two columns, two features. `deletedAt: null` is unconditional on every list; the status filter layers on top and never replaces it. Re-read [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3 before wiring either button | High |
| **The guard only runs on one route** | I can archive a product from its edit page that the bulk action refuses | One `checkRemovable()` in `server/utils/`, called by `PATCH`, `DELETE` and the bulk endpoint. Never re-implement the rule per route | High |
| Client validation passes, server rejects | Form submits happily, then fails server-side | The two are using different schemas. They must import the same file from `shared/` | High |
| **A `curl` can set columns the form never showed** | `curl -d '{"name":"X","stock":999999}'` succeeds and the stock really changes | The handler passed raw `body` to Prisma instead of the parsed object. Only `parse()` output goes to the database | High |
| Empty state hard to test | Cannot tell whether the empty state works | Force it with `?search=zzzzzz` | Low |

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
|  |  |  |  |

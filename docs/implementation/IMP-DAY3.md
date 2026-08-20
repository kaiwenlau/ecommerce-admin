# Day 3 — Monday 17 August

**Goal:** I can add, edit and delete a product. Every screen handles all 4 states.

**First 15 minutes:** read `docs/logs/NOTES.md` and run the app. It has been 4 days.

Split into two halves. The morning is the write path, and everything on it is provable with
`curl` and `vitest`. The evening is the screens, and nothing on it is provable that way —
Day 2 shipped two bugs that rendered perfectly server-side and were broken for a real user.
The seam is there on purpose.

---

## Morning — the write path

Server only. No pages. Finish the gate below before opening a browser.

### Tasks

**Schemas**

- [x] Write the shared Zod write schemas in `shared/schemas/product.ts`, next to the list
      query schema that is already there
- [x] **No `.catch()` on any of them.** The list query catches because a mangled URL should
      degrade to a default; a bad price on a form must fail loudly
- [x] Price arrives as `"19.99"` and reaches Prisma as `1999`. Convert with `.transform()`
      in the schema, in **one** place. Round, never truncate — `19.99 * 100` is `1998.999…`

**Archive and delete — two features, not one**

Full rules in [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3. Archive is
`status = 'archived'`, reversible, keeps the SKU. Delete is `deletedAt`, neither. Build the
guard once, here — Day 5's bulk action calls the same function.

- [x] Write `server/utils/productRemovable.ts` — `checkRemovable(productId) → { ok, reason? }`.
      Not `ok` when the product sits on a `pending` or `paid` order
- [x] Same function also returns how many **finished** orders the product appears on. That
      does not block. The evening's delete modal shows the number

**Endpoints**

- [x] `POST /api/products` — parse with Zod, then **pass the parsed object to Prisma, never
      the raw `body`**. `parse()` drops undeclared keys; `create({ data: body })` would not
- [x] `PATCH /api/products/:id` — status may move between `draft`/`active`/`archived`.
      **Run the guard on a move to `archived`**
- [x] `DELETE /api/products/:id` — set `deletedAt`, do not really delete. **Runs the same
      guard.** Delete is more destructive than archive, so it can never be the more permissive
- [x] Do **not** touch `status` when deleting. A deleted row keeps its old status and nothing
      ever reads it
- [x] Never resurrect a soft-deleted row: every write scopes by `deletedAt: null` too

**Error shape**

The morning owns the shape on the wire. The evening owns rendering it.

- [x] On a validation failure return `z.flattenError(error).fieldErrors` — Zod 4 renamed
      v3's `error.flatten()`. Wire shape is `{ fieldErrors: { sku: ['…'] } }`, the same
      shape `POST /api/auth/login` already returns, so the forms read one shape
- [x] The `[{ name, message }]` conversion `setErrors()` wants is a **client** concern and
      belongs in one client helper — that is the evening's first job
- [x] Catch Prisma error `P2002` (duplicate) and turn it into a `sku` **field error**, not a
      toast message

### Done when

- [x] All three routes return **401** with no cookie, before any database work
- [x] Posting bad data with `curl` fails on the server — no browser validation involved
- [x] A `curl` carrying a column the form never showed does **not** write it. Re-read the row
- [x] A duplicate SKU comes back as a `sku` entry in `fieldErrors`, not a message string
- [x] Archive **and** delete are both refused for a product on a `pending`/`paid` order, and
      both allowed for one that is not
- [x] A deleted product is gone from `GET /api/products` under **every** `?status=`, `All`
      included, and its SKU can be reused by a new `POST`

### Expected blockers

**Most likely this morning:** the Zod v4 `flatten()` shape. Everything downstream is built on
it, so check what it really returns before writing the helper.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **Prisma duplicate error is unreadable** | A wall of Prisma text instead of "SKU already exists" | Catch code `P2002`. The offending field is in `err.meta.target`. Map it to a field error, never a toast | High |
| Zod v4 `flatten()` differs from v3 | `fieldErrors` is undefined, or nested unexpectedly | This project is on Zod 4. Check the shape in a REPL once, then build the helper around what it really returns | Medium |
| Price sent as `"19.99"`, stored as `1999` | Prices show 100× too small, or as `19.99` in the database | Convert in the Zod schema with `.transform()`, in **one** place. Never convert ad hoc in a component | Medium |
| Deleted products still show | A product I deleted reappears in the list | A query is missing `where: { deletedAt: null }`. Easy to miss on one of several queries | Medium |
| **Archive and delete get muddled** | The Archive button sets `deletedAt`, or Delete sets `status='archived'`, or `?status=archived` hides deleted rows by accident | Two columns, two features. `deletedAt: null` is unconditional on every list; the status filter layers on top and never replaces it. Re-read [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3 before wiring either button | High |
| **The guard only runs on one route** | I can archive a product from its edit page that the bulk action refuses | One `checkRemovable()` in `server/utils/`, called by `PATCH`, `DELETE` and the bulk endpoint. Never re-implement the rule per route | High |
| **A `curl` can set columns the form never showed** | `curl -d '{"name":"X","stock":999999}'` succeeds and the stock really changes | The handler passed raw `body` to Prisma instead of the parsed object. Only `parse()` output goes to the database | High |

---

## Evening — the screens

Everything here needs a real browser. `curl` and server-rendered HTML cannot prove a single
line of it.

### Tasks

**Two read routes the morning did not need**

- [x] `GET /api/products/:id` — the edit form cannot fill itself otherwise. The list payload has
      no `description`, and a refresh on `/products/12/edit` has no list in memory to read.
      Nominally Day 4's route, pulled forward
- [x] `GET /api/products/:id/removable` — `checkRemovable()` with nothing written. The delete
      modal has to show the finished-order count *before* the user confirms, and the mutating
      handlers only answer once the row has already changed

**Forms**

- [x] Build create and edit pages using `UForm` with the **same schema the server imports**
- [x] **Field-level errors:** write the ONE helper that turns the morning's
      `{ sku: ['…'] }` into the `[{ name, message }]` `form.setErrors()` wants, and use it
      on every form
- [x] The duplicate SKU lands under the SKU box, not in a toast

**Confirm modals**

- [x] Both archive and delete need a confirm modal, and **the wording differs** — archive:
      reversible, SKU stays reserved. Delete: not reversible here, frees the SKU
- [x] The delete modal **warns** (does not block) when the product appears on *finished*
      orders, and says how many. That is history, not outstanding work. The count comes from
      `checkRemovable()`
- [x] Row actions on `/products` wire to both

**The 4 UI states — every screen that loads data**

- [x] **Loading** — skeleton rows, not a spinner over the whole page
- [x] **Empty** — "No products yet" with a Create button. Different message for "no search results"
- [x] **Error** — message plus a Retry button
- [x] **'Unauthorised'** — a 401 from any endpoint sends the user to `/login`

**Why no 403:** 403 is unreachable in this version. Because there is only one admin user and
no roles, so every logged-in request is admin, and he allowed to do everything. There is no
request that is both authenticated and forbidden.

- **401** = Unauthenticated. Not logged in, or session expired.
- **403** = Authenticated, but unauthorised. Access denied.

### Done when

- [x] Saving a duplicate SKU shows **"SKU already exists" under the SKU box** — not a toast
- [x] Turning off JavaScript validation and posting bad data still fails on the server
- [x] Every list screen shows something sensible when empty
- [x] Stopping the database mid-use shows the error state, and Retry works after restart
- [x] Archiving and deleting both work from the list, each behind its own worded modal

### Expected blockers

**Most likely this evening:** the Zod → `setErrors` shape mismatch. It is the core
requirement of the day, so solve it first and reuse the helper everywhere.

| What might go wrong | How I will know | What to do | Risk |
|---|---|---|---|
| **`setErrors` does nothing** | Server rejects the save, but no red text appears under any field | Shape mismatch. `UForm` wants `[{ name: "sku", message: "..." }]`; Zod gives `{ sku: ["..."] }`. Write **one** helper to convert, use it on every form | High |
| Client validation passes, server rejects | Form submits happily, then fails server-side | The two are using different schemas. They must import the same file from `shared/` | High |
| Empty state hard to test | Cannot tell whether the empty state works | Force it with `?search=zzzzzz` | Low |

## Blocker log

### Morning

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **`npm run db:reset` crashed the seed** — `ReferenceError: Cannot access 'orders' before initialization`. Pre-existing, nothing to do with Day 3 | Latent since the forced-orders edit. Nothing had re-seeded from scratch since, so it had never run. Found only because the `curl` gate left test rows and I went to rebuild | The "recompute totals for the forced orders" loop read `orders`, declared 12 lines *below* it. The loop existed only because `totalCents` was summed from the pre-substitution items. Computed the total from the items the order actually gets and deleted the loop. All 200 order totals now agree with their line items; the 3 forced ones did not before | ~20 min |
| **Predicted, and it happened:** Zod v4 dropped `error.flatten()` | The table said to check the shape once before building on it, so I did — one throwaway script, before writing the helper | It is `z.flattenError(error)` now, and `fieldErrors` inside is unchanged. `login.post.ts` was already using it, so the wire shape was decided before I got here | ~5 min |
| **A *missing* field is not a *blank* field.** `{}` gave "Invalid input: expected string, received undefined" where a blank string gave "SKU is required" | Only visible through `curl`. The form always sends a string, so every browser path shows the friendly message and the ugly one hides behind the API | `.min(1, msg)` only fires once the value IS a string. Added `z.string({ error: msg })` so the missing case reads the same, and a test row per field | ~10 min |

**Predictions that did not fire:** the P2002 wall of text (caught first time), archive/delete getting muddled, and raw `body` reaching Prisma. Cheap insurance — the last two were the reason the endpoints were written the way they were.

### Evening

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **Two read routes were missing before a single screen could be built** — `GET /api/products/:id` and `/removable` | Found at planning, not mid-build, so it cost scope rather than debugging. The morning only ever needed to *write* | Wrote both. The detail route is Day 4's, borrowed early. `removable.get.ts` is four lines around the existing `checkRemovable()` — no second copy of the rule | ~20 min |
| **`nuxt typecheck` died on "Excessive stack depth"** on `$fetch(\`/api/products/${id}\`, { method: 'PATCH' })` | Not a type error in my code, so I went looking in the wrong place first. Lint and `vitest` were both green | Nitro types `$fetch` against every route, and a template literal makes TypeScript match `/api/products/${number}` against the whole table. `app/utils/productPath.ts` returns a plain `string` to opt out; each caller now states its own response type | ~25 min |
| **`UForm`'s submit event hands back the schema's OUTPUT, not the state** | Caught while writing `ProductForm`, before it ran. Would have been baffling live: the client validates fine and the server rejects the same value | The price transform means `event.data.priceCents` is already `1999`, and the server expects `"19.99"` to convert. The form emits the raw `state` instead. Parsing happens once, server-side | ~10 min |
| **The Delete button did nothing visible on a product the guard refuses** | Looked like a broken handler. It was not: the 409 was caught and rendered correctly. The refusal was simply ALREADY on screen from the pre-check, so clearing it and re-setting the identical string left the DOM unchanged, and the only evidence of the click was Chrome's own network line | Two fixes. `errorMessage()` in `app/utils/` reads the JSON body instead of `error.statusMessage` — that property is the HTTP reason phrase, absent under HTTP/2, and `'' ?? fallback` is `''`. Then the confirm button is disabled outright when the pre-check already said no, so the click cannot happen | ~30 min |
| `UModal` renders its body wrapper whenever the slot exists | Cosmetic — an empty strip in the archive modal, which has no warning to show | `v-if` has to go on the `<template #body>` itself, not on the content inside it | ~5 min |

**Predictions that did not fire:** the `setErrors` shape mismatch — the headline risk of the day. The morning had already settled the wire shape (`{ fieldErrors: { sku: ['…'] } }`, the same one `login.post.ts` returns), so the client half was one pure function and a unit test. The blocker table's advice was to solve it first; it turned out to have been solved the previous half-day.

**Also confirmed by hand, since neither is provable server-side:** a duplicate SKU renders under the SKU box and not in a toast, and the delete modal shows the real finished-order count while Cancel is still an option.

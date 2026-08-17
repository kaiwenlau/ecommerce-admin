# Day 2 — Wednesday 12 August

**Goal:** I can log in, and I can see a product list that pages, searches, filters and sorts.

## Tasks

**Login (morning)**

- [x] Add the admin user to the seed, password hashed with `hashPassword()`
- [x] Build `/login` page with `UForm`
- [x] Build `POST /api/auth/login` — check password, start session
- [x] Build `POST /api/auth/logout`
- [x] Add `requireUserSession(event)` to every protected API route
- [x] Add client middleware to send logged-out users to `/login`
- [x] Test with `curl` that the API returns **401** when logged out

**Product list (afternoon)**

- [x] Build `GET /api/products` — takes `page`, `search`, `status`, `sort`, `dir`
- [x] **`deletedAt: null` goes on this query first and unconditionally**, then the status filter on top. Archive and delete are different features — [DATABASE-DESIGN.md](../decisions/DATABASE-DESIGN.md) §3. A deleted product must be invisible whatever `?status=` says, `All` included
- [x] Paging, searching and sorting all happen **in SQL**, not in the browser
- [x] Return `{ items, total, page, pageCount }`
- [x] Build `/products` page with `UTable`
- [x] Search box, debounced so it does not fire on every keystroke
- [x] One filter dropdown (status) — `All` / `draft` / `active` / `archived`. It filters `status` only; nothing to do with deletion
- [x] Two sortable columns (name, price)
- [x] Write `useTableQuery` composable — keeps all of the above in the URL
- [x] Write the Zod schema that reads the URL safely
- [x] **Clear the tick-box selection whenever search, filter, sort or page changes** — one watcher on the whole query object, not four separate ones. Rule 1 of the two in `DECISIONS.md`
- [x] **The 4 UI states on this list** — loading, empty, error, 'unauthorised'. Do it now, not on Day 3. This is the first data screen and the first thing a reviewer opens, and the brief says it looks closely at these

**End of day (do not skip)**

- [x] Write a short note in `docs/NOTES.md`: what works, what is half-done, what is next

## Done when

- [x] Logging out and visiting `/products` sends me to `/login` — 302 to `/login?redirect=/products`
- [x] `curl http://localhost:3000/api/products` returns 401 with no cookie
- [x] This URL works after a full refresh: `/products?search=shirt&status=active&page=2&sort=price&dir=desc`
- [x] Copying that URL into a new tab shows the same filtered list
- [ ] The browser back button goes back to the previous filter
- [x] `?status=archived` lists the archived products the seed made — archived is a **status**, and it is reachable
- [x] A soft-deleted product from the seed appears under **no** status filter, `All` included
- [x] The seed's reused SKU shows exactly **once** — the live product, never the deleted one it took the SKU from

### Still to check by hand in a browser

Everything above was verified by driving the server: `curl` for the API, and the
server-rendered HTML of `/products` for the page. That covers every query the
list can run, but it cannot click. These four are built but unobserved:

- [ ] Back button walks back through previous filters
- [ ] Search fires **one** request ~300ms after the last keystroke, not one per letter
- [ ] Ticking rows then changing a filter empties the selection
- [ ] Skeleton rows on a throttled connection, with no flash of the empty state

The demo URL in the list above is worth knowing about: `?search=shirt&status=active`
matches only **4** products, so `page=2` is genuinely past the end. It renders a
third empty state — "Page 2 is past the end. 4 products across 1 page." — rather
than claiming nothing matched.

## Expected blockers

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

## Blocker log

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **Ran a code review over Day 1 before starting Day 2.** It found the seed importing `@adonisjs/hash` without declaring it — it only resolved because npm hoists the package out of `nuxt-auth-utils` | Nothing was broken, so nothing would have told me. It would have surfaced later as `Cannot find module` on a fresh clone, or the moment `nuxt-auth-utils` changed its hasher | Declared it at `9.1.1` in `devDependencies`. Code unchanged — the imports were always correct, they were just undeclared | ~15 min |
| **Same review: cancelled orders had a corrupt audit trail.** 34 of 200 had a first event of `→ paid`, so the timeline claimed they were created already paid and the `pending → paid` step was missing | The audit trail is a Day 5 bonus. I would have built the feature against demo data that contradicts it, and probably only noticed while rehearsing the demo | Fixed the seed's cancelled path to `['pending','paid','cancelled']` and re-seeded. Also removed a no-op variable and an `as` cast that was hiding a real type error | ~20 min |

**About 35 minutes, spent before writing any Day 2 code.** Both were latent — the app ran fine with them. Worth it: the second one would have shown up while rehearsing the demo, which is the worst possible moment to find that your seed data disagrees with your feature.

### Afternoon — the product list

| What happened | Why it cost time | What I did | Time lost |
|---|---|---|---|
| **The debounced search box quietly hijacked the Back button.** I had `watch(searchInput, …)` firing the debounced URL write. Pressing Back onto a `?page=3` entry re-synced the input, which retriggered that watcher, which called `patch()` — and `patch()` resets paging. So 300ms after Back, the page silently jumped to page 1 | Found by re-reading the code, not by running it. Nothing throws. It is a 300ms-delayed wrong answer that looks like the Back button being flaky | Moved the write onto the input's `@update:model-value` instead of a watcher on the ref. The event only fires on real typing; a programmatic `searchInput.value = …` does not emit. The expected-blocker table said "only write to the URL from user actions" — I had got the *direction* right and the *trigger* wrong | ~20 min |
| **Layouts were never rendering.** Extracted the header and sign-out into `app/layouts/default.vue`, and nothing changed on screen | `app.vue` had a bare `<NuxtPage />`. Nuxt logs `NUXT_E4007` for exactly this, but it is one line in a wall of dev-server output and I only saw it when I went looking for icon warnings | Wrapped it: `<NuxtLayout><NuxtPage /></NuxtLayout>` | ~10 min |
| **The sort indicator rendered as an invisible blank box.** `arrow-up` and `arrow-down` worked; the third state, the unsorted one, did not | The two that worked only worked *by accident* — Nuxt UI bundles them for its own components. Nuxt Icon bundles only icons it can statically see, and mine come out of a `sortIcon()` function at runtime. So the failure looked icon-specific when it was actually about every icon name the app builds in script. Swapping `chevrons-up-down` for `arrow-up-down` reproduced it exactly and ruled the specific icon out | `npm i -D @iconify-json/lucide` for a local collection, plus `icon: { clientBundle: { scan: true } }` in `nuxt.config.ts` so the bundle is built from a source scan. Bundle went 43 → 44 icons, warnings went to zero | ~25 min |

**About 55 minutes.** The URL-state infinite loop the table predicted as "most likely today, budget an hour" never happened — making `query` a read-only computed over `route.query`, with one writer only ever called from a user action, meant there was no watcher that could feed itself. The hour went to a subtler version of the same mistake instead: not a loop, but a watcher writing the URL in response to a change the *URL* had just made.

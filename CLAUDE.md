# ecommerce-admin

Nuxt 4 + Postgres 16 + Prisma 7 (`@prisma/adapter-pg`) + Zod 4 + Nuxt UI v4 + Pinia. Admin panel only, no storefront. Six-day onboarding build, demo Fri 21 Aug 2026.

## Docs — read the index first, not the whole tree

- `docs/BRIEF.md` — the original task.
- `docs/DECISIONS.md` — index. Table says which `docs/decisions/*.md` to open. Read only that one.
- `docs/IMPLEMENTATION.md` — index. Calendar links each `docs/implementation/IMP-DAY*.md`.

Do not read `docs/logs/` unless asked. They are day journals, not reference, and are git-ignored.

## Style

- Arrow functions by default: `const f = () => {}`.
- Use a normal function `function f() {}` only where it is actually required — TypeScript overload signatures, generators, or a helper that must hoist.
- No ESLint rule enforce; it is a convention with some real exceptions.

- Pinia:
    - Prefer **setup** stores (`defineStore('x', () => { ... })`) over options stores.
    - Setup stores are all-arrow and have no `this`, so they don't reintroduce the one case where `function` is unavoidable in component code.

## Comments — write them for someone who knows JS and Vue, not this stack

The author is solid on plain JavaScript and Vue 3, but new to **Nuxt, Zod, Prisma, Postgres and Pinia**. Comments should carry the weight there.

- **Explain JavaScript only where it genuinely surprises.** Nothing on `map`, `await`, spread or a ternary — those are day-to-day. Do comment the traps: temporal dead zone, `this` binding, a shared reference being mutated in place.
- **Do explain what a library call actually does**, in plain words, before naming its API. "Zod keeps only the fields listed here and throws the rest away" beats "`parse()` strips undeclared keys".
- **Name the other half.** If the sentence is about something happening in another file, say which file or endpoint. A comment on a schema that talks about parsing must say where the parsing runs.
- **Say why, not what.** The code already says what. `Math.round` needs a comment because `19.99 * 100` is `1998.9999999999998`; `.trim()` does not.
- **One idea per comment.** If it needs three clauses and a dash, it is two comments.
- **Name SQL and database behaviour explicitly** — indexes, transactions, constraints, what a query costs. Same for Prisma methods that hide a query.

Bad — mentions an API that is not on the page, and assumes the reader knows what it does:

```ts
// `parse()` drops undeclared keys, so only its OUTPUT reaches Prisma.
```

Good — plain words, and it says where the work happens:

```ts
// Zod keeps only the fields listed here and throws away anything else it is
// given. `POST /api/products` checks the request body against this schema and
// saves what comes back — so a request that also sent `deletedAt` is dropped here.
```

## Two things that are easy to get wrong

- **`status` and `deletedAt` are different features.** Archive (`status='archived'`) is reversible and keeps the SKU. Delete (`deletedAt`) is neither. See `docs/decisions/DATABASE-DESIGN.md` §3 before touching either.
- **Every product list query needs `deletedAt: null` unconditionally**, with the status filter layered on top.

## Commands

- `docker compose up -d` — Postgres
- `npm run dev`
- `npx prisma migrate reset --force` — rebuild + seed
- `npx prisma studio`

Two SQL rules are hand-written in the migration (a `CHECK (stock >= 0)` and the `product_sku_active` partial index). `prisma migrate dev` must be run `--create-only` if they need changing.

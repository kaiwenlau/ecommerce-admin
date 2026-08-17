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

## Two things that are easy to get wrong

- **`status` and `deletedAt` are different features.** Archive (`status='archived'`) is reversible and keeps the SKU. Delete (`deletedAt`) is neither. See `docs/decisions/DATABASE-DESIGN.md` §3 before touching either.
- **Every product list query needs `deletedAt: null` unconditionally**, with the status filter layered on top.

## Commands

- `docker compose up -d` — Postgres
- `npm run dev`
- `npx prisma migrate reset --force` — rebuild + seed
- `npx prisma studio`

Two SQL rules are hand-written in the migration (a `CHECK (stock >= 0)` and the `product_sku_active` partial index). `prisma migrate dev` must be run `--create-only` if they need changing.

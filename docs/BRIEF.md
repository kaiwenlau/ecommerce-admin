# Onboarding Project: E-commerce Admin Platform

Welcome aboard. Your first project is a self-contained build. The goal isn't to ship this to production — it's to give you a real problem in our stack so you get familiar with the tools, and so we get a shared reference point for how we like to work. Treat it as you would a normal ticket: ask questions, push back on anything that seems wrong, and tell us if something is underspecified.

## TECH STACK

- Framework: Nuxt (3 or 4, your call — say which and why)
- Styling: Tailwind CSS
- Database: MySQL or PostgreSQL
- API: Nuxt server routes (server/api), no separate backend service
- ORM / query layer: your choice (Prisma, Drizzle, Kysely, raw SQL) — be ready to justify it
- Everything else — state management, validation library, component library, table library — is your decision. We're interested in the reasoning as much as the choice.

## CORE REQUIREMENTS

1. Data model

   > Design the schema yourself. At minimum you'll need products, customers, orders, and order line items. Ship it as migrations, not a hand-written SQL dump, and include a seed script that populates enough realistic data to make the UI meaningful (~50 products, ~30 customers, ~200 orders). Be prepared to explain your decisions on money storage, soft vs hard deletes, and how you handle a product's price changing after an order was placed.

2. Admin dashboard, product CRUD

- List view with server-side pagination, search, and at least one filter (e.g. category or status). Sorting on at least two columns.
- Create and edit forms with validation on both client and server. Server-side validation errors must map back to the specific field that caused them, not a generic error toast.
- Delete, with whatever safety you think is appropriate.
- Detail view on its own route, deep-linkable and working on a cold page load.
  > Filter, search and pagination state should survive a refresh and be shareable as a URL.

3. Purchase tracing
   > We need to be able to answer both of these from the UI:

- Given a customer, what have they bought, when, and for how much.
- Given a product, which customers bought it.
  > How you surface that is up to you. A customer detail page and a product detail page is the obvious shape, but if you have a better idea, take it.

4. Required UI states
   > Every screen that touches data needs to handle loading, empty, error, and unauthorised. We look closely at this — it's usually the difference between a demo and a product.
5. Auth
   > Some form of admin login gating the dashboard. Keep it simple; a single admin user is fine. Server routes must be protected server-side, not just hidden in the UI.

## BONUS ITEMS

1. High value

- Bulk actions with partial failure. Multi-select products, then bulk archive or bulk stock update. The interesting case is when 7 succeed and 3 fail: show which ones failed and why, and offer retry on just those. Optimistic update with correct rollback.
- Stock management that can't oversell. Two orders for the last item in stock, placed simultaneously. Handle it properly at the database level and be ready to explain how.
- Order status workflow (pending, paid, shipped, delivered, cancelled) with an audit trail of who changed what and when.
- Tests. Doesn't need to be comprehensive, but a few meaningful tests on the data layer and one end-to-end flow (Playwright or similar) tells us more than a large number of shallow ones.

2. Medium value

- Storefront and checkout. A minimal public-facing product listing and checkout that creates real orders instead of seeded ones.
- End-to-end type safety: shared schemas between client and server, typed API responses.
- Product variants (size, colour) with per-variant stock and pricing.
- Image upload with progress, cancel and retry.
- Dashboard analytics: top products, repeat customers, revenue over a selectable date range.
- CSV import and export for products, with row-level error reporting on import.
- Docker Compose setup so the whole thing (app plus database) runs with one command.

3. Nice to have

- Accessibility: keyboard navigation, focus management in modals, proper labelling.
- Rate limiting on write endpoints.
- Activity log, or soft delete with restore.
- SSR and SEO handling on any public pages.
- Dark mode.

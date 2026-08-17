# Implementation Plan

Day-by-day build plan. Stack choices and reasons are in [DECISIONS.md](./DECISIONS.md).

## Calendar

| Day | Date | Task | Plan |
|---|---|---|---|
| **Day 1** | Tue 11 Aug | Setup, database, seed | [IMP-DAY1](./implementation/IMP-DAY1.md) |
| **Day 2** | Wed 12 Aug | Login + product list | [IMP-DAY2](./implementation/IMP-DAY2.md) |
| — | Thu 13 – Sun 16 | **Not working** | — |
| **Day 3** | Mon 17 Aug | Product add / edit / archive / delete + UI states | [IMP-DAY3](./implementation/IMP-DAY3.md) |
| **Day 4** | Tue 18 Aug | Detail pages + purchase tracing | [IMP-DAY4](./implementation/IMP-DAY4.md) |
| **Day 5** | Wed 19 Aug | All 3 bonus features | [IMP-DAY5](./implementation/IMP-DAY5.md) |
| **Day 6** | Thu 20 Aug | Fix, polish, practise the demo | [IMP-DAY6](./implementation/IMP-DAY6.md) |
| **Day 7** | **Fri 21 Aug** | **DEMO** | [DEMO-DAY7](./implementation/DEMO-DAY7.md) |

Each day file has a to-do list, expected blockers, and a blocker log. How those two blocker sections work: [BLOCKER-METHOD.md](./implementation/BLOCKER-METHOD.md). What actually happened each day: [logs/](./logs/).

## If I fall behind

Drop things in this order. Top of the list goes first.

| Order | What to drop | Why it is safe |
|---|---|---|
| 1 | Bulk actions | A bonus, not a requirement. The most expensive thing here |
| 2 | Dark mode polish | Nice to have. Nuxt UI mostly does it anyway |
| 3 | Customer list page | Tracing still works from the product side |
| 4 | Audit trail timeline UI | Keep saving the events, just show them as a plain list |

**Never drop these.** They are core requirements in the brief, and dropping one means failing it:

- Login with the check on the server
- Field-level validation errors
- URL that survives a refresh
- The 4 UI states
- Both tracing directions

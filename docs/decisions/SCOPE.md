# What I built and what I skipped

**Bonus items I did, in this order:**

1. **Stock that cannot oversell** — best value for the time. Most likely to be asked about.
2. **Order status + audit trail** — mostly a table recording who changed what and when. Cheap, and makes the order page much better.
3. **Bulk actions with partial failure** — the most expensive of the three, so I did it last. If I lost a day, I would lose a bonus, not a core requirement.

**Skipped:** storefront and checkout, product variants, image upload, CSV, analytics. Each is a day or more. Three finished bonuses beat five half-built ones.

**On "soft delete with restore", which the brief lists as a bonus:** I use soft delete, but as the *delete mechanism*, not as a feature — deleting a product sets `deletedAt` because erasing it would destroy order history. I did **not** build the restore screen, so I am not claiming it as a fourth bonus. Archive covers the reversible case, and it is a different thing ([DATABASE-DESIGN.md](./DATABASE-DESIGN.md) §3).

**Tests — I cut these down instead of cutting them out.** Two tests on the data layer:

1. Two orders hit the last item at the same time → exactly one succeeds.
2. Change a product's price → the old order still shows the old price.

About an hour. These two cover the claims in these documents that would otherwise just be me saying so. I skipped the Playwright browser test. That is the weakest part of my scope — if I found another half day, that is where it would go.

# What I would do differently for a real product

Most choices above are shaped by "6 days, then nobody touches it." If that were not true:

- **Drizzle instead of Prisma.** For anything long-lived, being closer to SQL wins, and both problems I described above disappear.
- **Playwright tests** on login and checkout, not just the data layer.
- **A proper seed script** that can be run twice without creating duplicates.
- **Customer deletion and a GDPR path.** Any system holding real customer data needs this. This one ignores it on purpose.

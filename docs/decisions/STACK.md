# The Tech Stack

| Layer         | Pick            | Reason                                                                   |
| ------------- | --------------- | ------------------------------------------------------------------------ |
| Framework     | Nuxt 4          | Lets me write one validation rule and use it on both browser and server. |
| Styling       | Tailwind CSS v4 | Required by the brief. Comes free inside Nuxt UI                         |
| Components    | Nuxt UI v4      | One install gives me table, modals, forms, dark mode                     |
| Database      | PostgreSQL 16   | Can block bad data at the database level                                 |
| ORM           | Prisma 7        | Fastest way to go from idea to working database                          |
| Validation    | Zod 4           | Its error format matches what the form needs                             |
| Client state  | Pinia 4         | Holds checkbox selection for bulk actions                                |
| Auth          | nuxt-auth-utils | Login check runs on the server, not just the UI                          |
| Lint + format | @nuxt/eslint    | One tool instead of two                                                  |
| Seed data     | Faker           | Fake products that look real                                             |
| Tests         | Vitest, 2 tests | Proves the stock fix works                                               |

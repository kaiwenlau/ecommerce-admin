# Packages I chose not to install

| Package                  | Why not                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `@tanstack/vue-query`    | Duplicates Nuxt's fetching. I need its undo feature on one screen, so I wrote that myself |
| `@tanstack/vue-table`    | Already inside Nuxt UI at v8. Installing v9 too would break it                            |
| `tailwindcss`            | Nuxt UI installs it                                                                       |
| `vee-validate` / FormKit | `UForm` + Zod already does form validation and field errors                               |
| `bcrypt` / `argon2`      | nuxt-auth-utils has password hashing built in                                             |
| `dinero.js` / `big.js`   | Whole-number cents already solves money                                                   |
| `date-fns` / `dayjs`     | `Intl.DateTimeFormat` is built into the browser                                           |
| `@prisma/nuxt`           | It is version 0.3.0 and only saves ~15 lines. Not worth an unfinished package             |
| `pg` / `@types/pg`       | `@prisma/adapter-pg` already installs them                                                |
| `nuxt-security`          | Rate limiting is ~20 lines of my own code if I have time                                  |
| `papaparse`              | Only needed for CSV, which is out of scope                                                |

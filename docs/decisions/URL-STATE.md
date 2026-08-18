# Search and filters live in the URL

**Why URL:**

- Refresh the page → filters still there.
- Send the link to a colleague → they see the same list.
- Press back → you get the previous filter, not the previous page.

```
/products?search=shirt&status=active&page=2&sort=price
```

A store loses all of this on refresh. The brief asks for both, and a URL gives both for free. Built as one composable, `useTableQuery`, with Zod checking the values. No library needed.

**Note:** `?status=` filters `status` only. Deletion is separate and unconditional — see [DATABASE-DESIGN.md](./DATABASE-DESIGN.md) §3.

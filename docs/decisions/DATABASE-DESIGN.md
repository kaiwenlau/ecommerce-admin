# Database Design

The brief asks about the first three directly. The fourth is a bonus item.

### 1. Money Handling: store cents, never decimals

**No money library installed.** Convert currency format to whole number. `$19.99` is stored as `1999` into cents, whole number.

**Why not store 19.99?**

- Computers cannot store `0.1` exactly.
- So `0.1 + 0.2` gives `0.30000000000000004`.
- Do for 200 orders and your revenue total is wrong.
- Whole numbers have no such problem. `1999 + 500` is always exactly `2499`.

**Data massaging:** Convert before the form is submitted to server. Format with `Intl.NumberFormat` (built-in) before display on client.

### 2. Price Changes: copy the price onto the order

When an order is placed, I **copy** the price and the product name onto the order line.

**Example of getting it wrong:**

```
Jan 1  – Customer buys a shirt for $10. Order says: shirt, $10
Feb 1  – I raise the shirt price to $15
Feb 2  – Open the January order...
```

If the order looked up the *current* price, January's order now says **$15**. The customer paid $10. The receipt is wrong, and last month's revenue just changed by itself.

So the order line stores its own copy:

```
OrderItem { productId, name: "Blue Shirt", unitPriceCents: 1000, qty: 1 }
```

An order is a record of what happened. It is not a live view of the product table.

I copy the **name** too, so a renamed or deleted product still shows correctly on an old receipt.

### 3. Archive and delete are two different things

A `Product` has two independent columns. Both make it vanish from the list, so they are easy to confuse.

- `status` — `draft` / `active` / `archived`. A lifecycle state.
- `deletedAt` — a nullable date. Soft delete.

**Archive means "I stopped selling this." Delete means "this record should not exist."**

|  | **Archive** | **Delete** |
|---|---|---|
| Column | `status = 'archived'` | `deletedAt = <date>` |
| Reversible | Yes, set the status back | No. No restore screen in this build |
| In the product list | Yes, under `?status=archived` | Never, under any filter |
| **SKU** | **Still reserved** | **Freed** — the partial index drops the row |
| Its own page | Opens normally | Opens, marked deleted, so old links do not 404 |
| Added to new orders | No | No |
| Endpoint | `PATCH /api/products/:id` | `DELETE /api/products/:id` |
| Bulk action | Yes — this **is** the bulk action | No |

**Why delete is a mark, not a removal:** a product might appear in 40 past orders. Erasing it either breaks those orders or destroys sales history with them.

**Why archive exists as well:** archiving is the everyday case — a seasonal line, a supplier change. It must be reversible and must keep the SKU, because the product still exists. With only `status` I could never free a SKU without destroying history. With only `deletedAt` there is no reversible "stop selling", and the bulk action becomes destructive.

The SKU row is the real difference. The partial index keys on `deletedAt` and knows nothing about `status`.

#### How the two filters compose

Every list query applies `deletedAt: null` **first and unconditionally**. Status is layered on top.

```ts
where: { deletedAt: null, ...(status && { status }) }
```

So a deleted product is invisible whatever `?status=` says, `All` included. No combination of URL parameters surfaces a deleted row in a list.

#### When the two columns contradict

Deleting does not touch `status`, so a deleted product keeps whatever status it had. A row can be `active` and deleted at once.

That is **meaningless rather than illegal**. No read path surfaces a deleted row, so its status is never consulted. I did not add a CHECK for it: stating the rule costs a sentence, enforcing an invariant nothing can observe costs a migration.

#### One guard, three callers

**A product on a `pending` or `paid` order can be neither archived nor deleted.** Those orders still have to be fulfilled, so the product stays orderable until they are.

The check lives in one function:

```
server/utils/productRemovable.ts
  checkRemovable(productId) → { ok: boolean, reason?: string }
```

| Caller | When |
|---|---|
| `PATCH /api/products/:id` | only on a move to `archived` |
| `DELETE /api/products/:id` | always |
| `POST /api/products/bulk` | per item — results collected, not thrown, so one blocked product does not stop the other nine |

**Why not only in the bulk endpoint:** it would be bypassable by editing one product on its own page. The UI is a convenience, not the rule.

Delete is the more destructive of the two, so it can never be the more permissive. Same guard, plus a softer warning: if the product appears on **finished** orders the confirm modal says how many, but does not block. That is history, not outstanding work.

### 4. Overselling: 3 layers

**Overselling is selling more than what's available.** Example: 1 shirt in stock, 2 people click Buy at same time, both orders go through. Stock goes to `-1`, an unwanted outcome.

**Why It happen**: B get the value before A finish the buying process. B read and decide to buy on a stale data.

**Counter measure:** 3 layers of checking.

| Layer                                     | What it does                                     | Catches                                                            |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| 1. The `updateMany` in the Prisma section | Check and update in one step, so there is no gap | Two people buying at the same moment                               |
| 2. `CHECK (stock >= 0)`                   | Database refuses negative stock                  | My own bugs, a bad migration, someone editing the database by hand |
| 3. `CHECK ("qty" > 0)` on `OrderItem`     | Database refuses a nonsense quantity             | A negative quantity, which slips past layers 1 and 2               |

**Why layer 3 exists.** Layers 1 and 2 both check the *result*. Layer 3 checks the *input*.

### 5. Cancelling an order: put the stock back

**Rule:** order once `shipped`, it cannot be cancelled. Can be cancelled from `pending` and `paid` only.

**Why the rule matters:** `cancelled` means *we never sent it*. The goods are still on the shelf, so cancelling **returns the stock**.

`OrderItem.qty` **is never made negative.** the order is a record of what was ordered. Cancelling then restock changes `Product.stock`, not the order.

**The concurrency catch:** cancelling does three things — set the status, write the audit event, and return the stock. If it can run twice, stock inflates. So the legality check goes in the `WHERE`, exactly like the oversell fix:

```ts
const { count } = await tx.order.updateMany({
  where: { id, status: { in: ['pending', 'paid'] } },
  data:  { status: 'cancelled' },
})
if (count === 0) throw new IllegalTransitionError(id)
```

**Note on the limit of "put it in the database":** a `CHECK` constraint cannot enforce this rule. It only sees the new row, not the move from the old one. Enforcing it in the database would need a trigger. The conditional `UPDATE` above is the pragmatic equivalent — atomic, but application-level.

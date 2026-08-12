-- ---------------------------------------------------------------------------
-- Hand-written. Prisma's schema language cannot express CHECK constraints,
-- same as the two rules in the init migration.
--
-- WHY: the init migration guards `Product.stock`, but nothing guarded the
-- values that change it.
-- ---------------------------------------------------------------------------

-- Rule 3: order item quantity can never go below 1 (0 is not a purchase)
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "orderitem_qty_positive" CHECK ("qty" > 0);

-- Rule 4: price can never go below zero
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "orderitem_unit_price_non_negative" CHECK ("unitPriceCents" >= 0);

-- Rule 5: price can never go below zero
ALTER TABLE "Product"
  ADD CONSTRAINT "product_price_non_negative" CHECK ("priceCents" >= 0);

-- Rule 6: total price can never go below zero
ALTER TABLE "Order"
  ADD CONSTRAINT "order_total_non_negative" CHECK ("totalCents" >= 0);

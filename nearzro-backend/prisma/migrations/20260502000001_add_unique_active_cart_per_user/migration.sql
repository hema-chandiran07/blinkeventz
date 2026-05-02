-- Drop index if it already exists (clean re-run safety)
DROP INDEX IF EXISTS "unique_active_cart_per_user";

-- Create partial unique index: enforce exactly one ACTIVE cart per user
CREATE UNIQUE INDEX "unique_active_cart_per_user"
ON "Cart" ("userId")
WHERE status = 'ACTIVE';

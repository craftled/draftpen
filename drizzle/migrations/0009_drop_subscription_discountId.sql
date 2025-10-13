-- Drop discountId column from subscription table (no longer needed, Polar handles discounts)
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "discountId";

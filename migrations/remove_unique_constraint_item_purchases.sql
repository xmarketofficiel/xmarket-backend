-- Remove unique constraint on buyerId and itemId to allow multiple interests from same buyer
-- This allows buyers to express interest multiple times and sellers to confirm each separately

-- Drop the unique constraint
ALTER TABLE item_purchases DROP CONSTRAINT IF EXISTS "UQ_item_purchases_buyerId_itemId";

-- Also check for any other constraint names that might exist
ALTER TABLE item_purchases DROP CONSTRAINT IF EXISTS "UQ_buyerId_itemId";
ALTER TABLE item_purchases DROP CONSTRAINT IF EXISTS "item_purchases_buyerId_itemId_key";

-- Verify the constraint is removed
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'item_purchases'::regclass 
AND contype = 'u';

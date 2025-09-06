-- Migration to add anonymous column to items table
-- This allows sellers to post items without revealing their identity

ALTER TABLE items ADD COLUMN anonymous BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN items.anonymous IS 'Whether the seller wants to remain anonymous for this item';

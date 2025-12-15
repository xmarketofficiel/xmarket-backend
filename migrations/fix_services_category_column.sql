-- Remove NOT NULL constraint from old 'category' column or drop it entirely
-- Since we're using service_category_id now, we'll make it nullable

ALTER TABLE services 
    ALTER COLUMN category DROP NOT NULL;

-- Optionally, you can drop the column entirely if it's not needed
-- Uncomment the line below if you want to remove it completely
-- ALTER TABLE services DROP COLUMN IF EXISTS category;

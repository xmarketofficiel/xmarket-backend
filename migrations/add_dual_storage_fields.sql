-- Migration: Add dual storage fields for DigitalOcean Spaces
-- Date: 2024-12-19

-- Add DigitalOcean Spaces storage fields to item_image table
ALTER TABLE item_image 
ADD COLUMN IF NOT EXISTS spaces_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS spaces_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'cloudinary',
ADD COLUMN IF NOT EXISTS backup_storage_provider VARCHAR(50);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_item_image_storage_provider ON item_image(storage_provider);
CREATE INDEX IF NOT EXISTS idx_item_image_spaces_key ON item_image(spaces_key);

-- Update existing records to mark them as Cloudinary-only
UPDATE item_image 
SET storage_provider = 'cloudinary' 
WHERE storage_provider IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN item_image.spaces_url IS 'DigitalOcean Spaces public URL for the image';
COMMENT ON COLUMN item_image.spaces_key IS 'DigitalOcean Spaces object key/path';
COMMENT ON COLUMN item_image.storage_provider IS 'Primary storage provider (cloudinary, spaces, or dual)';
COMMENT ON COLUMN item_image.backup_storage_provider IS 'Backup storage provider for redundancy';

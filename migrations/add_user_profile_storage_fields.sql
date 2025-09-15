-- Add DigitalOcean Spaces URL storage fields for user profile images
-- Run this migration to support dual storage for profile pictures

ALTER TABLE users 
ADD COLUMN profile_image_spaces_url VARCHAR(512),
ADD COLUMN profile_image_spaces_key VARCHAR(256), 
ADD COLUMN profile_image_variants JSONB;

-- Add comments to describe the columns
COMMENT ON COLUMN users.profile_image_spaces_url IS 'DigitalOcean Spaces URL for profile image';
COMMENT ON COLUMN users.profile_image_spaces_key IS 'DigitalOcean Spaces key/path for profile image';
COMMENT ON COLUMN users.profile_image_variants IS 'JSON object containing variant URLs (thumbnail, small, medium, large)';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_profile_image_spaces_url ON users(profile_image_spaces_url);
CREATE INDEX IF NOT EXISTS idx_users_profile_image_spaces_key ON users(profile_image_spaces_key);

-- Show the updated table structure
\d users;

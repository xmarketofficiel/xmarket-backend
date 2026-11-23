-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255),
    background_image TEXT,
    type VARCHAR(50) DEFAULT 'both' CHECK (type IN ('time-based', 'ongoing', 'both')),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX idx_service_categories_slug ON service_categories(slug);
CREATE INDEX idx_service_categories_is_active ON service_categories(is_active);
CREATE INDEX idx_service_categories_display_order ON service_categories(display_order);

-- Backup existing services table (optional but recommended)
-- CREATE TABLE services_backup AS SELECT * FROM services;

-- Alter services table to add new columns
ALTER TABLE services 
    ADD COLUMN IF NOT EXISTS service_category_id UUID,
    ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ongoing' CHECK (type IN ('time-based', 'ongoing')),
    ADD COLUMN IF NOT EXISTS availability VARCHAR(50) DEFAULT 'instant' CHECK (availability IN ('instant', 'scheduled')),
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
    ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP,
    ADD COLUMN IF NOT EXISTS distance VARCHAR(100),
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Rename price to price_from if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'price'
    ) THEN
        ALTER TABLE services RENAME COLUMN price TO price_from;
    END IF;
END $$;

-- Add price_to column
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_to DECIMAL(10, 2);

-- Rename totalRatings to total_reviews if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'totalRatings'
    ) THEN
        ALTER TABLE services RENAME COLUMN "totalRatings" TO total_reviews;
    END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE services 
    ADD CONSTRAINT fk_service_category 
    FOREIGN KEY (service_category_id) 
    REFERENCES service_categories(id) 
    ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_service_category_id ON services(service_category_id);
CREATE INDEX IF NOT EXISTS idx_services_departure_time ON services(departure_time);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(featured);

-- Insert default service categories with background images
INSERT INTO service_categories (name, slug, description, icon, background_image, type, display_order) VALUES
    ('Transportation', 'transportation', 'Carpooling, rides, and travel services', '🚗', 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&h=400&fit=crop', 'time-based', 1),
    ('Delivery', 'delivery', 'Package delivery and courier services', '📦', 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=400&fit=crop', 'time-based', 2),
    ('Moving Help', 'moving', 'Moving assistance and relocation services', '🚚', 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop', 'time-based', 3),
    ('Cleaning', 'cleaning', 'Professional cleaning services', '🧹', 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&h=400&fit=crop', 'ongoing', 4),
    ('Laundry', 'laundry', 'Laundry and dry cleaning services', '👔', 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&h=400&fit=crop', 'ongoing', 5),
    ('Repair', 'repair', 'Home repair and maintenance services', '🔧', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=400&fit=crop', 'ongoing', 6),
    ('Tutoring', 'tutoring', 'Academic tutoring and education services', '📖', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&h=400&fit=crop', 'ongoing', 7),
    ('Pharmacy', 'pharmacy', 'Pharmacy delivery and medical supplies', '💊', 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop', 'ongoing', 8)
ON CONFLICT (slug) DO NOTHING;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for service_categories
DROP TRIGGER IF EXISTS update_service_categories_updated_at ON service_categories;
CREATE TRIGGER update_service_categories_updated_at
    BEFORE UPDATE ON service_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

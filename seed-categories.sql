-- Insert comprehensive categories for XMarket with modern icons
DELETE FROM categories;

INSERT INTO categories (id, name, icon, description, "isActive", "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'Electronics', '📱', 'Phones, laptops, headphones, gaming gear, and electronic devices', true, NOW(), NOW()),
(gen_random_uuid(), 'Books & Education', '📚', 'Textbooks, novels, academic materials, study guides, and educational resources', true, NOW(), NOW()),
(gen_random_uuid(), 'Clothing & Fashion', '👕', 'Shirts, pants, shoes, accessories, jewelry, and fashion items', true, NOW(), NOW()),
(gen_random_uuid(), 'Furniture & Decor', '🪑', 'Chairs, tables, beds, storage solutions, and room decorations', true, NOW(), NOW()),
(gen_random_uuid(), 'Sports & Fitness', '⚽', 'Sports equipment, fitness gear, outdoor activities, and athletic wear', true, NOW(), NOW()),
(gen_random_uuid(), 'Vehicles & Transport', '🚗', 'Cars, bikes, motorcycles, scooters, and transportation accessories', true, NOW(), NOW()),
(gen_random_uuid(), 'Home & Kitchen', '🏡', 'Kitchen appliances, household items, cleaning supplies, and home essentials', true, NOW(), NOW()),
(gen_random_uuid(), 'Art & Music', '🎨', 'Musical instruments, art supplies, creative materials, and artistic tools', true, NOW(), NOW()),
(gen_random_uuid(), 'Lab & Research', '🔬', 'Scientific instruments, laboratory equipment, and research materials', true, NOW(), NOW()),
(gen_random_uuid(), 'Beauty & Personal Care', '�', 'Cosmetics, skincare, personal hygiene, and beauty products', true, NOW(), NOW()),
(gen_random_uuid(), 'Gaming & Entertainment', '🎮', 'Video games, consoles, board games, and entertainment products', true, NOW(), NOW()),
(gen_random_uuid(), 'Office & Stationery', '📝', 'Office supplies, stationery, desk accessories, and work materials', true, NOW(), NOW()),
(gen_random_uuid(), 'Health & Wellness', '🏥', 'Health supplements, medical supplies, wellness products, and fitness accessories', true, NOW(), NOW()),
(gen_random_uuid(), 'Crafts & Hobbies', '✂️', 'Craft supplies, hobby materials, DIY tools, and creative projects', true, NOW(), NOW()),
(gen_random_uuid(), 'Other', '📦', 'Items that don\'t fit in other categories', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

# Service Categories Guide

## Overview
Service categories are **100% code-driven**. No database migrations needed!

## How It Works

### Categories are defined in code
**File:** `src/services/config/service-categories.config.ts`

All category data (name, icon, images, type) lives here:
```typescript
export const SERVICE_CATEGORIES = [
  {
    name: 'Covoiturage',
    icon: '🚗',
    backgroundImage: '/images/categories/covoiturage.jpg',
    type: 'time-based',
    displayOrder: 1,
  },
  // ... more categories
];
```

### Database role
The database only stores:
- `slug` (auto-generated from name)
- `isActive` (true/false flag for admin panel)
- Basic metadata (timestamps)

**No migrations needed!** Category references are auto-created when:
1. A service is created using that category
2. Categories are fetched for the first time

### Images location
Store category images in:
```
/xmarket-backend/public/images/categories/
  ├── covoiturage.jpg
  ├── laundry.jpg
  ├── taxi.jpg
  └── your-new-category.jpg
```

## Adding a New Category

### Step 1: Add the image
```bash
# Save your image to:
/xmarket-backend/public/images/categories/your-category-name.jpg
```

### Step 2: Update config file
Edit `src/services/config/service-categories.config.ts`:

```typescript
export const SERVICE_CATEGORIES = [
  // ... existing categories
  {
    name: 'Your Category Name',
    icon: '🎯',  // Pick an emoji
    backgroundImage: '/images/categories/your-category-name.jpg',
    type: 'ongoing', // or 'time-based' or 'both'
    displayOrder: 4,
  },
];
```

### Step 3: Restart backend
```bash
npm run start:dev
```

**That's it!** No migrations, no database changes needed.

## How Auto-Sync Works

When someone creates a service:
1. Backend checks if category exists in config ✅
2. Backend checks if category exists in DB
3. If not in DB → auto-creates the reference
4. Service is created with proper category ID

When frontend fetches categories:
1. Backend reads from config file ✅
2. Merges with DB metadata (isActive flag)
3. Returns categories to frontend

## Frontend Integration

Categories are automatically available via the API:
```
GET /service-categories
```

Returns:
```json
[
  {
    "id": "uuid-or-slug",
    "name": "Covoiturage",
    "slug": "covoiturage",
    "icon": "🚗",
    "backgroundImage": "/images/categories/covoiturage.jpg",
    "type": "time-based",
    "displayOrder": 1,
    "isActive": true
  }
]
```

## Admin Panel Future

When you build the admin panel, admins can:
- ✅ Enable/Disable categories (updates `isActive` in DB)
- ✅ Reorder categories (updates `displayOrder`)
- ❌ Cannot add new categories (requires code change by developer)

This keeps categories controlled and consistent.

## Benefits

✅ No migrations to run  
✅ Easy to add categories (just edit code + add image)  
✅ Auto-syncs on first use  
✅ Images served from backend  
✅ Slugs auto-generated from names  
✅ Single source of truth in code  

## Example: Adding "House Cleaning" Category

1. Download image → save as `house-cleaning.jpg`
2. Edit config:
```typescript
{
  name: 'House Cleaning',
  icon: '🧹',
  backgroundImage: '/images/categories/house-cleaning.jpg',
  type: 'ongoing',
  displayOrder: 4,
}
```
3. Restart backend
4. Done! Users can now select "House Cleaning" when creating services.

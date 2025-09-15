# Dual Storage API Documentation

## Overview

The dual storage system provides redundant image storage using both **Cloudinary** (primary) and **DigitalOcean Spaces** (backup). This ensures high availability and eliminates single points of failure.

### Architecture

```
Client Upload → Presigned URLs → Direct Upload to Both Services
                                ↓
                            Database Stores Both URLs
                                ↓
                        Intelligent Fallback on Display
```

## API Endpoints

### 1. Generate Upload URLs (Single Image)

**POST** `/uploads/generate-upload-urls`

Generates presigned URLs for uploading to both Cloudinary and DigitalOcean Spaces.

#### Request Body
```json
{
  "filename": "my-image.jpg",
  "contentType": "image/jpeg",
  "itemId": 123
}
```

#### Response
```json
{
  "success": true,
  "uploadUrls": {
    "cloudinary": {
      "uploadUrl": "https://api.cloudinary.com/v1_1/your-cloud/image/upload",
      "publicId": "items/123/uuid-filename",
      "signature": "generated-signature",
      "timestamp": 1640995200,
      "apiKey": "your-api-key"
    },
    "spaces": {
      "uploadUrl": "https://xmarket-app-dev.nyc3.digitaloceanspaces.com/items/123/uuid-filename.jpg?X-Amz-Algorithm=...",
      "publicUrl": "https://xmarket-app-dev.nyc3.digitaloceanspaces.com/items/123/uuid-filename.jpg",
      "key": "items/123/uuid-filename.jpg"
    }
  },
  "metadata": {
    "filename": "my-image.jpg",
    "contentType": "image/jpeg",
    "itemId": 123
  }
}
```

### 2. Generate Batch Upload URLs

**POST** `/uploads/generate-batch-upload-urls`

Generates presigned URLs for multiple images at once.

#### Request Body
```json
{
  "files": [
    {
      "filename": "image1.jpg",
      "contentType": "image/jpeg"
    },
    {
      "filename": "image2.png",
      "contentType": "image/png"
    }
  ],
  "itemId": 123
}
```

#### Response
```json
{
  "success": true,
  "uploadUrls": [
    {
      "cloudinary": { /* ... */ },
      "spaces": { /* ... */ },
      "metadata": { /* ... */ }
    },
    // ... more upload URL sets
  ]
}
```

### 3. Get Best Image URL

**GET** `/uploads/best-image-url/:imageId`

Returns the best available URL for an image (Cloudinary first, Spaces as fallback).

#### Response
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1640995200/items/123/uuid-filename.jpg",
  "provider": "cloudinary",
  "hasBackup": true
}
```

### 4. Get DigitalOcean Spaces Status

**GET** `/uploads/spaces-status`

Returns the current status of DigitalOcean Spaces connection.

#### Response
```json
{
  "success": true,
  "status": "connected",
  "bucket": "xmarket-app-dev",
  "region": "nyc3",
  "cdnConfigured": false
}
```

## Client-Side Upload Process

### 1. Request Upload URLs

```javascript
const response = await fetch('/api/uploads/generate-upload-urls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    filename: file.name,
    contentType: file.type,
    itemId: 123
  })
});

const { uploadUrls } = await response.json();
```

### 2. Upload to Both Services

```javascript
// Upload to Cloudinary
const cloudinaryFormData = new FormData();
cloudinaryFormData.append('file', file);
cloudinaryFormData.append('public_id', uploadUrls.cloudinary.publicId);
cloudinaryFormData.append('signature', uploadUrls.cloudinary.signature);
cloudinaryFormData.append('timestamp', uploadUrls.cloudinary.timestamp);
cloudinaryFormData.append('api_key', uploadUrls.cloudinary.apiKey);

const cloudinaryUpload = fetch(uploadUrls.cloudinary.uploadUrl, {
  method: 'POST',
  body: cloudinaryFormData
});

// Upload to DigitalOcean Spaces
const spacesUpload = fetch(uploadUrls.spaces.uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type
  },
  body: file
});

// Wait for both uploads
const [cloudinaryResult, spacesResult] = await Promise.allSettled([
  cloudinaryUpload,
  spacesUpload
]);
```

### 3. Save URLs to Database

```javascript
// After successful uploads, save the URLs to your item
const saveResponse = await fetch(`/api/items/${itemId}/images`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    cloudinaryUrl: cloudinaryResult.secure_url,
    spacesUrl: uploadUrls.spaces.publicUrl,
    cloudinaryPublicId: uploadUrls.cloudinary.publicId,
    spacesKey: uploadUrls.spaces.key
  })
});
```

## Environment Variables

### Required for DigitalOcean Spaces

```env
DO_SPACES_KEY=your-spaces-access-key
DO_SPACES_SECRET=your-spaces-secret-key
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_REGION=nyc3
DO_SPACES_CDN_DOMAIN=your-cdn-domain.com  # Optional
```

### Required for Cloudinary

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Invalid file type. Only images are allowed.",
  "code": "INVALID_FILE_TYPE"
}
```

### Error Codes

- `INVALID_FILE_TYPE`: File is not an image
- `FILE_TOO_LARGE`: File exceeds size limit
- `MISSING_CREDENTIALS`: Storage credentials not configured
- `UPLOAD_FAILED`: Upload to storage service failed
- `UNAUTHORIZED`: User not authenticated

## Best Practices

### 1. Upload Strategy

- Always upload to both services simultaneously
- Don't wait for one to complete before starting the other
- Handle partial failures gracefully

### 2. Display Strategy

- Use Cloudinary URLs for display (faster CDN)
- Fallback to Spaces URLs if Cloudinary fails
- Cache the "best URL" decision for performance

### 3. Error Recovery

- If Cloudinary upload fails, still save Spaces URL
- If Spaces upload fails, still save Cloudinary URL
- Implement background sync for failed uploads

### 4. Frontend Integration

```javascript
// Utility function for getting image URL with fallback
async function getImageUrl(imageId) {
  try {
    const response = await fetch(`/api/uploads/best-image-url/${imageId}`);
    const { imageUrl } = await response.json();
    return imageUrl;
  } catch (error) {
    console.error('Failed to get image URL:', error);
    return '/placeholder-image.jpg'; // Local fallback
  }
}
```

## Database Schema

### ItemImage Entity

```sql
CREATE TABLE item_image (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  cloudinary_url VARCHAR(500),           -- Cloudinary URL (legacy + new)
  cloudinary_public_id VARCHAR(255),     -- Cloudinary public ID
  spaces_url VARCHAR(500),               -- DigitalOcean Spaces URL
  spaces_key VARCHAR(255),               -- Spaces object key
  storage_provider VARCHAR(50) DEFAULT 'cloudinary',  -- Primary provider
  backup_storage_provider VARCHAR(50),    -- Backup provider
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

Run the test suite to verify dual storage configuration:

```bash
# From backend directory
npm run test:dual-storage
# or
npx ts-node scripts/test-dual-storage.ts
```

This will test:
- ✅ Service initialization
- ✅ Environment configuration
- ✅ Presigned URL generation
- ✅ Batch upload URLs
- ✅ File validation
- ✅ Error handling

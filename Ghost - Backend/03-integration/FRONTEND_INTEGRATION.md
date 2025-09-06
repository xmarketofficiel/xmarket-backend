# Frontend Integration Guide

> **📋 Quick Access**: [API Endpoints](./API_ENDPOINTS.md) | [Authentication Flow](./AUTHENTICATION_FLOW.md) | [CORS Configuration](./CORS_CONFIGURATION.md)

## 🎯 Integration Overview

This guide provides everything the frontend team needs to integrate with the CampusSuperApp backend API. The backend is ready for integration with all core endpoints implemented and tested.

---

## 🚀 **Quick Start Integration**

### Backend Setup for Frontend Developers
```bash
# 1. Start PostgreSQL database
docker-compose -f docker-compose-postgresQL.yml up -d

# 2. Install and start backend
npm install
npm run start:dev

# 3. Verify backend is running
curl http://localhost:3001/api/health
```

### API Base Configuration
```typescript
// Frontend API client configuration
const apiConfig = {
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  withCredentials: true, // IMPORTANT: For cookie-based auth
  headers: {
    'Content-Type': 'application/json'
  }
}
```

---

## 🔗 **Core Integration Points**

### 1. Authentication System ✅ READY
```typescript
// Registration Flow (3 steps)
POST /auth/send-otp           // Send OTP to email
POST /auth/verify-otp         // Verify OTP code  
POST /auth/complete-registration // Complete registration

// Login/Logout
POST /auth/login             // Login with email/password
POST /auth/logout            // Logout (clear cookies)
POST /auth/refresh           // Refresh access token

// Password Reset
POST /auth/forgot-password   // Request password reset OTP
POST /auth/reset-password    // Reset password with OTP
```

### 2. Items Marketplace ✅ READY
```typescript
// Item CRUD Operations
GET    /items                // List items (with search/pagination)
GET    /items/:id            // Get single item details
POST   /items                // Create new item
PATCH  /items/:id            // Update item
DELETE /items/:id            // Delete item

// Item Categories & Images
GET    /items/categories     // Get all categories
POST   /items/:id/images     // Upload item images
DELETE /images/:imageId      // Delete specific image
```

### 3. User Management ✅ READY
```typescript
// User Profile
GET    /users/profile        // Get current user profile
PATCH  /users/profile        // Update user profile
POST   /users/upload-avatar  // Upload profile avatar

// User Data
GET    /users/:id/items      // Get user's items
GET    /users/:id/interests  // Get user's interests
POST   /interests            // Add user interest
DELETE /interests/:id        // Remove user interest
```

### 4. Services Marketplace ✅ READY
```typescript
// Services CRUD
GET    /services             // List services
GET    /services/:id         // Get service details
POST   /services             // Create service
PATCH  /services/:id         // Update service
DELETE /services/:id         // Delete service

// Service Ratings
GET    /services/:id/ratings // Get service ratings
POST   /services/:id/ratings // Add service rating
```

---

## 🔐 **Authentication Integration**

### Cookie-Based JWT Authentication
The backend uses HTTP-only cookies for security. No need to manage tokens in localStorage.

```typescript
// Frontend HTTP client setup (Axios example)
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true, // CRITICAL: Include cookies
  timeout: 10000
})

// Login example
const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    })
    // JWT cookie is automatically set by backend
    return response.data
  } catch (error) {
    throw error.response.data
  }
}

// Authenticated requests work automatically
const getUserProfile = async () => {
  // Cookie is automatically included
  const response = await apiClient.get('/users/profile')
  return response.data
}
```

### Authentication State Management
```typescript
// Check authentication status
const checkAuth = async () => {
  try {
    const response = await apiClient.get('/users/profile')
    return { authenticated: true, user: response.data }
  } catch (error) {
    return { authenticated: false, user: null }
  }
}

// Logout
const logout = async () => {
  await apiClient.post('/auth/logout')
  // Cookie is automatically cleared by backend
}
```

---

## 📤 **File Upload Integration**

### Image Upload for Items
```typescript
const uploadItemImages = async (itemId: string, files: File[]) => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })

  const response = await apiClient.post(
    `/items/${itemId}/images`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )
  return response.data
}
```

### Avatar Upload
```typescript
const uploadAvatar = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post(
    '/users/upload-avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  )
  return response.data
}
```

---

## 🔍 **Error Handling Integration**

### Standardized Error Response Format
```typescript
interface APIError {
  success: false
  message: string
  errors?: ValidationError[]
  statusCode: number
  timestamp: string
}

// Frontend error handling
const handleAPIError = (error: any) => {
  if (error.response?.data) {
    const apiError: APIError = error.response.data
    
    // Handle validation errors
    if (apiError.errors) {
      apiError.errors.forEach(err => {
        console.log(`${err.field}: ${err.message}`)
      })
    }
    
    // Handle general errors
    console.log(`Error: ${apiError.message}`)
    
    // Handle authentication errors
    if (error.response.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
  }
}
```

### Common HTTP Status Codes
```typescript
// Expected status codes from backend
const statusCodes = {
  200: 'Success',
  201: 'Created',
  400: 'Bad Request (validation errors)',
  401: 'Unauthorized (login required)',
  403: 'Forbidden (insufficient permissions)',
  404: 'Not Found',
  409: 'Conflict (duplicate data)',
  429: 'Too Many Requests (rate limited)',
  500: 'Internal Server Error'
}
```

---

## 📊 **Data Models & Interfaces**

### User Interface
```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
}
```

### Item Interface
```typescript
interface Item {
  id: string
  title: string
  description: string
  price: number
  categoryId: string
  category?: Category
  userId: string
  user?: User
  images: ItemImage[]
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

interface ItemImage {
  id: string
  url: string
  itemId: string
}

interface Category {
  id: string
  name: string
  description?: string
}
```

### Service Interface
```typescript
interface Service {
  id: string
  title: string
  description: string
  type: 'tutoring' | 'cleaning' | 'delivery' | 'other'
  price: number
  userId: string
  user?: User
  ratings: ServiceRating[]
  averageRating: number
  totalRatings: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

interface ServiceRating {
  id: string
  rating: number // 1-5
  comment?: string
  serviceId: string
  userId: string
  user?: User
  createdAt: string
}
```

---

## 🔧 **Request/Response Examples**

### Create Item Example
```typescript
// Request
const createItem = async (itemData: {
  title: string
  description: string
  price: number
  categoryId: string
}) => {
  const response = await apiClient.post('/items', itemData)
  return response.data
}

// Expected Response
{
  success: true,
  data: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "MacBook Pro 2021",
    description: "Excellent condition laptop",
    price: 1200,
    categoryId: "electronics-123",
    userId: "user-456",
    images: [],
    isAvailable: true,
    createdAt: "2025-08-26T10:00:00.000Z",
    updatedAt: "2025-08-26T10:00:00.000Z"
  },
  message: "Item created successfully"
}
```

### Search Items Example
```typescript
// Search with filters
const searchItems = async (params: {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}) => {
  const response = await apiClient.get('/items', { params })
  return response.data
}

// Expected Response
{
  success: true,
  data: {
    items: [...], // Array of items
    pagination: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3
    }
  }
}
```

---

## ⚠️ **Important Integration Notes**

### 1. CORS Configuration ✅
- Backend CORS is configured for `http://localhost:3000`
- Credentials are allowed for cookie-based auth
- Update CORS settings for production domain

### 2. Cookie Settings ✅
- JWT tokens are stored in HTTP-only cookies
- Cookies are secure and SameSite protected
- No need for localStorage token management

### 3. File Upload Limits ✅
- Maximum file size: 10MB per file
- Supported image types: JPG, PNG, GIF, WebP
- Maximum files per upload: 5 files

### 4. Rate Limiting ⚠️
- Currently no rate limiting (coming in v1.1.0)
- Plan for 100 requests per minute per IP

### 5. Validation ✅
- All endpoints have input validation
- Validation errors returned in structured format
- Required fields clearly documented

---

## 🧪 **Testing Integration**

### Backend Health Check
```bash
# Verify backend is running
curl http://localhost:3001/api/health

# Expected response
{
  "success": true,
  "message": "API is healthy",
  "timestamp": "2025-08-26T10:00:00.000Z"
}
```

### API Documentation
- **Swagger UI**: http://localhost:3001/api
- **Complete endpoint documentation with examples**
- **Try out endpoints directly in browser**

---

## 📞 **Integration Support**

### Getting Help
1. **API Documentation**: http://localhost:3001/api (Swagger)
2. **Backend Issues**: Check [../STATUS.md](../STATUS.md)
3. **Authentication Problems**: See [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)
4. **CORS Issues**: Check [CORS_CONFIGURATION.md](./CORS_CONFIGURATION.md)

### Common Integration Issues
- **Credentials not included**: Ensure `withCredentials: true`
- **CORS errors**: Check origin configuration
- **401 errors**: Verify authentication cookie is sent
- **File upload fails**: Check Content-Type header
- **Validation errors**: Check required fields and formats

---

*This integration guide covers 90% of common frontend-backend integration scenarios. For specific questions, refer to the detailed API documentation at http://localhost:3001/api*

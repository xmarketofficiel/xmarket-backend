# XMarket Admin API Documentation

## Overview

The XMarket Admin API provides comprehensive administrative functionality for managing users, items, reports, and platform analytics. This API is designed with role-based access control ensuring only authorized administrators can access sensitive operations.

## Authentication

All admin endpoints require authentication with an admin or super admin role. Use the `/auth/admin/login` endpoint to authenticate.

### Admin Login
```bash
POST /auth/admin/login
{
  "email": "admin@xmarket.com",
  "password": "your-password"
}
```

### Response
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": 1,
    "email": "admin@xmarket.com",
    "fullName": "Super Admin",
    "role": "super_admin",
    "isVerified": true,
    "profileImageUrl": null
  }
}
```

## API Endpoints

### Dashboard Analytics

#### Get Dashboard Statistics
```bash
GET /admin/dashboard/stats
Authorization: Bearer {admin-jwt-token}
```

Returns comprehensive platform statistics including user counts, item counts, reports, and recent activity.

### User Management

#### Get All Users
```bash
GET /admin/users?page=1&limit=10&search=john&role=user&status=active
Authorization: Bearer {admin-jwt-token}
```

#### Get User Details
```bash
GET /admin/users/{userId}
Authorization: Bearer {admin-jwt-token}
```

#### Update User Status
```bash
PUT /admin/users/{userId}/status
Authorization: Bearer {admin-jwt-token}
{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

#### Delete User
```bash
DELETE /admin/users/{userId}
Authorization: Bearer {admin-jwt-token}
```

#### Bulk User Actions
```bash
POST /admin/users/bulk-action
Authorization: Bearer {admin-jwt-token}
{
  "userIds": [1, 2, 3],
  "action": "suspend",
  "reason": "Spam activity"
}
```

#### Create New Admin (Super Admin Only)
```bash
POST /admin/admins
Authorization: Bearer {super-admin-jwt-token}
{
  "fullName": "New Admin",
  "email": "newadmin@xmarket.com",
  "whatsappNumber": "+1234567890",
  "password": "secure-password",
  "role": "admin"
}
```

### Item Management

#### Get All Items
```bash
GET /admin/items?page=1&limit=10&search=laptop
Authorization: Bearer {admin-jwt-token}
```

#### Delete Item
```bash
DELETE /admin/items/{itemId}
Authorization: Bearer {admin-jwt-token}
```

### Reports Management

#### Get All Reports
```bash
GET /admin/reports?page=1&limit=10
Authorization: Bearer {admin-jwt-token}
```

Returns both user reports and item reports with comprehensive details.

### Current Admin Profile

#### Get Current Admin Details
```bash
GET /admin/me
Authorization: Bearer {admin-jwt-token}
```

## User Roles

- **user**: Regular platform user
- **admin**: Administrator with access to most admin functions
- **super_admin**: Super administrator with access to all functions including admin management

## User Status

- **active**: User can use the platform normally
- **suspended**: User is temporarily restricted
- **banned**: User is permanently restricted

## Setup Instructions

### 1. Database Migration
Run the migration script to add admin fields to the users table:
```sql
-- Execute migrations/add_admin_fields.sql
```

### 2. Create Initial Super Admin
```bash
npm run create:admin
```

This creates a super admin with:
- Email: `admin@xmarket.com`
- Password: `admin123`

**⚠️ Important: Change this password immediately after first login!**

### 3. Environment Variables
Ensure these variables are set in your `.env` file:
```env
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

## Security Features

1. **Role-Based Access Control**: Different permission levels for admin and super admin
2. **JWT Authentication**: Secure token-based authentication
3. **Input Validation**: Comprehensive validation on all endpoints
4. **Rate Limiting**: Built-in throttling to prevent abuse
5. **Audit Trail**: Track admin actions and user modifications

## Error Handling

The API returns standardized error responses:

```json
{
  "statusCode": 403,
  "message": "Access denied: Admin privileges required",
  "error": "Forbidden"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resources)
- `500`: Internal Server Error

## Rate Limits

- **General API**: 100 requests per minute
- **Admin Login**: 5 attempts per minute
- **Bulk Operations**: 10 requests per minute

## Best Practices

1. **Authentication**: Always use HTTPS in production
2. **Token Management**: Implement proper token refresh logic
3. **Logging**: Monitor admin actions for security auditing
4. **Backup**: Regular database backups before bulk operations
5. **Testing**: Test admin functions in staging before production use

## Frontend Integration

The admin dashboard frontend is available at `http://localhost:3002` and automatically integrates with these API endpoints. The frontend includes:

- Real-time dashboard with statistics
- User management with search and filtering
- Item moderation tools
- Report management system
- Responsive design for desktop and mobile
- JWT-based authentication flow

## Support

For technical support or questions about the Admin API, contact the development team or refer to the main project documentation.

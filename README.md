# University Marketplace Backend

A comprehensive NestJS backend API for a university marketplace application that enables students to buy and sell items within their university community.

## Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens stored in HTTP-only cookies
- OTP-based email verification for registration
- Password hashing with bcrypt
- Rate limiting and throttling
- Input validation and sanitization
- CORS configuration
- Global JWT guard with public endpoint exceptions

### 👥 User Management
- Multi-step registration with email OTP verification
- User login with cookie-based token storage
- Profile management with avatar upload
- Password reset functionality with OTP
- User verification system

### 📦 Item Management
- Create, read, update, delete items
- Multiple image uploads (up to 6 images per item)
- Category-based organization
- Advanced search and filtering
- Pagination support
- View tracking

### 💬 Interest System
- Show interest in items
- Interest notifications
- Bulk interest management
- WhatsApp integration ready

### 🖼️ File Upload
- Secure image upload with validation
- File size and type restrictions
- Image optimization support
- Static file serving

### 📧 Email System
- OTP email delivery for registration and password reset
- Welcome emails for new users
- SMTP configuration with nodemailer

## Database Configuration

The application uses PostgreSQL with TypeORM. Update your `.env` file with your database credentials:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=university_marketplace
```

## API Endpoints

### Authentication (Public)
- `POST /auth/send-otp` - Send OTP to email for registration
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/complete-registration` - Complete registration after OTP verification
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request password reset OTP
- `POST /auth/reset-password` - Reset password with OTP
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user

### Users (Protected)
- `GET /users/profile` - Get user profile
- `PATCH /users/profile` - Update profile
- `POST /users/upload-avatar` - Upload avatar

### Items (Mixed)
- `GET /items` - Get all items (Public)
- `GET /items/:id` - Get item details (Public)
- `GET /items/categories` - Get categories (Public)
- `POST /items` - Create new item (Protected)
- `PATCH /items/:id` - Update item (Protected)
- `DELETE /items/:id` - Delete item (Protected)
- `POST /items/:id/images` - Upload images (Protected)
- `DELETE /items/images/:imageId` - Delete image (Protected)

### Interests (Protected)
- `POST /interests` - Show interest
- `DELETE /interests/:id` - Remove interest
- `GET /interests/item/:itemId` - Get item interests
- `GET /interests/user/:userId` - Get user interests

### Uploads (Protected)
- `POST /uploads/single` - Upload single file
- `POST /uploads/multiple` - Upload multiple files

## Registration Flow

1. **Send OTP**: User enters email, system sends 6-digit OTP
2. **Verify OTP**: User enters OTP to verify email
3. **Complete Registration**: User provides full name, WhatsApp number, and password
4. **Welcome Email**: System sends welcome email and logs user in

## Security Features

- JWT tokens stored in HTTP-only cookies
- Global authentication guard with public endpoint exceptions
- Input validation using class-validator
- SQL injection prevention with TypeORM
- XSS protection
- Rate limiting (100 requests per minute)
- File upload security
- Password strength requirements
- OTP expiration (5 minutes)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database and update `.env` file

3. Start the development server:
```bash
npm run start:dev
```

## Environment Variables

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=university_marketplace

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3001
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@university-marketplace.com

# OTP
OTP_EXPIRES_IN=300000

# Upload settings
MAX_FILE_SIZE=5242880
MAX_FILES_PER_ITEM=6
```

## API Documentation

Once the server is running, visit `http://localhost:3001/api` to access the Swagger documentation.

## Testing

Run tests:
```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start in production mode:
```bash
npm run start:prod
```

## License

This project is licensed under the MIT License.
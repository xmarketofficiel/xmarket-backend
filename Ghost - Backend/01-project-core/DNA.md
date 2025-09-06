# Backend Architecture (DNA)

## 🧬 Project DNA
**CampusSuperApp Backend** - NestJS-powered marketplace API for UM6P students

### Core Philosophy
- **API-First**: Design APIs before implementation
- **Type-Safe**: Full TypeScript coverage with strict typing
- **Secure by Default**: Security built into every layer
- **Performance-Focused**: Optimized queries and caching
- **Scalable Architecture**: Modular design for growth

## 🏗️ Architecture Overview

### Framework & Build
- **NestJS 10.0.0** - Progressive Node.js framework
- **TypeScript 5.1.3** - Type safety and developer experience
- **PostgreSQL 14+** - Relational database with ACID compliance
- **TypeORM 0.3.17** - Object-Relational Mapping
- **Class-validator** - Input validation and sanitization

### Database Strategy
```typescript
// Database: PostgreSQL with TypeORM
// Connection: Connection pooling for performance
// Migrations: Automatic schema versioning
// Relationships: Proper foreign keys and constraints
// Indexing: Strategic indexing for query performance
```

### Module Architecture
```
src/
├── app.module.ts              # Root application module
├── main.ts                   # Application bootstrap
├── auth/                     # Authentication & authorization
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── guards/              # JWT guards and strategies
│   └── dto/                 # Data transfer objects
├── users/                    # User management
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── entities/
├── items/                    # Marketplace items
│   ├── items.module.ts
│   ├── items.service.ts
│   ├── items.controller.ts
│   └── entities/
├── services/                 # Service marketplace
│   ├── services.module.ts
│   ├── services.service.ts
│   ├── services.controller.ts
│   └── entities/
├── uploads/                  # File upload management
├── email/                    # Email service
├── otp/                      # OTP verification
├── interests/                # User interests
└── common/                   # Shared utilities
    ├── decorators/
    ├── filters/
    ├── guards/
    ├── interceptors/
    └── pipes/
```

### Authentication Architecture
```typescript
// JWT Strategy: HTTP-only cookies for security
// OTP Verification: Email-based user verification
// Password Security: bcrypt with salt rounds
// Session Management: JWT refresh token rotation
// Authorization: Role-based access control (RBAC)

interface AuthFlow {
  registration: 'email → OTP → verify → complete'
  login: 'email/password → JWT → cookie'
  refresh: 'refresh token → new JWT'
  logout: 'clear cookies → invalidate tokens'
}
```

### API Design Patterns
```typescript
// REST API: RESTful endpoints with proper HTTP verbs
// Response Format: Consistent JSON response structure
// Error Handling: Global exception filters
// Validation: Class-validator decorators
// Documentation: Swagger/OpenAPI integration

interface APIResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: ValidationError[]
  timestamp: string
}
```

## 🗄️ Database Design

### Core Entities
```typescript
// Users: Authentication and profile data
interface User {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  avatar?: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// Items: Marketplace items
interface Item {
  id: string
  title: string
  description: string
  price: number
  categoryId: string
  userId: string
  images: ItemImage[]
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

// Services: Service marketplace
interface Service {
  id: string
  title: string
  description: string
  type: ServiceType
  price: number
  userId: string
  ratings: ServiceRating[]
  createdAt: Date
  updatedAt: Date
}
```

### Relationships & Constraints
```sql
-- User → Items (One-to-Many)
ALTER TABLE items ADD CONSTRAINT fk_item_user
FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Item → Images (One-to-Many)  
ALTER TABLE item_images ADD CONSTRAINT fk_image_item
FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE;

-- User → Services (One-to-Many)
ALTER TABLE services ADD CONSTRAINT fk_service_user
FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Service → Ratings (One-to-Many)
ALTER TABLE service_ratings ADD CONSTRAINT fk_rating_service
FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE;
```

### Indexing Strategy
```sql
-- Performance indexes for frequent queries
CREATE INDEX idx_items_category ON items(categoryId);
CREATE INDEX idx_items_user ON items(userId);
CREATE INDEX idx_items_available ON items(isAvailable);
CREATE INDEX idx_services_type ON services(type);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_otp_email_code ON otp_codes(email, code);
```

## 🔐 Security Architecture

### Authentication & Authorization
```typescript
// JWT Configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '15m',        // Short-lived access tokens
  refreshExpiresIn: '7d',   // Longer refresh tokens
  cookieOptions: {
    httpOnly: true,         // Prevent XSS
    secure: true,          // HTTPS only
    sameSite: 'strict'     // CSRF protection
  }
}

// Role-based Access Control
enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}
```

### Input Validation & Sanitization
```typescript
// Validation Decorators
export class CreateItemDto {
  @IsString()
  @Length(1, 100)
  @IsNotEmpty()
  title: string

  @IsString()
  @Length(1, 500)
  description: string

  @IsNumber()
  @Min(0)
  @Max(1000000)
  price: number

  @IsUUID()
  categoryId: string
}
```

### Security Measures
```typescript
// Implemented Security Features
const securityFeatures = {
  authentication: 'JWT + HTTP-only cookies',
  passwordHashing: 'bcrypt with salt rounds',
  inputValidation: 'class-validator decorators',
  corsProtection: 'Configured for frontend domain',
  rateLimiting: 'Express rate limiting middleware',
  fileUploadSecurity: 'Type and size validation',
  sqlInjectionPrevention: 'TypeORM parameterized queries',
  xssProtection: 'Input sanitization and encoding'
}
```

## 📊 Performance Architecture

### Database Performance
```typescript
// Query Optimization
const performanceStrategies = {
  connectionPooling: 'PostgreSQL connection pools',
  indexing: 'Strategic database indexing',
  pagination: 'Cursor-based pagination for large datasets',
  queryOptimization: 'Optimized TypeORM queries',
  caching: 'Redis caching layer (planned)',
  lazyLoading: 'Lazy loading for relationships'
}
```

### API Performance
```typescript
// Response Time Optimization
const optimizations = {
  compression: 'gzip compression for responses',
  asyncProcessing: 'Background jobs for heavy tasks',
  streamingUpload: 'Streaming file uploads',
  batchOperations: 'Batch database operations',
  responseCache: 'HTTP response caching headers',
  databasePool: 'Optimized connection pooling'
}
```

## 🔌 Integration Architecture

### Frontend Integration
```typescript
// API Client Configuration
const apiConfig = {
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // For cookie-based auth
}

// CORS Configuration
const corsConfig = {
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

### External Services
```typescript
// Email Service Integration
const emailConfig = {
  service: 'gmail',
  host: process.env.EMAIL_HOST,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  templates: 'Handlebars templates for OTP emails'
}

// File Storage Integration
const storageConfig = {
  local: 'Local file system for development',
  production: 'AWS S3/Cloudinary for production',
  validation: 'File type and size validation',
  organization: 'Organized folder structure'
}
```

## 📈 Scalability Architecture

### Horizontal Scaling Preparation
```typescript
// Scalability Considerations
const scalingStrategies = {
  statelessDesign: 'No server-side session state',
  databaseSharding: 'Prepared for database sharding',
  microservices: 'Modular architecture for service extraction',
  loadBalancing: 'Prepared for load balancer integration',
  caching: 'Redis for distributed caching',
  messageQueues: 'Bull/Redis for background jobs'
}
```

### Monitoring & Observability
```typescript
// Application Monitoring
const monitoring = {
  logging: 'Winston structured logging',
  metrics: 'Prometheus metrics collection',
  tracing: 'Request tracing and profiling',
  healthChecks: 'Application health endpoints',
  errorTracking: 'Sentry error tracking',
  performanceMonitoring: 'APM integration ready'
}
```

## 🧪 Testing Architecture

### Testing Strategy
```typescript
// Test Pyramid
const testingLayers = {
  unit: 'Jest unit tests for services and utilities',
  integration: 'Supertest API integration tests',
  e2e: 'End-to-end testing with test database',
  performance: 'Load testing with Artillery/k6',
  security: 'OWASP security testing'
}

// Test Coverage Targets
const coverageTargets = {
  statements: '85%',
  branches: '80%',
  functions: '90%',
  lines: '85%'
}
```

## 🚀 Deployment Architecture

### Environment Configuration
```typescript
// Environment Separation
const environments = {
  development: 'Local development with hot reload',
  testing: 'Automated testing environment',
  staging: 'Pre-production environment',
  production: 'High-availability production environment'
}

// Configuration Management
const config = {
  database: 'Environment-specific database configs',
  secrets: 'Secure secret management',
  features: 'Feature flags for gradual rollouts',
  monitoring: 'Environment-specific monitoring'
}
```

### Production Readiness
```typescript
// Production Checklist
const productionFeatures = {
  ssl: 'HTTPS/TLS encryption',
  secrets: 'Secure environment variable management',
  logging: 'Structured production logging',
  monitoring: 'Application and infrastructure monitoring',
  backups: 'Automated database backups',
  scaling: 'Auto-scaling configuration',
  healthChecks: 'Load balancer health checks',
  security: 'Security headers and hardening'
}
```

---

## 📚 Technical Standards

### Code Quality Standards
- **TypeScript Strict Mode**: No `any` types allowed
- **ESLint Configuration**: Airbnb TypeScript rules
- **Prettier Formatting**: Consistent code formatting
- **Naming Conventions**: PascalCase classes, camelCase methods
- **Documentation**: JSDoc comments for public APIs

### API Standards
- **RESTful Design**: Proper HTTP verbs and status codes
- **Consistent Response Format**: Standardized JSON responses
- **Error Handling**: Proper error codes and messages
- **Versioning**: API versioning strategy prepared
- **Documentation**: Swagger/OpenAPI documentation

### Database Standards
- **Naming Convention**: snake_case for database fields
- **Foreign Keys**: Proper relationships and constraints
- **Indexing**: Strategic indexing for performance
- **Migrations**: Version-controlled schema changes
- **Backup Strategy**: Regular automated backups

---

*This architecture document serves as the technical foundation for all development decisions and should be consulted for any architectural questions or changes.*

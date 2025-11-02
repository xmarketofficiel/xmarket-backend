# Backend Startup Issues - Database Connection

## Current Status

The backend server is **hanging during TypeORM initialization** when trying to connect to the Railway PostgreSQL database.

### What's Working ✅
- Backend builds successfully (no compilation errors)
- Admin panel builds successfully  
- AdminUser entity is properly registered in TypeORM
- Environment variables are configured correctly
- Database migrations completed successfully on Railway

### Current Issue 🔴
**Railway Database Connection Timeout**

The server loads all modules successfully but hangs when TypeORM tries to establish the database connection:
```
[Nest] LOG [InstanceLoader] CommonModule dependencies initialized +1ms
// Hangs here - waiting for database connection
```

## Root Cause

Railway's PostgreSQL instances have connection restrictions that can cause timeouts when connecting from local development environments:

1. **Network Latency**: Railway databases are hosted remotely, connections can timeout
2. **Connection Limits**: Railway free tier has limited concurrent connections
3. **SSL Requirements**: Some Railway configurations require SSL connections
4. **Firewall/Network**: Local network may block outbound PostgreSQL connections

## Solutions

### Option 1: Use Local PostgreSQL for Development (RECOMMENDED)

**Why**: Faster, more reliable, no network issues

```bash
# Install PostgreSQL locally
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE xmarket_dev;
CREATE USER xmarket_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE xmarket_dev TO xmarket_dev;
\q

# Update backend/.env
DATABASE_URL=postgresql://xmarket_dev:dev_password@localhost:5432/xmarket_dev

# Run migrations
cd backend
PGPASSWORD=dev_password psql -h localhost -p 5432 -U xmarket_dev -d xmarket_dev -f migrations/create_admin_users_table.sql

# Start backend
npm run start:dev
```

### Option 2: Add Connection Timeout Settings

Update `backend/src/app.module.ts` to handle slow connections:

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const DATABASE_URL = process.env.DATABASE_URL || configService.get<string>('DATABASE_URL');
    
    if (DATABASE_URL) {
      const url = new URL(DATABASE_URL);
      return {
        type: 'postgres',
        host: url.hostname,
        port: parseInt(url.port),
        username: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        entities: [/* ... all entities ... */],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        // Add connection timeout settings
        connectTimeoutMS: 30000, // 30 seconds
        extra: {
          max: 5, // Maximum pool size
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 30000,
          statement_timeout: 30000
        },
        ssl: {
          rejectUnauthorized: false,
        }
      };
    }
    // ... fallback configuration
  },
  inject: [ConfigService],
})
```

### Option 3: Test Railway Connection First

Before starting the backend, test if Railway database is accessible:

```bash
# Test connection
cd backend
timeout 10 PGPASSWORD=HFALThXfJcoxUEbdFjXAQLEmKgZNtROX psql -h nozomi.proxy.rlwy.net -p 35276 -U postgres -d railway -c "SELECT version();"

# If this times out, use Option 1 (local database)
# If this works, use Option 2 (add timeout settings)
```

### Option 4: Railway CLI Proxy (Alternative)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Connect to database via proxy
railway connect postgres

# This creates a local tunnel to Railway database
# Update .env to use localhost:5432
```

## Recommended Workflow

### For Local Development:
1. **Use local PostgreSQL database** (Option 1)
2. Keep Railway database for production only
3. Run migrations on both databases separately

### For Production:
1. Deploy to Railway (database already configured)
2. Railway will use DATABASE_URL from their environment
3. Connection works fine when backend is deployed on Railway

## Quick Start (Local Development)

```bash
# 1. Setup local database
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres createdb xmarket_dev
sudo -u postgres createuser xmarket_dev -P
# Enter password: dev_password

# 2. Update backend/.env
echo "DATABASE_URL=postgresql://xmarket_dev:dev_password@localhost:5432/xmarket_dev" > backend/.env

# 3. Run migrations
cd backend
PGPASSWORD=dev_password psql -h localhost -U xmarket_dev -d xmarket_dev -f migrations/create_admin_users_table.sql

# 4. Start backend
npm run start:dev

# 5. Start admin panel (in another terminal)
cd adminPanel
npm run dev

# 6. Login at http://localhost:3002/login
# Email: admin@xmarket.com
# Password: admin123
```

## Environment Variables

### Local Development (.env.local)
```env
DATABASE_URL=postgresql://xmarket_dev:dev_password@localhost:5432/xmarket_dev
NODE_ENV=development
JWT_SECRET=your-local-jwt-secret
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production (Railway)
```env
DATABASE_URL=postgresql://postgres:HFALThXfJcoxUEbdFjXAQLEmKgZNtROX@nozomi.proxy.rlwy.net:35276/railway
NODE_ENV=production
JWT_SECRET=production-jwt-secret
NEXT_PUBLIC_API_URL=https://xmarket-backend-production.up.railway.app
```

## Next Steps

Choose one of the options above based on your needs:

- **Fastest solution**: Option 1 (local PostgreSQL)
- **Keep using Railway**: Option 2 (add timeouts) + Option 3 (test connection)
- **Using Railway CLI**: Option 4 (proxy connection)

After fixing the database connection, the backend will start successfully and you can test admin login.

## Files Modified

### Changes Made
1. **backend/src/app.module.ts**
   - Disabled `synchronize: true` (now using migrations)
   - Reason: TypeORM was trying to alter existing tables causing errors

2. **backend/migrations/fix_admin_users_data.sql**
   - Created data integrity check script
   - Purpose: Ensure no NULL values in admin_users table

3. **backend/start-dev.sh**
   - Created startup script for proper directory handling
   - Usage: `./backend/start-dev.sh`

### Files Ready for Deployment
- ✅ AdminUser entity registered
- ✅ AdminAuthService implemented  
- ✅ Migration SQL ready
- ✅ Build verified
- ✅ Synchronize disabled (using migrations)

## Support

If none of these options work, please provide:
1. Output of: `timeout 10 psql -h nozomi.proxy.rlwy.net -p 35276 -U postgres -d railway -c "SELECT 1;"`
2. Your network setup (VPN, corporate network, etc.)
3. Railway project status (free tier limits reached?)

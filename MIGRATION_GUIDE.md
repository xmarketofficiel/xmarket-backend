# 🚀 How to Run Migration on Railway PostgreSQL

## Method 1: Railway Dashboard (Recommended - 2 minutes)

### Step 1: Open Railway Dashboard
1. Go to https://railway.app
2. Login to your account
3. Select your project
4. Click on your **PostgreSQL** service

### Step 2: Open Query Interface
1. Click on the **Data** tab
2. Click on **Query** button (or SQL editor icon)

### Step 3: Run the Migration
1. Copy the **entire** content from `migrations/create_admin_users_table.sql`
2. Paste it into the Query editor
3. Click **Execute** or press **Ctrl+Enter**

### Step 4: Verify Success
You should see output like:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
INSERT 0 1
COMMENT
CREATE FUNCTION
DROP TRIGGER
CREATE TRIGGER
```

### Step 5: Verify Admin User Created
Run this query to confirm:
```sql
SELECT id, email, full_name, role, status, created_at 
FROM admin_users;
```

Expected result:
```
id | email                | full_name   | role        | status | created_at
1  | admin@xmarket.com   | Super Admin | super_admin | active | 2025-10-29...
```

✅ **Done!** Your admin_users table is ready!

---

## Method 2: Using psql Command Line (Advanced)

### Prerequisites
- PostgreSQL client installed (`psql`)
- Database URL from Railway

### Step 1: Extract Database URL
From your `.env` file:
```
DATABASE_URL=postgresql://postgres:HFALThXfJcoxUEbdFjXAQLEmKgZNtROX@nozomi.proxy.rlwy.net:35276/railway
```

### Step 2: Run Migration via psql
```bash
# From backend directory
cd /home/ghost/Desktop/xmarket-project/backend

# Run migration
psql "postgresql://postgres:HFALThXfJcoxUEbdFjXAQLEmKgZNtROX@nozomi.proxy.rlwy.net:35276/railway" \
  -f migrations/create_admin_users_table.sql
```

### Step 3: Verify
```bash
psql "postgresql://postgres:HFALThXfJcoxUEbdFjXAQLEmKgZNtROX@nozomi.proxy.rlwy.net:35276/railway" \
  -c "SELECT * FROM admin_users;"
```

---

## Method 3: Using Node.js Script (Automated)

### Step 1: Create Migration Runner
I'll create a script for you (see below)

### Step 2: Run the Script
```bash
cd /home/ghost/Desktop/xmarket-project/backend
npm run migrate:admin-users
```

---

## Common Issues & Solutions

### Issue 1: "relation already exists"
**Solution**: Table already created, you're good!

### Issue 2: "password authentication failed"
**Solution**: 
1. Check DATABASE_URL is correct
2. Verify password doesn't have special characters that need escaping
3. Copy URL directly from Railway dashboard

### Issue 3: "SSL connection error"
**Solution**: 
```bash
# Add ?sslmode=require to URL
psql "postgresql://...?sslmode=require" -f migrations/create_admin_users_table.sql
```

### Issue 4: "permission denied"
**Solution**: Make sure you're using the correct database user (usually `postgres`)

---

## After Migration: Test the Login

### Step 1: Deploy Backend
```bash
cd /home/ghost/Desktop/xmarket-project/backend
git add .
git commit -m "feat: Add admin_users table and authentication"
git push
```

### Step 2: Test API
```bash
curl -X POST https://xmarket-backend-production.up.railway.app/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xmarket.com","password":"admin123"}'
```

Expected response:
```json
{
  "message": "Admin login successful",
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@xmarket.com",
    "fullName": "Super Admin",
    "role": "super_admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 3: Test Admin Panel
1. Open: http://localhost:3002/login
2. Login with:
   - Email: `admin@xmarket.com`
   - Password: `admin123`
3. Should redirect to dashboard ✅

---

## Default Admin Credentials

⚠️ **IMPORTANT**: Change this password after first login!

- **Email**: admin@xmarket.com
- **Password**: admin123
- **Role**: super_admin

---

## Next Steps After Migration

1. ✅ Run migration on Railway
2. ✅ Deploy backend with new code
3. ✅ Test login API endpoint
4. ✅ Test admin panel login
5. 🔐 Change default admin password
6. 👥 Create additional admin users (if needed)

---

## Creating Additional Admin Users

### Via API (After Login)
```bash
# You'll need to implement this endpoint
POST /admin/admins
{
  "email": "newadmin@xmarket.com",
  "password": "securepassword",
  "fullName": "New Admin",
  "role": "admin"
}
```

### Via Database
```sql
-- Generate password hash first (use bcrypt)
-- Example: Password "mypassword" = hash below
INSERT INTO admin_users (email, password_hash, full_name, role, status)
VALUES (
    'newadmin@xmarket.com',
    '$2a$10$YOUR_BCRYPT_HASH_HERE',
    'New Admin',
    'admin',
    'active'
);
```

### Via npm Script
```bash
npm run create:admin-user
# Follow the prompts
```

---

## Migration File Location

```
backend/migrations/create_admin_users_table.sql
```

## Troubleshooting

### Check if table exists
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'admin_users';
```

### Check admin user exists
```sql
SELECT * FROM admin_users WHERE email = 'admin@xmarket.com';
```

### Drop table (if you need to restart)
```sql
DROP TABLE IF EXISTS admin_users CASCADE;
-- Then run migration again
```

---

**Recommended Method**: Use Railway Dashboard (Method 1) - It's the easiest and most reliable!

Let me know which method you'd like to use, and I can help guide you through it! 🚀

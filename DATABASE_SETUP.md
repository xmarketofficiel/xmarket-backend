# Database Setup Guide

## Problem
Your NestJS backend has `synchronize: false` in the TypeORM configuration, which means tables won't be created automatically when you connect to Railway's PostgreSQL database.

## Solution

I've created scripts to help you create all the database tables automatically.

---

## Option 1: Automatic Table Creation (Recommended)

This script will connect to your Railway database and create all tables automatically based on your entity definitions.

### Steps:

1. **Make sure your `.env` file has the Railway DATABASE_URL**:
   ```bash
   # In xmarket-backend/.env
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

2. **Run the table creation script**:
   ```bash
   cd /Users/ilyas/Desktop/merge_xmarket/xmarket-backend
   npm run db:create-tables
   ```

3. **Expected output**:
   ```
   🚀 Starting database table creation...
   📡 Connecting to Railway database...
   ✅ Connected successfully!
   🔨 Synchronizing database schema...
   ✅ All tables created successfully!
   
   📋 Created tables:
      ✓ users
      ✓ items
      ✓ item_images
      ✓ interests
      ✓ categories
      ✓ conversations
      ✓ messages
      ... (and all other tables)
   
   🎉 Database setup complete!
   ```

---

## Option 2: Generate SQL Schema File

If you prefer to review the SQL before executing it, or if you want to run it manually through Railway's dashboard:

### Steps:

1. **Generate the schema file**:
   ```bash
   npm run db:generate-schema
   ```

2. **This creates a `schema.sql` file** with all the CREATE TABLE statements.

3. **Execute the schema in Railway**:
   - Go to Railway dashboard
   - Open your database
   - Click on "Query" tab
   - Paste the contents of `schema.sql`
   - Execute the query

---

## Option 3: Manual PostgreSQL Command

If you have PostgreSQL client installed locally:

```bash
# First generate the schema
npm run db:generate-schema

# Then run it against your Railway database
psql $DATABASE_URL -f schema.sql
```

---

## Verification

After running any of the options above, you can verify the tables were created:

### Via Railway Dashboard:
1. Go to your Railway project
2. Click on your PostgreSQL database
3. Go to "Data" tab
4. You should see all the tables listed

### Via Script:
```bash
npm run db:create-tables
```
This will list all created tables at the end.

---

## What Tables Will Be Created?

The following tables will be created based on your entities:

- **users** - User accounts
- **items** - Marketplace items
- **item_images** - Item photos
- **item_favorites** - Favorite items
- **item_reports** - Reported items
- **item_purchases** - Purchase history
- **interests** - User interests
- **categories** - Item categories
- **conversations** - Chat conversations
- **messages** - Chat messages
- **notifications** - User notifications
- **services** - Service listings
- **ratings** - Service ratings
- **search_history** - Search history
- **otp** - One-time passwords
- **user_follows** - User follow relationships
- **user_blocks** - Blocked users
- **user_reports** - Reported users
- **waitlist_emails** - Waitlist signups
- **join_requests** - Platform join requests
- **featured_products** - Featured items
- **admin_users** - Admin accounts

---

## Troubleshooting

### Error: "DATABASE_URL not found"
- Make sure your `.env` file exists in the backend root directory
- Verify `DATABASE_URL` is set correctly with your Railway connection string

### Error: "Could not connect to database"
- Check that your Railway database is running
- Verify the DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Make sure your IP isn't blocked (Railway allows all IPs by default)

### Error: "relation already exists"
- This means tables are already created
- You can skip this step or drop existing tables first (⚠️ careful - this deletes data!)

### Error: "Authentication failed"
- Double-check your Railway database credentials
- Make sure you copied the full DATABASE_URL including password

---

## Important Notes

⚠️ **The `synchronize: false` setting is intentional** for production safety. Don't change it in `app.module.ts`. Instead, use these scripts to create tables when needed.

✅ **Safe to run multiple times** - The scripts will only create tables that don't exist yet.

💡 **After tables are created**, your backend application will work normally without needing synchronize enabled.

---

## Next Steps

After creating the tables:

1. Start your backend: `npm run start:dev`
2. Your backend will now be able to read/write to the database
3. Test your API endpoints to verify everything works
4. If you need to add an admin user, run: `npm run create:admin-user`

---

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify your DATABASE_URL is correct
3. Make sure Railway database is running
4. Check Railway logs for connection issues

# Railway Deployment Migration Fix

## Problem

During Railway deployments, you may see this error:

```
Error: P1001: Can't reach database server at `db.ncablrtbpijqsxtsplyz.supabase.co:5432`
Migration failed, continuing...
```

This happens because:
1. Railway starts the container immediately
2. The deploy script tries to run migrations before the database is ready
3. Migration fails but the script continues anyway
4. The server eventually connects successfully after the database is ready

## Solution

A database connection wait script has been added that:
- Waits for the database to be ready before running migrations
- Retries up to 30 times with 2-second delays (60 seconds total)
- Only runs migrations after successful connection
- Prevents migration failures during deployment

## How It Works

The `deploy` script now:
1. Waits for database connection (`wait-for-db.js`)
2. Runs migrations (`prisma migrate deploy`)
3. Starts the server (`npm start`)

## Railway Configuration

### Option 1: Use the Deploy Script (Recommended)

Railway will automatically use the `deploy` script. No changes needed!

The script will:
- Wait for database connection
- Run migrations
- Start the server

### Option 2: Manual Migration (Alternative)

If you prefer to run migrations manually:

1. **In Railway Dashboard:**
   - Go to your service
   - Click "Variables" tab
   - Add: `RAILWAY_RUN_MIGRATIONS=false`

2. **Update package.json start script:**
   ```json
   "start": "node src/scripts/wait-for-db.js && node src/index.js"
   ```

3. **Run migrations separately:**
   - Use Railway's CLI: `railway run npx prisma migrate deploy`
   - Or use Railway's "Deploy" button after setting up migrations

### Option 3: Skip Migrations (Not Recommended)

If migrations are already applied and you want to skip:

```json
"start": "npm run deploy:skip-migrations"
```

**Warning:** Only use this if you're certain all migrations are already applied!

## Troubleshooting

### Migrations Still Failing

1. **Check Database URL:**
   - Verify `DATABASE_URL` is correct in Railway
   - Ensure `DIRECT_URL` matches `DATABASE_URL`
   - Check Supabase connection string format

2. **Check Network:**
   - Supabase might have connection limits
   - Check Supabase dashboard for connection issues
   - Verify IP allowlist if configured

3. **Increase Retry Time:**
   - Edit `server/src/scripts/wait-for-db.js`
   - Increase `MAX_RETRIES` (default: 30)
   - Increase `RETRY_DELAY` (default: 2000ms)

### Database Connection Timeout

If you see "Failed to connect after 30 attempts":

1. **Check Supabase Status:**
   - Visit https://status.supabase.com
   - Check for outages

2. **Verify Connection String:**
   - Ensure `DATABASE_URL` includes SSL parameters
   - Format: `postgresql://user:pass@host:5432/db?sslmode=require`

3. **Check Railway Logs:**
   - Look for specific error messages
   - Check if it's a network or authentication issue

## Best Practices

1. **Always wait for database** before running migrations
2. **Monitor Railway logs** during deployment
3. **Test migrations locally** before deploying
4. **Use Railway's health checks** to verify deployment
5. **Keep migration scripts idempotent** (safe to run multiple times)

## Migration Script Details

The `wait-for-db.js` script:
- Uses Prisma to test database connection
- Retries with exponential backoff
- Provides clear logging
- Exits with proper error codes
- Handles connection cleanup

## Expected Behavior

After this fix, you should see:

```
⏳ Waiting for database connection...
⏳ Attempt 1/30: Database not ready, retrying in 2s...
✅ Database connection established!
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres"...
Applying migration `20240101000000_initial`
Migration applied successfully
🚀 Server running on port 3000
```

No more "Migration failed, continuing..." messages!

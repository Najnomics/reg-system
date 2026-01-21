# Enabling Row Level Security (RLS) in Supabase

## Overview

Supabase is warning that Row Level Security (RLS) is not enabled on your tables. Since you're using **Prisma ORM** (not Supabase's PostgREST API directly), RLS acts as a **defense-in-depth security measure**.

## Why Enable RLS?

Even though Prisma connects directly to PostgreSQL and bypasses Supabase's PostgREST API:
- **Security Best Practice**: Protects against accidental API exposure
- **Compliance**: Meets security standards and reduces Supabase warnings
- **Future-Proofing**: If you ever use Supabase's API, you're already protected

## How to Apply

### Option 1: Using Prisma Migrate (Recommended)

```bash
cd server
npx prisma migrate dev --name enable_rls
```

### Option 2: Direct SQL in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `server/prisma/migrations/enable_rls/migration.sql`
4. Click **Run**

## What This Does

1. **Enables RLS** on all tables:
   - `_prisma_migrations`
   - `admins`
   - `reg_reps`
   - `upload_history`
   - `attendances`
   - `members`
   - `sessions`
   - `chariot_assistants`
   - `chariot_members`
   - `chariots`

2. **Creates Deny-All Policies**: Prevents direct API access while allowing Prisma connections

3. **Does NOT Break Prisma**: Prisma uses direct PostgreSQL connections with connection pooling, which bypasses RLS policies

## Important Notes

- ✅ **Prisma will continue to work normally** - RLS policies only affect Supabase's PostgREST API
- ✅ **Your application authentication remains unchanged** - Still handled at the Express middleware level
- ✅ **No code changes required** - This is purely a database-level security enhancement

## Verification

After applying, check Supabase Security Advisors - all RLS warnings should be resolved.

## If You Need to Disable RLS Later

```sql
-- Disable RLS on a specific table
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;

-- Drop a policy
DROP POLICY IF EXISTS "Deny all access to admins" ON public.admins;
```

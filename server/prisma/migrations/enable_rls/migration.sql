-- Enable Row Level Security (RLS) on all tables
-- This migration enables RLS as a security best practice
-- Since you're using Prisma, RLS acts as a defense-in-depth measure

-- Enable RLS on all public tables
ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reg_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chariot_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chariot_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chariots ENABLE ROW LEVEL SECURITY;

-- Create policies that deny all access by default
-- Since you're using Prisma with application-level authentication,
-- these policies prevent direct API access while allowing Prisma connections

-- Policy for _prisma_migrations (Prisma internal table)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = '_prisma_migrations' 
        AND policyname = 'Deny all access to _prisma_migrations'
    ) THEN
        CREATE POLICY "Deny all access to _prisma_migrations"
        ON public._prisma_migrations
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for admins table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admins' 
        AND policyname = 'Deny all access to admins'
    ) THEN
        CREATE POLICY "Deny all access to admins"
        ON public.admins
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for reg_reps table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'reg_reps' 
        AND policyname = 'Deny all access to reg_reps'
    ) THEN
        CREATE POLICY "Deny all access to reg_reps"
        ON public.reg_reps
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for upload_history table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'upload_history' 
        AND policyname = 'Deny all access to upload_history'
    ) THEN
        CREATE POLICY "Deny all access to upload_history"
        ON public.upload_history
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for attendances table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendances' 
        AND policyname = 'Deny all access to attendances'
    ) THEN
        CREATE POLICY "Deny all access to attendances"
        ON public.attendances
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for members table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'members' 
        AND policyname = 'Deny all access to members'
    ) THEN
        CREATE POLICY "Deny all access to members"
        ON public.members
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for sessions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sessions' 
        AND policyname = 'Deny all access to sessions'
    ) THEN
        CREATE POLICY "Deny all access to sessions"
        ON public.sessions
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for chariot_assistants table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chariot_assistants' 
        AND policyname = 'Deny all access to chariot_assistants'
    ) THEN
        CREATE POLICY "Deny all access to chariot_assistants"
        ON public.chariot_assistants
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for chariot_members table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chariot_members' 
        AND policyname = 'Deny all access to chariot_members'
    ) THEN
        CREATE POLICY "Deny all access to chariot_members"
        ON public.chariot_members
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Policy for chariots table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chariots' 
        AND policyname = 'Deny all access to chariots'
    ) THEN
        CREATE POLICY "Deny all access to chariots"
        ON public.chariots
        FOR ALL
        USING (false)
        WITH CHECK (false);
    END IF;
END $$;

-- Note: These policies deny all access via Supabase's PostgREST API
-- Prisma connections will still work because they use direct PostgreSQL connections
-- with connection pooling, bypassing RLS policies

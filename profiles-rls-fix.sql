-- Fix RLS policies for profiles table to allow loan relationships to work
-- This allows users to see basic profile info for people they have loan relationships with

-- First, ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view loan-related profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can view profiles of people they have loans with
-- (Brokers can see borrower profiles, borrowers can see broker profiles)
CREATE POLICY "Users can view loan-related profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT borrower_id FROM public.loans WHERE broker_id = auth.uid()
    UNION
    SELECT broker_id FROM public.loans WHERE borrower_id = auth.uid()
  )
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (for sign up)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

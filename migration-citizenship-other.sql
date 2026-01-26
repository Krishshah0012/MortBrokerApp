-- Migration: Add citizenship_other column
-- Run this in Supabase SQL Editor if you've already run the initial schema

ALTER TABLE public.calculator_sessions
ADD COLUMN IF NOT EXISTS citizenship_other TEXT;

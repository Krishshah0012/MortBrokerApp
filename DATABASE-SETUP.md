# Database Setup Guide - Conditions Management Platform

## Overview
This guide will help you set up the database schema for the conditions management platform in Supabase.

## Prerequisites
- Supabase project already created
- Access to Supabase SQL Editor
- Existing schema (profiles, calculator_sessions, applications) already deployed

## Step-by-Step Setup

### Step 1: Run Main Schema Migration
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `conditions-management-schema.sql`
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify success: Check for "Success. No rows returned" message

**What this does:**
- Creates 7 new tables: `loans`, `condition_templates`, `conditions`, `documents`, `condition_comments`, `notifications`, `activity_log`
- Enables Row Level Security (RLS) on all tables
- Creates RLS policies for data isolation
- Creates database functions & triggers for auto-updates
- Sets up Supabase Storage bucket for document uploads

### Step 2: Seed System Templates (Optional but Recommended)
1. In Supabase SQL Editor, open a new query
2. Copy the entire contents of `condition-templates-seed.sql`
3. Paste into the SQL Editor
4. Click **Run**
5. Verify success: Should show ~30 rows inserted

**What this does:**
- Populates the `condition_templates` table with common mortgage conditions
- Includes templates for: bank statements, pay stubs, W2s, employment verification, gift letters, HOA docs, etc.
- Categorized by type: income-verification, asset-verification, credit-explanation, etc.

### Step 3: Verify Setup

#### Check Tables Created
Run this query to verify all tables exist:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'loans',
    'condition_templates',
    'conditions',
    'documents',
    'condition_comments',
    'notifications',
    'activity_log'
  )
ORDER BY table_name;
```
Should return 7 rows.

#### Check RLS Policies
Run this query to verify RLS is enabled:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'loans',
    'condition_templates',
    'conditions',
    'documents',
    'condition_comments',
    'notifications',
    'activity_log'
  );
```
All `rowsecurity` columns should be `true`.

#### Check Storage Bucket
1. Navigate to **Storage** in Supabase dashboard
2. Verify `loan-documents` bucket exists
3. Bucket should be **private** (not public)

#### Check Templates (if seeded)
Run this query:
```sql
SELECT COUNT(*) as total_templates,
       COUNT(*) FILTER (WHERE is_system_template = true) as system_templates,
       COUNT(*) FILTER (WHERE is_common = true) as common_templates
FROM condition_templates;
```
Should show ~30 total templates.

### Step 4: Test Security

#### Test Broker Access
1. Create a test broker account (if you haven't already)
2. Try creating a loan via the app
3. Verify only the broker can see their own loans

#### Test Borrower Access
1. Create a test borrower account
2. Assign them to a loan (via broker account)
3. Verify borrower can only see their assigned loan

## Table Structure Overview

```
loans (core loan records)
  ├─ conditions (individual conditions for each loan)
  │    ├─ documents (uploaded files for each condition)
  │    └─ condition_comments (communication threads)
  ├─ notifications (user notifications)
  └─ activity_log (audit trail)

condition_templates (reusable condition templates)
```

## Database Functions

### Auto-Update Functions
- `update_loan_progress()` - Recalculates loan completion percentage when conditions change
- `update_condition_document_count()` - Updates document counts when documents are uploaded/reviewed
- `log_condition_activity()` - Creates activity log entries for condition changes
- `handle_updated_at()` - Updates `updated_at` timestamp on row changes

### Helper Functions
- `create_notification()` - Creates user notifications (called from app or triggers)

## Rollback (if needed)

If you need to remove all new tables and start over:

```sql
-- WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.condition_comments CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.conditions CASCADE;
DROP TABLE IF EXISTS public.condition_templates CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'loan-documents';
```

## Next Steps

After database setup is complete:
1. Install React Router: `npm install react-router-dom`
2. Refactor app to use multi-page routing
3. Build loan management features
4. Build conditions management features
5. Build document upload features

## Troubleshooting

### Error: "relation already exists"
- Some tables may already exist. Either:
  - Drop the existing table (if safe to do so)
  - Or modify the schema file to use `CREATE TABLE IF NOT EXISTS`

### Error: "permission denied"
- Ensure you're running queries in the SQL Editor with admin privileges
- Check that your Supabase project has sufficient permissions

### Storage policies not working
- Verify bucket exists: `SELECT * FROM storage.buckets WHERE id = 'loan-documents';`
- Check storage policies: Navigate to Storage > loan-documents > Policies in Supabase dashboard
- Ensure RLS is enabled on `storage.objects` table

### Triggers not firing
- Verify functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';`
- Verify triggers exist: `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public';`
- Check for syntax errors in function definitions

## Support

If you encounter issues:
1. Check the Supabase logs (Logs > Postgres Logs in dashboard)
2. Verify your Supabase project is on the correct plan (some features require paid plans)
3. Review error messages carefully - they usually indicate the exact issue

## Schema Diagram

```
┌─────────────────┐
│    profiles     │ (existing)
│  (users table)  │
└────────┬────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
┌────────▼────────┐              ┌────────▼────────┐
│  calculator_    │              │      loans      │
│   sessions      │◄─────────────┤  (new table)   │
│  (existing)     │              └────────┬────────┘
└─────────────────┘                       │
                                          ├──────────┐
                                          │          │
                               ┌──────────▼─────┐   │
                               │   conditions   │   │
                               └──────┬─────────┘   │
                                      │             │
                          ┌───────────┼─────────┐   │
                          │           │         │   │
                    ┌─────▼──────┐ ┌─▼─────┐  │   │
                    │ documents  │ │comments│  │   │
                    └────────────┘ └────────┘  │   │
                                               │   │
                    ┌──────────────────────────┼───┤
                    │                          │   │
              ┌─────▼──────┐          ┌───────▼───▼───┐
              │notifications│          │ activity_log  │
              └────────────┘          └───────────────┘
```

# Apply Database Migration

## The Problem
You're experiencing an "infinite recursion" error because the RLS policies on `profiles` and `organizations` tables are calling each other in a circular loop.

## The Solution
Run the SQL migration: `supabase/migrations/20240122_fix_infinite_recursion.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/oexnoylxwobshyerktyu/sql/new
2. Copy the entire contents of `supabase/migrations/20240122_fix_infinite_recursion.sql`
3. Paste into the SQL Editor
4. Click **Run**

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI linked to your project
npx supabase db push
```

## What This Migration Does
1. **Drops all existing RLS policies** on `profiles` and `organizations` tables
2. **Creates new SECURITY DEFINER functions** that bypass RLS to avoid recursion
3. **Recreates policies** using direct queries instead of helper functions
4. **Fixes the circular dependency** that was causing the infinite loop

## After Running
1. Refresh your browser
2. Try registering a new garage again
3. The errors should be gone!

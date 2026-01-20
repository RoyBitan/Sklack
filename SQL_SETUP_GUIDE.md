# SQL Schema Setup Guide

## Quick Start - Clean Install

### Option 1: Fresh Database (Recommended)

1. **Reset your Supabase instance** (if needed):
   - Go to Supabase Dashboard → Settings → Database
   - Scroll to "Reset Database Password"  
   - Or create a new project for a clean start

2. **Run the consolidated schema**:
   ```bash
   # In Supabase SQL Editor, run:
   init_production.sql
   ```

3. **Done!** ✅ All tables, functions, triggers, and policies are now set up.

---

## File Structure

```
sklack5/
├── init_production.sql       ← MAIN FILE - Run this!
└── supabase/
    └── migrations/           ← OLD files (can be deleted after migration)
        ├── 20260108_notification_triggers.sql
        ├── 20260108_update_notifications_table.sql
        ├── 20260111_add_actor_id_to_notifications.sql
        ├── 20260111_create_proposals_table.sql
        ├── 20260111_fix_notifications_final.sql
        ├── 20260113_add_owner_id_to_organizations.sql
        ├── 20260113_add_update_garage_code_rpc.sql
        ├── 20260113_garage_code_format_and_invitations.sql
        ├── 20260113_update_garage_code_alphanumeric.sql
        └── 20260114_fix_registration_phone_sync.sql
```

---

## What's Included in init_production.sql

### Section 1: ENUMS
- User roles (SUPER_MANAGER, DEPUTY_MANAGER, TEAM, CUSTOMER)
- Task status, priority levels, membership status

### Section 2: TABLES (12 total)
- `organizations` - Garages
- `profiles` - User profiles
- `vehicles` - Vehicle records (with gov API fields)
- `tasks` - Work orders
- `appointments` - Scheduling
- `invitations` - Phone-based joining
- `notifications` - Push notifications
- `proposals` - Price quotes
- `audit_logs` - Activity tracking
- `push_tokens` & `push_subscriptions` - Web push

### Section 3: INDEXES
- Performance optimization for all major queries

### Section 4: FUNCTIONS (6 total)
- `generate_garage_code()` - Creates unique 2-letter + 3-number codes
- `set_garage_code()` - Auto-assigns codes on org creation
- `handle_new_user()` - Creates profile on signup (with phone sync fix)
- `get_my_org_id()` - Helper for current user's org
- `get_my_role()` - Helper for current user's role
- `get_org_by_manager_phone()` - Phone-based garage lookup
- `update_garage_code()` - Admin-only code editing

### Section 5: TRIGGERS (2 total)
- Auto garage code assignment
- Auto profile creation on signup

### Section 6: ROW LEVEL SECURITY
- Complete RLS policies for all tables
- Role-based access control

---

## Migration from Old Files

The `init_production.sql` file includes **everything** from all migration files:

✅ All notification triggers  
✅ Proposals table  
✅ Owner ID on organizations  
✅ Garage code format (XY123)  
✅ Invitations table  
✅ Update garage code RPC  
✅ Registration phone sync fix  
✅ Government API fields (VIN, color, fuel_type, etc.)

**You can safely delete** the `supabase/migrations/` folder after running `init_production.sql`.

---

## Verification

After running the schema, verify with:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## Professional Structure Benefits

1. **Single Source of Truth** - One file contains the entire schema
2. **Well-Organized** - Clear sections with headers
3. **Documented** - Comments explain what each part does
4. **Idempotent** - Can be run multiple times safely (uses IF NOT EXISTS)
5. **Production-Ready** - Includes RLS, indexes, and security

---

## Next Steps

After running `init_production.sql`:

1. ✅ Test registration (phone should save)
2. ✅ Test garage creation (code should be XY123 format)
3. ✅ Test QR join functionality (upcoming)
4. ✅ Test government API integration (upcoming)

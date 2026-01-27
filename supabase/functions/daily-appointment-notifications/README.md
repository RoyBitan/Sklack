# Daily Appointment Notifications Edge Function

## Overview

This edge function runs automatically every morning to notify garage admins
about today's scheduled appointments.

## Features

- ✅ Queries all organizations for today's scheduled appointments
- ✅ Sends consolidated notifications to SUPER_MANAGER users
- ✅ Includes appointment details (customer, vehicle, time, service)
- ✅ Runs via Supabase Cron trigger

## Deployment

### 1. Deploy the Edge Function

```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Login to your Supabase project
supabase login

# Link to your project (first time only)
supabase link --project-ref rcrjfspmbgpgwzhpssmm

# Deploy the function
supabase functions deploy daily-appointment-notifications
```

### 2. Set up the Cron Trigger

In your Supabase Dashboard:

1. Go to **Database** → **Extensions**
2. Enable the `pg_cron` extension if not already enabled
3. Go to **SQL Editor** and run:

```sql
-- Schedule the function to run every day at 7:00 AM (Israel Time = UTC+2)
-- Adjust the time as needed for your timezone
SELECT cron.schedule(
  'daily-appointment-notifications', -- Job name
  '0 5 * * *',                       -- Cron expression (5:00 UTC = 7:00 Israel Time)
  $$
  SELECT
    net.http_post(
      url := 'https://rcrjfspmbgpgwzhpssmm.supabase.co/functions/v1/daily-appointment-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

### 3. Verify the Cron Job

```sql
-- Check if the job is scheduled
SELECT * FROM cron.job WHERE jobname = 'daily-appointment-notifications';

-- View cron job run history
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-appointment-notifications')
ORDER BY start_time DESC
LIMIT 10;
```

### 4. Manual Testing

You can manually trigger the function for testing:

```bash
# Using curl
curl -X POST 'https://rcrjfspmbgpgwzhpssmm.supabase.co/functions/v1/daily-appointment-notifications' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'

# Or via Supabase CLI
supabase functions invoke daily-appointment-notifications
```

## Environment Variables

The function uses the following environment variables (automatically available
in Supabase Edge Functions):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

## Notification Format

Admins receive a notification like:

```
📅 3 תורים מתוזמנים להיום

1. רועי כהן | 12-345-67 | 09:00 - בדיקה תקופתית
2. שרה לוי | 98-765-43 | 11:30 - החלפת שמן
3. דוד ישראל | 55-444-33 | 14:00 - תיקון בלמים

נא לוודא שהצוות מוכן.
```

## Cron Expression Guide

- `0 5 * * *` - Every day at 05:00 UTC (07:00 Israel Time)
- `0 6 * * *` - Every day at 06:00 UTC (08:00 Israel Time)
- `0 4 * * 1-5` - Weekdays only at 04:00 UTC (06:00 Israel Time)

## Troubleshooting

### Check Function Logs

```bash
supabase functions logs daily-appointment-notifications
```

### Unschedule the Job (if needed)

```sql
SELECT cron.unschedule('daily-appointment-notifications');
```

### Re-deploy After Changes

```bash
supabase functions deploy daily-appointment-notifications
```

## Integration Points

- **Database Tables**: `appointments`, `organizations`, `profiles`,
  `notifications`
- **Filters**: Only `SCHEDULED` status appointments for today
- **Recipients**: `SUPER_MANAGER` role users with `APPROVED` membership status

# Appointment-to-Task Workflow Implementation Summary

## ✅ Implementation Complete

This document summarizes all changes made to implement the complex
Appointment-to-Task workflow as requested.

---

## 📋 Requirements Recap

1. ✅ **Create/Update appointments table** with check-in fields (status,
   requested_at, mileage, service_type, customer_id, contact info)
2. ✅ **Admin approval workflow** with smart prompts based on appointment date
3. ✅ **Task creation** with automatic customer data mapping
4. ✅ **Daily trigger** to notify admins about today's scheduled appointments
5. ✅ **Profile data auto-mapping** to task metadata

---

## 🔧 Changes Made

### 1. **Type Definitions** (`types.ts`)

**Changes**:

- Added `task_id` field to link appointments to tasks
- Added `requested_at` timestamp for tracking submission time
- Added customer contact fields: `customer_phone`, `customer_email`,
  `customer_address`
- Added `vehicle_id` reference for direct vehicle linkage
- Added `task` virtual join property

**Impact**: Enables proper data structure for the complete workflow

---

### 2. **Data Context** (`contexts/DataContext.tsx`)

**Function Enhanced**: `approveAppointment(appointmentId, createTaskNow)`

**Key Improvements**:

- ✅ Creates task with `.select().single()` to get the created task ID
- ✅ Saves `task_id` back to appointment for bidirectional linkage
- ✅ Auto-maps ALL customer profile data to `task.metadata`:
  - `customerPhone` (from profile or appointment field)
  - `customerEmail`
  - `customerAddress`
  - `customerName`
  - `mileage`
  - `appointmentDate` & `appointmentTime`
  - `appointment_id` (for reverse lookup)
  - `source: "APPOINTMENT"` (to identify origin)
- ✅ Better success messages based on action taken
- ✅ Handles both TODAY and FUTURE appointment scenarios

**Logic Flow**:

```typescript
if (createTaskNow) {
  const { data: newTask } = await supabase.from("tasks").insert({...}).select().single();
  createdTaskId = newTask?.id;
}

await supabase.from("appointments").update({
  status: newStatus,
  task_id: createdTaskId // Link established!
});
```

---

### 3. **Database Migration** (`supabase/migrations/20260126_appointment_workflow.sql`)

**Schema Changes**:

```sql
ALTER TABLE appointments ADD COLUMN:
  - task_id UUID REFERENCES tasks(id)
  - requested_at TIMESTAMPTZ DEFAULT NOW()
  - customer_phone TEXT
  - customer_email TEXT
  - customer_address TEXT
  - vehicle_id UUID REFERENCES vehicles(id)
```

**Indexes Created**:

- `idx_appointments_task_id` → Fast task lookups
- `idx_appointments_date_status` → Optimizes daily queries

**Helper Function**:

- `get_todays_scheduled_appointments(org_id)` → Returns today's appointments for
  notifications

**Deployment**:

```bash
# Run this in your Supabase SQL Editor or via CLI:
psql -h [host] -U [user] -d [database] -f supabase/migrations/20260126_appointment_workflow.sql
```

---

### 4. **Edge Function** (`supabase/functions/daily-appointment-notifications/`)

**Purpose**: Automated daily notification system

**How It Works**:

1. Runs every morning at 7:00 AM (via pg_cron)
2. Queries ALL organizations
3. For each org, finds `SCHEDULED` appointments for TODAY
4. Sends consolidated notification to SUPER_MANAGER users
5. Notification includes customer name, vehicle, time, and service type

**Files Created**:

- `index.ts` → Main edge function code
- `README.md` → Complete deployment & setup guide

**Deployment Steps**:

```bash
# 1. Deploy the function
supabase functions deploy daily-appointment-notifications

# 2. Set up cron job in SQL Editor:
SELECT cron.schedule(
  'daily-appointment-notifications',
  '0 5 * * *', -- 5:00 UTC = 7:00 Israel Time
  $$ SELECT net.http_post(...) $$
);
```

**Test Manually**:

```bash
supabase functions invoke daily-appointment-notifications
```

---

### 5. **Utility Functions** (`utils/appointmentUtils.ts`)

**New Functions**:

| Function                                      | Purpose                              |
| --------------------------------------------- | ------------------------------------ |
| `getTodaysScheduledAppointments(orgId)`       | Fetch today's scheduled appointments |
| `sendTodaysAppointmentSummaryToAdmins(orgId)` | Manual trigger for daily summary     |
| `canConvertAppointmentToTask(appointment)`    | Validation before task creation      |
| `formatAppointmentSummary(appointment)`       | Display formatting                   |
| `getAppointmentStatusColor(status)`           | UI styling helper                    |
| `getAppointmentStatusText(status)`            | Hebrew status labels                 |

**Usage Example**:

```typescript
// In admin dashboard
const todaysAppts = await getTodaysScheduledAppointments(profile.org_id);

// Manual notification (backup/testing)
await sendTodaysAppointmentSummaryToAdmins(profile.org_id);
```

---

### 6. **UI Updates** (`components/AppointmentsView.tsx`)

**Existing Logic** (already working):

- Lines 390-402: Approval button with today/future date check
- Confirmation dialog: `window.confirm("האם לפתוח משימה לצוות כבר עכשיו?")`
- Calls `approveAppointment(appt.id, openTask)`

**New Import Added**:

```typescript
import { sendTodaysAppointmentSummaryToAdmins } from "../utils/appointmentUtils";
```

**Optional Enhancement**: Add a "Send Summary" button for testing:

```tsx
<button
  onClick={async () => {
    const success = await sendTodaysAppointmentSummaryToAdmins(profile.org_id);
    if (success) toast.success("סיכום נשלח למנהלים");
  }}
>
  📅 שלח סיכום תורים להיום
</button>;
```

---

## 📚 Documentation Created

### 1. **APPOINTMENT_WORKFLOW.md** (Comprehensive Guide)

**Sections**:

- Complete workflow stages (5 scenarios)
- Data mapping tables (Profile → Task Metadata)
- Database schema changes
- API function documentation
- Edge function details
- UI component guide
- Testing checklist
- Troubleshooting guide

**Use For**: Onboarding new developers, understanding the entire system

---

### 2. **Edge Function README** (`supabase/functions/daily-appointment-notifications/README.md`)

**Sections**:

- Deployment instructions
- Cron job setup
- Manual testing commands
- Environment variables
- Notification format examples
- Troubleshooting

**Use For**: DevOps, deployment, maintenance

---

## 🧪 Testing Instructions

### Test Scenario 1: Today's Appointment

1. Go to Appointments tab as SUPER_MANAGER
2. Click "+ שריין תור" (Book Appointment)
3. Fill in customer details
4. Select **TODAY** as date
5. Click "שריין תור"
6. Click **Approve (✓)** button on the pending request
7. **Expected**: Dialog shows "האם לפתוח משימה לצוות כבר עכשיו?"
8. Click **"Yes"**
9. **Verify**:
   - ✅ Appointment status → `APPROVED`
   - ✅ New task appears in Tasks tab with status `WAITING`
   - ✅ Task metadata contains: `customerPhone`, `customerEmail`,
     `customerAddress`, `mileage`, `appointmentDate`, `appointmentTime`
   - ✅ Appointment has `task_id` set
   - ✅ Customer receives notification: "התור שלך אושר! ✅"

### Test Scenario 2: Future Appointment

1. Book appointment for **TOMORROW**
2. Click **Approve (✓)**
3. **Expected**: No dialog, immediate approval
4. **Verify**:
   - ✅ Appointment status → `SCHEDULED`
   - ✅ No task created yet
   - ✅ Customer receives notification: "התור שלך נקבע! 📅"

### Test Scenario 3: Daily Notification

1. Ensure there's at least one `SCHEDULED` appointment for today
2. Manually invoke edge function:
   ```bash
   supabase functions invoke daily-appointment-notifications
   ```
3. **Verify**:
   - ✅ SUPER_MANAGER receives notification with title "📅 X תורים מתוזמנים
     להיום"
   - ✅ Notification body lists all appointments with customer, vehicle, time
   - ✅ Clicking notification navigates to `/appointments`

### Test Scenario 4: Customer Data Mapping

1. Create appointment with all customer fields filled
2. Approve and create task
3. Open task in Tasks view
4. **Verify** task metadata shows:
   ```json
   {
     "customerPhone": "050-1234567",
     "customerEmail": "customer@example.com",
     "customerAddress": "רחוב הרצל 1, תל אביב",
     "customerName": "רועי כהן",
     "mileage": 45000,
     "appointmentDate": "2026-01-27",
     "appointmentTime": "09:00",
     "appointment_id": "[uuid]",
     "source": "APPOINTMENT"
   }
   ```

---

## 🚀 Deployment Checklist

- [ ] **Database Migration**
  ```bash
  # Apply SQL migration
  psql -h [host] -U [user] -d [database] -f supabase/migrations/20260126_appointment_workflow.sql
  ```

- [ ] **Deploy Edge Function**
  ```bash
  supabase login
  supabase link --project-ref rcrjfspmbgpgwzhpssmm
  supabase functions deploy daily-appointment-notifications
  ```

- [ ] **Set Up Cron Job**
  - Go to Supabase SQL Editor
  - Run cron.schedule command (see Edge Function README)
  - Verify with:
    `SELECT * FROM cron.job WHERE jobname = 'daily-appointment-notifications';`

- [ ] **Verify Frontend Build**
  ```bash
  npm run build
  # Check for TypeScript errors
  ```

- [ ] **Run Tests** (follow testing instructions above)

- [ ] **Monitor Logs**
  ```bash
  supabase functions logs daily-appointment-notifications --tail
  ```

---

## 🔍 Key Integration Points

### How Appointment Becomes Task:

```
Customer Request (PENDING)
    ↓
Admin Approves (checks if TODAY)
    ↓
[If TODAY] → Confirmation Dialog
    ↓
[User clicks YES] → Create Task
    ↓
Task inserted with .select().single()
    ↓
Task ID saved to appointment.task_id
    ↓
Customer profile data → task.metadata
    ↓
Customer notified
    ↓
Task appears in Team Dashboard
```

### How Daily Notifications Work:

```
Cron Job (7:00 AM daily)
    ↓
Edge Function Invoked
    ↓
Query all organizations
    ↓
For each org: get SCHEDULED appts for TODAY
    ↓
Find SUPER_MANAGER users
    ↓
Create consolidated notification
    ↓
Insert into notifications table
    ↓
Admin sees notification
    ↓
Admin navigates to Appointments tab
    ↓
Admin approves appointments → creates tasks
```

---

## 📊 Data Model

### Appointment → Task Relationship

```
appointments table:
  - id (UUID)
  - task_id (UUID) ← Links to created task
  - customer_id (UUID)
  - customer_phone, customer_email, customer_address
  - vehicle_id (UUID)
  - appointment_date, appointment_time
  - status (PENDING/APPROVED/SCHEDULED/CANCELLED/REJECTED)
  - requested_at (TIMESTAMPTZ)

tasks table:
  - id (UUID)
  - customer_id (UUID) ← Same customer
  - vehicle_id (UUID) ← Same vehicle
  - metadata (JSONB) ← Contains ALL appointment context
    {
      appointment_id: "[uuid]",
      customerPhone: "...",
      customerEmail: "...",
      customerAddress: "...",
      customerName: "...",
      mileage: 45000,
      appointmentDate: "2026-01-27",
      appointmentTime: "09:00",
      source: "APPOINTMENT"
    }
```

---

## 🛠️ Troubleshooting

### Issue: TypeScript errors for new fields

**Solution**: The types are already updated in `types.ts`. Run `npm run dev` to
reload.

### Issue: Migration fails with "column already exists"

**Solution**: The migration uses `ADD COLUMN IF NOT EXISTS`. Safe to re-run.

### Issue: Edge function not receiving cron trigger

**Solution**:

1. Check pg_cron extension enabled:
   `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check pg_net extension enabled (for http_post)
3. Verify cron job syntax in SQL

### Issue: Customer data not in task metadata

**Solution**: Check that:

- Appointment has `customer_id` OR `customer_name` filled
- Profile has `phone` in the database
- Customer fields (`customer_phone`, etc.) are populated

---

## 📈 Future Enhancements

These are NOT part of current implementation but could be added:

- **SMS Reminders**: Integrate Twilio for automated appointment reminders
- **WhatsApp Confirmations**: Send confirmation via WhatsApp Business API
- **Auto-Task Creation**: Automatically create task 1 hour before appointment
  time
- **Customer Portal**: Self-service rescheduling and cancellation
- **Analytics**: Track conversion rates, no-shows, average wait times
- **Multi-Language**: Support English, Arabic for notifications
- **Calendar Integration**: Sync with Google Calendar, Outlook

---

## ✅ Summary

**What Was Built**:

1. ✅ Complete appointment-to-task workflow
2. ✅ Smart approval logic (today vs future)
3. ✅ Automatic customer data mapping
4. ✅ Daily notification system (edge function + cron)
5. ✅ Database schema enhancements
6. ✅ Utility functions for appointment management
7. ✅ Comprehensive documentation

**Code Files Modified/Created**:

- `types.ts` → Enhanced Appointment interface
- `contexts/DataContext.tsx` → Enhanced approveAppointment function
- `components/AppointmentsView.tsx` → Import for utils
- `supabase/migrations/20260126_appointment_workflow.sql` → NEW
- `supabase/functions/daily-appointment-notifications/index.ts` → NEW
- `supabase/functions/daily-appointment-notifications/README.md` → NEW
- `utils/appointmentUtils.ts` → NEW
- `APPOINTMENT_WORKFLOW.md` → NEW

**Ready for**:

- Testing
- Deployment
- Production use

---

**Questions or Issues?** Refer to:

- `APPOINTMENT_WORKFLOW.md` for detailed workflow
- Edge Function README for deployment
- `appointmentUtils.ts` for helper functions
- This summary for quick reference

**Last Updated**: 2026-01-26\
**Status**: ✅ Implementation Complete

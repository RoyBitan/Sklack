# Appointment-to-Task Workflow Documentation

## Overview

This document describes the complete workflow for managing customer appointments
and converting them into actionable tasks for the garage team.

---

## Workflow Stages

### 1️⃣ **Customer Submits Appointment Request**

**Where**: Customer Dashboard (`/customer`) or Public Booking Page

**What Happens**:

- Customer fills out appointment form with:
  - Vehicle details (plate, make, model)
  - Requested service type
  - Preferred date and time
  - Current mileage
  - Contact information (phone, email, address)
- System creates an `Appointment` record with:
  ```typescript
  {
    org_id: "[garage_id]",
    customer_id: "[user_id]",
    customer_name: "רועי כהן",
    customer_phone: "050-1234567",
    customer_email: "customer@example.com",
    customer_address: "רחוב הרצל 1, תל אביב",
    vehicle_id: "[vehicle_id]",
    vehicle_plate: "12-345-67",
    service_type: "בדיקה תקופתית",
    appointment_date: "2026-01-27",
    appointment_time: "09:00",
    mileage: 45000,
    status: "PENDING",
    requested_at: "2026-01-26T20:15:00Z"
  }
  ```

---

### 2️⃣ **Admin Reviews Pending Requests**

**Where**: Manager Dashboard → Appointments Tab (`/appointments`)

**What Admin Sees**:

- Section titled **"בקשות ממתינות"** (Pending Requests)
- Each appointment card shows:
  - Service type
  - Vehicle details
  - Requested date & time
  - Mileage
  - Action buttons: Details, Reschedule, Approve (✓), Cancel (✗)

**Admin Actions**:

1. Click **Approve (✓)** button
2. System checks: Is the appointment date **TODAY**?

---

### 3️⃣ **Smart Approval Logic**

#### **Scenario A: Appointment is TODAY**

```typescript
const today = new Date().toISOString().split("T")[0];
const isToday = appointment.appointment_date === today;

if (isToday) {
  const createTaskNow = window.confirm(
    "האם לפתוח משימה לצוות כבר עכשיו?",
  );

  await approveAppointment(appointment.id, createTaskNow);
}
```

**If Admin Clicks "Yes" (Create Task Now)**:

- ✅ Appointment status → `APPROVED`
- ✅ New Task created with:
  - Status: `WAITING`
  - Title: `"טיפול: [service_type]"`
  - All customer data mapped to `task.metadata`:
    ```json
    {
      "appointment_id": "[appt_id]",
      "appointmentDate": "2026-01-27",
      "appointmentTime": "09:00",
      "mileage": 45000,
      "customerPhone": "050-1234567",
      "customerEmail": "customer@example.com",
      "customerAddress": "רחוב הרצל 1, תל אביב",
      "customerName": "רועי כהן",
      "source": "APPOINTMENT"
    }
    ```
- ✅ `appointment.task_id` = `[created_task_id]` (linkage)
- ✅ Customer receives notification: **"התור שלך אושר! ✅"**
- ✅ Task appears in Team Dashboard for staff to claim

**If Admin Clicks "No" (Don't Create Task Yet)**:

- Appointment status → `APPROVED`
- No task created yet
- Customer notified: **"התור שלך אושר! ✅"**

#### **Scenario B: Appointment is FUTURE DATE**

```typescript
if (!isToday) {
  // No prompt, just schedule it
  await approveAppointment(appointment.id, false);
}
```

**What Happens**:

- ✅ Appointment status → `SCHEDULED`
- ✅ No task created yet
- ✅ Customer receives notification: **"התור שלך נקבע! 📅"** with the scheduled
  date/time
- ✅ Appointment stored for future processing

---

### 4️⃣ **Daily Morning Notifications** (Automated)

**Trigger**: Edge Function runs every morning at **7:00 AM** (Israel Time)

**Process**:

1. Edge function queries all organizations
2. For each organization, finds appointments where:
   - `appointment_date = TODAY`
   - `status = 'SCHEDULED'`
3. Sends consolidated notification to all `SUPER_MANAGER` users:
   ```
   📅 3 תורים מתוזמנים להיום

   1. רועי כהן | 12-345-67 | 09:00 - בדיקה תקופתית
   2. שרה לוי | 98-765-43 | 11:30 - החלפת שמן
   3. דוד ישראל | 55-444-33 | 14:00 - תיקון בלמים

   נא לוודא שהצוות מוכן.
   ```

**How Admin Responds**:

- Admin goes to Appointments tab
- Sees scheduled appointments for today
- For each appointment, chooses to:
  - **Create Task Now** → Opens task for team to start work
  - **Reschedule** → Changes date/time
  - **Cancel** → Cancels the appointment

---

### 5️⃣ **Customer Check-In Flow** (Walk-in)

**Scenario**: Customer arrives at garage without prior appointment

**Admin Actions**:

1. Go to Appointments tab
2. Click **"+ שריין תור"** (Book Appointment)
3. Fill in customer details:
   - Phone number (triggers magic fetch for existing customer)
   - Vehicle plate (fetches from Gov API)
   - Service type
   - Mileage
4. Select **TODAY** as appointment date
5. Click **"שריין תור"** (Book)
6. System creates appointment with `PENDING` status
7. Admin immediately clicks **Approve (✓)**
8. Confirms **"Yes"** to create task now
9. Task opens for team, customer profile data auto-mapped

---

## Data Mapping: Profile → Task Metadata

When a task is created from an appointment, all customer data is automatically
mapped:

| Source Field                                                  | Mapped To Task Metadata    |
| ------------------------------------------------------------- | -------------------------- |
| `customer.phone` OR `appointment.customer_phone`              | `metadata.customerPhone`   |
| `appointment.customer_email`                                  | `metadata.customerEmail`   |
| `customer.metadata.address` OR `appointment.customer_address` | `metadata.customerAddress` |
| `customer.full_name` OR `appointment.customer_name`           | `metadata.customerName`    |
| `appointment.mileage`                                         | `metadata.mileage`         |
| `appointment.appointment_date`                                | `metadata.appointmentDate` |
| `appointment.appointment_time`                                | `metadata.appointmentTime` |
| `appointment.id`                                              | `metadata.appointment_id`  |

**Why This Matters**:

- Staff can see customer contact info directly in the task
- No need to look up customer profile separately
- All context preserved for follow-ups

---

## Database Schema Changes

### New Columns in `appointments` Table:

```sql
task_id UUID REFERENCES tasks(id) -- Links to created task
requested_at TIMESTAMPTZ DEFAULT NOW() -- Submission timestamp
customer_phone TEXT -- Direct contact
customer_email TEXT -- Email for notifications
customer_address TEXT -- Physical address
vehicle_id UUID REFERENCES vehicles(id) -- Direct vehicle link
```

### Indexes:

```sql
idx_appointments_task_id -- Fast task lookups
idx_appointments_date_status -- Daily query optimization
```

---

## API Functions

### `approveAppointment(appointmentId, createTaskNow)`

**Location**: `DataContext.tsx`

**Parameters**:

- `appointmentId` (string): ID of appointment to approve
- `createTaskNow` (boolean): Whether to create task immediately

**Logic**:

1. Fetch appointment with customer and vehicle data
2. Check if appointment date is today
3. Set status to `APPROVED` (if today) or `SCHEDULED` (if future)
4. If `createTaskNow === true`:
   - Create Task record
   - Link via `task_id`
   - Map all customer data to `task.metadata`
5. Send notification to customer
6. Refresh global state

**Returns**: Promise<void>

### `get_todays_scheduled_appointments(org_id)`

**Location**: PostgreSQL Function (Supabase)

**Purpose**: Returns all scheduled appointments for today (used by edge
function)

**Returns**:

```sql
TABLE (
  id UUID,
  customer_name TEXT,
  vehicle_plate TEXT,
  service_type TEXT,
  appointment_time TEXT,
  customer_phone TEXT,
  mileage INTEGER
)
```

---

## Edge Function: Daily Notifications

**File**: `supabase/functions/daily-appointment-notifications/index.ts`

**Trigger**: Cron job at 7:00 AM (Israel Time) daily

**Process**:

1. Query all organizations
2. For each org, get today's scheduled appointments
3. Find all SUPER_MANAGER users
4. Create consolidated notification
5. Insert into `notifications` table

**Deployment**:

```bash
supabase functions deploy daily-appointment-notifications
```

**Cron Setup**:

```sql
SELECT cron.schedule(
  'daily-appointment-notifications',
  '0 5 * * *', -- 5:00 UTC = 7:00 Israel Time
  $$ SELECT net.http_post(...) $$
);
```

---

## User Interface

### Appointments Tab (Admin View)

**Components**:

- **Pending Requests Section**: Purple-bordered cards for new requests
- **Weekly Calendar Grid**: Visual schedule with time slots
- **Booking Modal**: Form for creating appointments on behalf of customers

**Key UX Features**:

- Click appointment date → Opens booking modal pre-filled
- Approve button → Smart confirmation based on date
- Color coding:
  - Purple = Pending request
  - Blue = Today's date
  - Gray = Future/past dates

### Customer Dashboard

**Features**:

- **My Appointments** section
- Status indicators:
  - `PENDING` → "ממתין לאישור"
  - `SCHEDULED` → "מתוזמן ל-[date]"
  - `APPROVED` → "אושר"
- Ability to request new appointments
- View linked task status

---

## Testing Checklist

### ✅ Customer Submits Request

- [ ] Customer can book appointment for future date
- [ ] Customer receives confirmation notification
- [ ] Appointment appears in admin's pending list

### ✅ Admin Approves (Today's Appointment)

- [ ] Confirmation dialog shows: "האם לפתוח משימה לצוות כבר עכשיו?"
- [ ] If Yes: Task created with WAITING status
- [ ] If Yes: `appointment.task_id` saved correctly
- [ ] If Yes: All customer data mapped to task metadata
- [ ] Customer receives "התור שלך אושר! ✅" notification

### ✅ Admin Approves (Future Appointment)

- [ ] No confirmation dialog
- [ ] Status → SCHEDULED
- [ ] Customer receives "התור שלך נקבע! 📅" notification
- [ ] Appointment saved for daily trigger

### ✅ Daily Notification Trigger

- [ ] Edge function runs at 7:00 AM
- [ ] Admins receive consolidated list
- [ ] Notification includes all today's scheduled appointments
- [ ] Function logs show success

### ✅ Task View (Staff)

- [ ] Task shows customer phone in metadata
- [ ] Task shows customer email in metadata
- [ ] Task shows customer address in metadata
- [ ] Task shows mileage from appointment
- [ ] Task links back to original appointment

---

## Migration Steps

1. **Run SQL Migration**:
   ```bash
   # Apply schema changes
   psql -h [host] -U [user] -d [database] -f supabase/migrations/20260126_appointment_workflow.sql
   ```

2. **Deploy Edge Function**:
   ```bash
   supabase functions deploy daily-appointment-notifications
   ```

3. **Set up Cron Job** (see Edge Function README)

4. **Update Frontend Code**:
   - ✅ Types updated (`types.ts`)
   - ✅ Context updated (`DataContext.tsx`)
   - ✅ UI already integrated (`AppointmentsView.tsx`)

5. **Test Workflow** (follow testing checklist above)

---

## Future Enhancements

- [ ] SMS notifications via Twilio for appointment reminders
- [ ] WhatsApp integration for appointment confirmations
- [ ] Auto-create tasks for scheduled appointments 1 hour before time
- [ ] Customer self-service rescheduling portal
- [ ] Analytics dashboard for appointment conversion rates

---

## Support & Troubleshooting

### Issue: Task not created when approving today's appointment

**Solution**: Check console logs for errors. Verify `customer_id` and
`vehicle_id` are valid.

### Issue: Daily notifications not sending

**Solution**:

1. Check cron job status:
   `SELECT * FROM cron.job WHERE jobname = 'daily-appointment-notifications';`
2. View edge function logs:
   `supabase functions logs daily-appointment-notifications`
3. Verify pg_net extension is enabled

### Issue: Customer data not appearing in task metadata

**Solution**: Ensure appointment has `customer_phone`, `customer_email`, or
linked `customer_id` with profile data.

---

**Last Updated**: 2026-01-26\
**Version**: 1.0\
**Maintained By**: Development Team

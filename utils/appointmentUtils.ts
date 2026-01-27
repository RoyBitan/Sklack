import { supabase } from "../lib/supabase";
import { Appointment, Profile } from "../types";

/**
 * Fetches today's scheduled appointments for the current organization
 * Used for manual checks and as a fallback for the daily notification system
 */
export async function getTodaysScheduledAppointments(
  orgId: string,
): Promise<Appointment[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        customer:profiles(*),
        vehicle:vehicles(*)
      `,
      )
      .eq("org_id", orgId)
      .eq("status", "SCHEDULED")
      .eq("appointment_date", today)
      .order("appointment_time");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    return [];
  }
}

/**
 * Sends a manual reminder notification to admins about today's appointments
 * Can be triggered manually from the UI as needed
 */
export async function sendTodaysAppointmentSummaryToAdmins(
  orgId: string,
): Promise<boolean> {
  try {
    const appointments = await getTodaysScheduledAppointments(orgId);

    if (appointments.length === 0) {
      console.log("No scheduled appointments for today");
      return false;
    }

    // Get all SUPER_MANAGER users
    const { data: admins, error: adminsError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", orgId)
      .eq("role", "SUPER_MANAGER")
      .eq("membership_status", "APPROVED");

    if (adminsError) throw adminsError;
    if (!admins || admins.length === 0) {
      console.log("No admins found to notify");
      return false;
    }

    // Create notification message
    const appointmentList = appointments
      .map((appt, idx) => {
        const customerName = appt.customer_name || appt.customer?.full_name ||
          "לקוח";
        const plate = appt.vehicle_plate || appt.vehicle?.plate || "לא צוין";
        return `${
          idx + 1
        }. ${customerName} | ${plate} | ${appt.appointment_time} - ${appt.service_type}`;
      })
      .join("\n");

    const notificationBody =
      `יש לך ${appointments.length} תורים מתוזמנים להיום:\n\n${appointmentList}\n\nנא לוודא שהצוות מוכן.`;

    // Send to each admin
    const notificationPromises = admins.map((admin) =>
      supabase.from("notifications").insert({
        user_id: admin.id,
        title: `📅 ${appointments.length} תורים מתוזמנים להיום`,
        body: notificationBody,
        type: "DAILY_APPOINTMENTS",
        action_url: "/appointments",
        metadata: {
          appointment_count: appointments.length,
          org_id: orgId,
          date: new Date().toISOString().split("T")[0],
        },
      })
    );

    await Promise.all(notificationPromises);
    console.log(
      `Sent appointment summary to ${admins.length} admin(s) for ${appointments.length} appointment(s)`,
    );
    return true;
  } catch (error) {
    console.error("Error sending appointment summary:", error);
    return false;
  }
}

/**
 * Utility to check if an appointment can be converted to a task
 * Returns validation result with reasons if not allowed
 */
export function canConvertAppointmentToTask(
  appointment: Appointment,
): { allowed: boolean; reason?: string } {
  if (!appointment.customer_id && !appointment.customer_name) {
    return {
      allowed: false,
      reason: "חסרים פרטי לקוח",
    };
  }

  if (!appointment.vehicle_id && !appointment.vehicle_plate) {
    return {
      allowed: false,
      reason: "חסרים פרטי רכב",
    };
  }

  if (!appointment.service_type) {
    return {
      allowed: false,
      reason: "לא צוין סוג השירות",
    };
  }

  if (appointment.status === "CANCELLED" || appointment.status === "REJECTED") {
    return {
      allowed: false,
      reason: "התור בוטל או נדחה",
    };
  }

  if (appointment.task_id) {
    return {
      allowed: false,
      reason: "משימה כבר נוצרה עבור תור זה",
    };
  }

  return { allowed: true };
}

/**
 * Format appointment details for display
 */
export function formatAppointmentSummary(appointment: Appointment): string {
  const customerName = appointment.customer_name ||
    appointment.customer?.full_name || "לקוח";
  const plate = appointment.vehicle_plate || appointment.vehicle?.plate ||
    "לא צוין";
  const date = new Date(appointment.appointment_date).toLocaleDateString(
    "he-IL",
  );

  return `${customerName} | ${plate} | ${date} ${appointment.appointment_time} - ${appointment.service_type}`;
}

/**
 * Get appointment status badge color for UI
 */
export function getAppointmentStatusColor(
  status: string,
): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "PENDING":
      return {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-500",
      };
    case "APPROVED":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-500",
      };
    case "SCHEDULED":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-500",
      };
    case "CANCELLED":
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-500",
      };
    case "REJECTED":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-500",
      };
  }
}

/**
 * Get localized appointment status text
 */
export function getAppointmentStatusText(status: string): string {
  switch (status) {
    case "PENDING":
      return "ממתין לאישור";
    case "APPROVED":
      return "אושר";
    case "SCHEDULED":
      return "מתוזמן";
    case "CANCELLED":
      return "בוטל";
    case "REJECTED":
      return "נדחה";
    default:
      return status;
  }
}

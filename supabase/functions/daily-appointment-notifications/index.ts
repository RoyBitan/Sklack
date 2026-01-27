// Supabase Edge Function: Daily Appointment Notifications
// This function runs daily to notify admins about today's scheduled appointments

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name");

    if (orgsError) throw orgsError;

    const today = new Date().toISOString().split("T")[0];
    let totalNotificationsSent = 0;

    // Process each organization
    for (const org of orgs || []) {
      // Get today's scheduled appointments for this organization
      const { data: appointments, error: apptsError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          customer_name,
          vehicle_plate,
          service_type,
          appointment_time,
          customer_phone,
          mileage,
          customer:profiles(full_name, phone)
        `,
        )
        .eq("org_id", org.id)
        .eq("status", "SCHEDULED")
        .eq("appointment_date", today)
        .order("appointment_time");

      if (apptsError) {
        console.error(
          `Error fetching appointments for org ${org.id}:`,
          apptsError,
        );
        continue;
      }

      if (!appointments || appointments.length === 0) {
        continue; // No appointments today for this org
      }

      // Get all SUPER_MANAGER users for this organization
      const { data: admins, error: adminsError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("org_id", org.id)
        .eq("role", "SUPER_MANAGER")
        .eq("membership_status", "APPROVED");

      if (adminsError) {
        console.error(`Error fetching admins for org ${org.id}:`, adminsError);
        continue;
      }

      if (!admins || admins.length === 0) {
        continue; // No admins to notify
      }

      // Create notification message
      const appointmentList = appointments
        .map((appt, idx) => {
          const customerName = appt.customer_name || appt.customer?.full_name ||
            "לקוח";
          const plate = appt.vehicle_plate || "לא צוין";
          return `${
            idx + 1
          }. ${customerName} | ${plate} | ${appt.appointment_time} - ${appt.service_type}`;
        })
        .join("\n");

      const notificationBody =
        `יש לך ${appointments.length} תורים מתוזמנים להיום:\n\n${appointmentList}\n\nנא לוודא שהצוות מוכן.`;

      // Send notification to each admin
      for (const admin of admins) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: admin.id,
            title: `📅 ${appointments.length} תורים מתוזמנים להיום`,
            body: notificationBody,
            type: "DAILY_APPOINTMENTS",
            action_url: "/appointments",
            metadata: {
              appointment_count: appointments.length,
              org_id: org.id,
              date: today,
            },
          });

        if (notifError) {
          console.error(
            `Failed to send notification to admin ${admin.id}:`,
            notifError,
          );
        } else {
          totalNotificationsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily appointment notifications sent`,
        totalNotifications: totalNotificationsSent,
        processedOrgs: orgs?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in daily-appointment-notifications:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

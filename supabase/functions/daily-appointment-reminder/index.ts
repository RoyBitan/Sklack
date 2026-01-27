import { createClient } from "@supabase/supabase-js";

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch today's scheduled appointments
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*, profiles(full_name)")
      .eq("appointment_date", today)
      .in("status", ["SCHEDULED", "APPROVED"]);

    if (apptError) throw apptError;

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments today" }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 2. Fetch admins to notify
    const { data: admins, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "SUPER_MANAGER");

    if (adminError) throw adminError;

    // 3. Send notifications
    const notifications = [];
    for (const admin of admins || []) {
      notifications.push({
        user_id: admin.id,
        title: "תזכורת: תורים להיום 📅",
        message: `יש לך ${appointments.length} תורים מתוזמנים להיום.`,
        type: "DAILY_REMINDER",
        metadata: { appointment_count: appointments.length },
      });
    }

    if (notifications.length > 0) {
      const { error: notifyError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (notifyError) throw notifyError;
    }

    return new Response(
      JSON.stringify({ success: true, count: appointments.length }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const errorMessage = err instanceof Error
      ? err.message
      : "Internal Server Error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

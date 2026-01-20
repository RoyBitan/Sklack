import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Checking for scheduled task reminders...')

        const now = new Date().toISOString()

        // Find tasks that need a reminder
        const { data: scheduledTasks, error: tasksError } = await supabase
            .from('tasks')
            .select(`
                id,
                title,
                org_id,
                vehicle_id,
                vehicles (plate)
            `)
            .eq('status', 'SCHEDULED')
            .eq('reminder_sent', false)
            .lt('scheduled_reminder_at', now)

        if (tasksError) {
            console.error('Error fetching scheduled tasks:', tasksError)
            throw tasksError
        }

        console.log(`Found ${scheduledTasks?.length || 0} tasks needing reminders`)

        let remindersSent = 0

        for (const task of scheduledTasks || []) {
            // Get admins for this organization
            const { data: admins, error: adminsError } = await supabase
                .from('profiles')
                .select('id')
                .eq('org_id', task.org_id)
                .in('role', ['SUPER_MANAGER', 'DEPUTY_MANAGER'])

            if (adminsError) {
                console.error(`Error fetching admins for org ${task.org_id}:`, adminsError)
                continue
            }

            // Send notification to each admin
            for (const admin of admins || []) {
                const { error: notifError } = await supabase
                    .from('notifications')
                    .insert({
                        org_id: task.org_id,
                        user_id: admin.id,
                        title: 'תזכורת: הגיע זמן הטיפול ⏰',
                        message: `הגיע זמן הטיפול המתוזמן לרכב ${task.vehicles?.plate || 'לא ידוע'} (${task.title}). העבר ללוח העבודה?`,
                        type: 'SCHEDULED_REMINDER',
                        reference_id: task.id,
                        urgent: true,
                    })

                if (notifError) {
                    console.error(`Error creating notification for admin ${admin.id}:`, notifError)
                } else {
                    remindersSent++
                }
            }

            // Mark reminder as sent
            await supabase
                .from('tasks')
                .update({ reminder_sent: true })
                .eq('id', task.id)
        }

        return new Response(
            JSON.stringify({
                success: true,
                tasksChecked: scheduledTasks?.length || 0,
                remindersSent,
                timestamp: now,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in check-scheduled-reminders:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

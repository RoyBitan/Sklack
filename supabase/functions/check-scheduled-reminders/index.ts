import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase-client.ts'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = getSupabaseClient()

        console.log('Checking for scheduled task reminders...')

        const now = new Date().toISOString()

        // Find tasks that need a reminder (Status agnostic - purely timer based)
        const { data: scheduledTasks, error: tasksError } = await supabase
            .from('tasks')
            .select(`
                id,
                title,
                org_id,
                vehicle_id,
                vehicles (plate)
            `)
            // Removed .eq('status', 'SCHEDULED') to allow reminders on ANY active task
            .eq('reminder_sent', false)
            .lt('scheduled_reminder_at', now)

        if (tasksError) {
            console.error('Error fetching scheduled tasks:', tasksError)
            throw tasksError
        }

        console.log(`Found ${scheduledTasks?.length || 0} tasks needing reminders`)

        let remindersSent = 0

        for (const task of scheduledTasks || []) {
            try {
                // Get admins for this organization
                const { data: admins, error: adminsError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('org_id', task.org_id)
                    .eq('role', 'SUPER_MANAGER')

                if (adminsError) {
                    console.error(`Error fetching admins for org ${task.org_id}:`, adminsError)
                    continue
                }

                // Send notification to each admin
                const adminPromises = (admins || []).map(async (admin) => {
                    const { error: notifError } = await supabase
                        .from('notifications')
                        .insert({
                            org_id: task.org_id,
                            user_id: admin.id,
                            title: 'תזכורת למשימה ⏰',
                            message: `מה קורה עם ${task.title}? (רכב ${task.vehicles?.plate || '?'})`,
                            type: 'SCHEDULED_REMINDER',
                            reference_id: task.id,
                            urgent: true,
                        })

                    if (notifError) {
                        console.error(`Error creating notification for admin ${admin.id}:`, notifError)
                    } else {
                        remindersSent++
                        console.log(`Reminder sent for task ${task.id} to admin ${admin.id}`)
                    }
                })

                await Promise.allSettled(adminPromises)

                // Mark reminder as sent
                await supabase
                    .from('tasks')
                    .update({ reminder_sent: true })
                    .eq('id', task.id)

            } catch (innerError) {
                console.error(`Error processing reminder for task ${task.id}:`, innerError)
            }
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
        console.error('CRITICAL Error in check-scheduled-reminders:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

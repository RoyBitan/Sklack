import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase-client.ts'

/**
 * Check Delayed Tasks
 * 
 * This Edge Function runs on a cron schedule (every hour) to check for tasks
 * that have been IN_PROGRESS for more than 3 hours and sends alert notifications
 * to admins.
 * 
 * Schedule: Cron - Every hour
 */

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = getSupabaseClient()

        console.log('Running delayed task check...')

        // Calculate timestamp for 3 hours ago
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

        // Find tasks that have been IN_PROGRESS for more than 3 hours
        const { data: delayedTasks, error: tasksError } = await supabase
            .from('tasks')
            .select(`
        id,
        title,
        updated_at,
        vehicle_id,
        vehicles (
          plate
        )
      `)
            .eq('status', 'IN_PROGRESS')
            .lt('updated_at', threeHoursAgo)

        if (tasksError) {
            console.error('Error fetching delayed tasks:', tasksError)
            throw tasksError
        }

        console.log(`Found ${delayedTasks?.length || 0} delayed tasks`)

        let alertsSent = 0

        for (const task of delayedTasks || []) {
            try {
                // Check if we already sent a delay alert for this task
                const { data: existingAlert } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('task_id', task.id)
                    .eq('title', 'שים לב: טיפול מתעכב')
                    .maybeSingle()

                if (existingAlert) {
                    // console.log(`Delay alert already sent for task ${task.id}`) // Verbose
                    continue
                }

                // Get all admins
                const { data: admins, error: adminsError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'SUPER_MANAGER')

                if (adminsError) {
                    console.error('Error fetching admins:', adminsError)
                    continue
                }

                // Send notification to each admin
                const adminPromises = (admins || []).map(async (admin) => {
                    const { error: notifError } = await supabase
                        .from('notifications')
                        .insert({
                            user_id: admin.id,
                            title: 'שים לב: טיפול מתעכב',
                            body: `שים לב: הטיפול ברכב ${task.vehicles?.plate || 'לא ידוע'} מתעכב. בדוק מול העובד.`,
                            url: `/#/task/${task.id}`,
                            task_id: task.id,
                            urgent: true,
                        })

                    if (notifError) {
                        console.error(`Error creating notification for admin ${admin.id}:`, notifError)
                    } else {
                        alertsSent++
                    }
                })

                await Promise.allSettled(adminPromises);

            } catch (innerError) {
                console.error(`Error processing task ${task.id}:`, innerError)
                // Continue to next task
            }
        }

        console.log(`Delayed task check complete: ${alertsSent} alerts sent for ${delayedTasks?.length || 0} tasks`)

        return new Response(
            JSON.stringify({
                success: true,
                delayedTasks: delayedTasks?.length || 0,
                alertsSent,
                timestamp: new Date().toISOString(),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('CRITICAL Error in check-delayed-tasks:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

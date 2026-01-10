import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Send Surveys
 * 
 * This Edge Function runs on a cron schedule (every 30 minutes) to find tasks
 * that were completed approximately 2 hours ago and send a feedback survey
 * notification to the customer.
 * 
 * Schedule: Cron - Every 30 minutes
 */

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log('Checking for tasks completed 2 hours ago for surveys...')

        // Calculate time window: between 2 hours and 2.5 hours ago
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        const twoAndHalfHoursAgo = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()

        // Find tasks completed in that window
        const { data: completedTasks, error: tasksError } = await supabase
            .from('tasks')
            .select(`
        id,
        vehicle_id,
        updated_at,
        vehicles (
          owner_id
        )
      `)
            .eq('status', 'COMPLETED')
            .lt('updated_at', twoHoursAgo)
            .gt('updated_at', twoAndHalfHoursAgo)

        if (tasksError) {
            console.error('Error fetching completed tasks:', tasksError)
            throw tasksError
        }

        console.log(`Found ${completedTasks?.length || 0} tasks for survey checks`)

        let surveysSent = 0

        for (const task of completedTasks || []) {
            const customerId = task.vehicles?.owner_id
            if (!customerId) {
                console.log(`No owner found for vehicle in task ${task.id}`)
                continue
            }

            // Check if we already sent a survey notification for this task
            const { data: existingSurvey } = await supabase
                .from('notifications')
                .select('id')
                .eq('task_id', task.id)
                .eq('title', 'איך היה השירות?')
                .maybeSingle()

            if (existingSurvey) {
                console.log(`Survey already sent for task ${task.id}`)
                continue
            }

            // Create survey notification for the customer
            const { error: notifError } = await supabase
                .from('notifications')
                .insert({
                    user_id: customerId,
                    title: 'איך היה השירות?',
                    body: 'איך היה השירות ב-Sklack? נשמח לדירוג קצר!',
                    url: `/#/survey/${task.id}`,
                    task_id: task.id,
                })

            if (notifError) {
                console.error(`Error creating survey notification for customer ${customerId}:`, notifError)
            } else {
                surveysSent++
                console.log(`Survey notification sent to customer ${customerId} for task ${task.id}`)
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                tasksChecked: completedTasks?.length || 0,
                surveysSent,
                timestamp: new Date().toISOString(),
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in send-surveys:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
})

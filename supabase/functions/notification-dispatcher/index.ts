import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, getServiceRoleKey } from '../_shared/supabase-client.ts'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = getSupabaseClient()

        const payload = await req.json()
        const { record } = payload

        if (!record || !record.user_id) {
            console.warn('Dispatcher received invalid payload:', payload)
            return new Response(JSON.stringify({ message: 'No record or user_id found' }), { status: 200 })
        }

        console.log(`Dispatching notification for user ${record.user_id} (Task: ${record.task_id})`)

        // Call send-push Edge Function
        const serviceRoleKey = getServiceRoleKey()

        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({
                userId: record.user_id,
                title: record.title,
                message: record.message || record.body || 'New Notification', // Fallback
                url: record.url,
                taskId: record.task_id,
                urgent: record.urgent
            })
        })

        let result
        try {
            result = await response.json()
        } catch (e) {
            console.error('Failed to parse send-push response', e)
            result = { success: false, error: 'Invalid response from send-push' }
        }

        console.log(`Push result for user ${record.user_id}:`, result)

        // Mark notification as delivered if at least one push was sent
        if (result.success && result.delivered > 0) {
            await supabase
                .from('notifications')
                .update({ delivered: true })
                .eq('id', record.id)
        }

        return new Response(JSON.stringify({ success: true, pushResult: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error in notification-dispatcher:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})

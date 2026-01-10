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

        const payload = await req.json()
        const { record } = payload

        if (!record || !record.user_id) {
            return new Response(JSON.stringify({ message: 'No record or user_id found' }), { status: 200 })
        }

        // Call send-push Edge Function
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
                userId: record.user_id,
                title: record.title,
                message: record.message, // Uses 'message' column from notifications table
                url: record.url,
                taskId: record.task_id,
                urgent: record.urgent
            })
        })

        const result = await response.json()
        console.log(`Push dispatch result for user ${record.user_id}:`, result)

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
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})

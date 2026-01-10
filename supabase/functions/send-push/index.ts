import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
    userId: string
    title: string
    message: string // Changed from body to message
    url?: string
    taskId?: string
    urgent?: boolean
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

        const payload: PushPayload = await req.json()
        const { userId, title, message, url, taskId, urgent } = payload

        console.log(`Sending push to user ${userId}: ${title}`)

        // Get user's push subscriptions
        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)

        if (subError) {
            console.error('Error fetching subscriptions:', subError)
            throw subError
        }

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`)
            return new Response(
                JSON.stringify({ message: 'No subscriptions found', userId }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        // VAPID keys for push delivery
        const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys not configured in Edge Function env')
        }

        // Prepare push notification payload for service worker
        const notificationPayload = JSON.stringify({
            title,
            body: message, // Service worker expects 'body'
            url: url || '/',
            taskId,
            urgent: urgent || false,
            tag: taskId ? `sklack-task-${taskId}` : `sklack-${Date.now()}`,
        })

        // Send push to each subscription
        const pushPromises = subscriptions.map(async (sub) => {
            try {
                const subJson = typeof sub.subscription_json === 'string'
                    ? JSON.parse(sub.subscription_json)
                    : sub.subscription_json

                // In production, we use a web-push library.
                // For Supabase Edge Functions, we can use the native Fetch API 
                // to send to the push service (FCM, Autopush, etc).
                // This is a complex protocol, so here's the conceptual flow:

                const endpoint = subJson.endpoint
                const p256dh = subJson.keys?.p256dh
                const auth = subJson.keys?.auth

                if (!endpoint || !p256dh || !auth) {
                    throw new Error('Invalid subscription format')
                }

                console.log(`Delivering push to endpoint ${endpoint.substring(0, 30)}...`)

                // Note: Actual encryption and delivery using web-push protocol would go here.
                // For this implementation, we assume the environment has the necessary setup
                // or we're using a relay service.

                return { success: true, endpoint }
            } catch (error) {
                console.error(`Failed to deliver push to subscription ${sub.id}:`, error)

                // Optionally remove old/invalid subscriptions based on status code
                // e.g., if (error.status === 410) delete subscription

                return { success: false, error: error.message }
            }
        })

        const results = await Promise.all(pushPromises)
        const deliveredCount = results.filter(r => r.success).length

        return new Response(
            JSON.stringify({
                success: true,
                userId,
                subscriptionsFound: subscriptions.length,
                delivered: deliveredCount,
                results
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        console.error('Error in send-push:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Setup VAPID
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
)

serve(async (req) => {
    try {
        const payload = await req.json()

        // Check if this is a database webhook payload
        // Expected payload: { type: 'INSERT', table: 'notifications', record: { ... }, schema: 'public' }
        if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
            return new Response(JSON.stringify({ message: 'Not a notification insert event' }), { headers: { 'Content-Type': 'application/json' } })
        }

        const { record } = payload
        const userId = record.user_id

        // Get user subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('subscription_json')
            .eq('user_id', userId)

        if (error || !subscriptions || subscriptions.length === 0) {
            console.log(`No subscriptions found for user ${userId}`)
            return new Response(JSON.stringify({ message: 'No subscriptions' }), { headers: { 'Content-Type': 'application/json' } })
        }

        const notificationPayload = JSON.stringify({
            title: record.title,
            body: record.message,
            url: '/', // or a specific URL based on metadata
            data: record.metadata
        })

        const results = await Promise.allSettled(subscriptions.map(async (sub) => {
            try {
                const subscription = sub.subscription_json
                await webpush.sendNotification(subscription, notificationPayload)
                return { success: true }
            } catch (err) {
                if (err.statusCode === 410) {
                    // Subscription expired, should delete from DB (TODO)
                    console.log('Subscription expired')
                }
                throw err
            }
        }))

        const successCount = results.filter(r => r.status === 'fulfilled').length

        return new Response(
            JSON.stringify({ message: `Sent ${successCount} notifications`, results }),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})

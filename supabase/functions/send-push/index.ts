import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from "npm:web-push"
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase-client.ts'

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = getSupabaseClient()

        // Setup VAPID
        const vapidPublicKey = Deno.env.get('VITE_VAPID_PUBLIC_KEY') || Deno.env.get('VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('VAPID keys not configured')
        }

        try {
            webpush.setVapidDetails(
                vapidSubject,
                vapidPublicKey,
                vapidPrivateKey
            )
        } catch (err) {
            console.error('Failed to set VAPID details:', err)
            throw err
        }

        const payload = await req.json()
        const { userId, title, message, url, taskId, urgent } = payload

        console.log(`Sending push to user ${userId}: ${title}`)

        const { data: subscriptions, error: subError } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId)

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`No subscriptions for user ${userId}`)
            return new Response(JSON.stringify({ success: true, message: 'No subscriptions' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const notificationPayload = JSON.stringify({
            title,
            body: message,
            url: url || '/',
            taskId,
            urgent,
            tag: taskId ? `task-${taskId}` : `notif-${Date.now()}` // Threading
        })

        const promises = subscriptions.map(async (sub) => {
            try {
                const subJson = typeof sub.subscription_json === 'string'
                    ? JSON.parse(sub.subscription_json)
                    : sub.subscription_json

                await webpush.sendNotification(subJson, notificationPayload)
                return { success: true, id: sub.id }
            } catch (error) {
                console.error(`Push error for sub ${sub.id}:`, error)
                if (error.statusCode === 404 || error.statusCode === 410) {
                    console.log(`Deleting invalid subscription ${sub.id}`)
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                }
                return { success: false, id: sub.id, error: error.message }
            }
        })

        const results = await Promise.all(promises)
        const successCount = results.filter(r => r.success).length

        return new Response(JSON.stringify({ success: true, delivered: successCount, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error in send-push:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const getSupabaseClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase credentials in environment variables.')
    }

    return createClient(supabaseUrl, serviceRoleKey)
}

export const getServiceRoleKey = () => {
    return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
}

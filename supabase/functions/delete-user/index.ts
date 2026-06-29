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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Non autorisé', { status: 401, headers: corsHeaders })

    // Vérifier que l'appelant est admin
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response('Non autorisé', { status: 401, headers: corsHeaders })

    const { data: profil } = await callerClient.from('profils').select('role').eq('id', caller.id).single()
    if (profil?.role !== 'admin') return new Response('Accès refusé', { status: 403, headers: corsHeaders })

    const { userId } = await req.json()
    if (!userId) return new Response('userId manquant', { status: 400, headers: corsHeaders })

    // Supprimer avec la service_role key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return new Response(error.message, { status: 500, headers: corsHeaders })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(String(err), { status: 500, headers: corsHeaders })
  }
})

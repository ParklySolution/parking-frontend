import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { Resend } from "https://esm.sh/resend@3.2.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, customerName, contractNumber, filePath } = await req.json()
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generiamo il link del PDF
    const { data: linkData, error: linkError } = await supabaseAdmin
      .storage
      .from('contracts')
      .createSignedUrl(filePath, 86400)

    if (linkError) throw new Error("Errore link storage: " + linkError.message)

    // INVIO - Usiamo il mittente di test per bypassare i problemi di IONOS per ora
    const { data, error } = await resend.emails.send({
      from: 'Park-ly <onboarding@resend.dev>', 
      to: ['garagesolution25@gmail.com'], // MANDALO A TE STESSO PER TESTARE IL PDF
      subject: `Contratto Park-ly: ${contractNumber}`,
      html: `
        <h2>Ciao ${customerName},</h2>
        <p>Il contratto <b>${contractNumber}</b> è pronto.</p>
        <a href="${linkData.signedUrl}" style="background:#2563eb;color:white;padding:10px;text-decoration:none;border-radius:5px;">SCARICA PDF</a>
      `,
    })

    if (error) throw error
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
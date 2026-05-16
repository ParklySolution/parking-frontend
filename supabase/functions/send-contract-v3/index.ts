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
    
    console.log("📧 Richiesta invio email:", { to, customerName, contractNumber, filePath })
    
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generiamo il link del PDF
    const { data: linkData, error: linkError } = await supabaseAdmin
      .storage
      .from('contracts')
      .createSignedUrl(filePath, 86400) // 24 ore

    if (linkError) {
      console.error("❌ Errore link storage:", linkError)
      throw new Error("Errore link storage: " + linkError.message)
    }

    console.log("✅ Link PDF generato per:", to)

    // 🔥 CORREZIONE 1: usa il destinatario dinamico
    // 🔥 CORREZIONE 2: usa il tuo dominio verificato su Resend
    const { data, error } = await resend.emails.send({
      from: 'Park-ly <noreply@park-ly.it>',  // ✅ TUO DOMINIO
      to: [to],                               // ✅ DINAMICO
      subject: `Contratto Park-ly: ${contractNumber}`,
      html: `
        <h2>Ciao ${customerName},</h2>
        <p>Il contratto <b>${contractNumber}</b> è pronto.</p>
        <p>Puoi scaricarlo cliccando sul link qui sotto:</p>
        <a href="${linkData.signedUrl}" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">📄 SCARICA PDF</a>
        <hr>
        <p style="font-size:12px;color:#666;">Questo link è valido per 24 ore.</p>
        <p style="font-size:12px;color:#666;">Cordiali saluti,<br>Il team di Park-ly</p>
      `,
    })

    if (error) {
      console.error("❌ Errore invio email:", error)
      throw error
    }
    
    console.log("✅ Email inviata con successo a:", to)
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    console.error("❌ Errore nella funzione:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})
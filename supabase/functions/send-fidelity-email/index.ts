
import { Resend } from "https://esm.sh/resend@3.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    const { batchSize = 10 } = await req.json();
    
    console.log(`📧 Avvio invio email - batch size: ${batchSize}`);
    
    // 1. Prendi le email pendenti
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select(`
        *,
        email_templates!template_id (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(batchSize);
    
    if (fetchError) {
      throw new Error(`Errore fetch: ${fetchError.message}`);
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("📭 Nessuna email in coda");
      return new Response(JSON.stringify({ success: true, message: "Nessuna email in coda" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log(`📧 Trovate ${pendingEmails.length} email in coda`);
    
    let sent = 0;
    let failed = 0;
    
    // 2. Invia ogni email
    for (const email of pendingEmails) {
      try {
        const template = email.email_templates;
        const variables = email.variables;
        
        // Sostituisci i placeholder nel subject e html_body
        let subject = template.subject;
        let html = template.html_body;
        
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value));
          html = html.replace(regex, String(value));
        }
        
        // Ottieni l'email del cliente
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('email')
          .eq('id', email.customer_id)
          .single();
        
        if (customerError || !customer?.email) {
          throw new Error(`Cliente senza email: ${email.customer_id}`);
        }
        
        // Invia usando Resend
        const { data: emailData, error: sendError } = await resend.emails.send({
          from: "Garage Solution <noreply@garagesolution.it>",
          to: [customer.email],
          subject: subject,
          html: html,
        });
        
        if (sendError) {
          throw new Error(`Resend error: ${sendError.message}`);
        }
        
        // Aggiorna status a 'sent'
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', email.id);
        
        console.log(`✅ Email inviata a ${customer.email} - ID: ${emailData?.id}`);
        sent++;
        
      } catch (err) {
        console.error(`❌ Errore per email ${email.id}:`, err);
        
        // Aggiorna status a 'failed'
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', email.id);
        
        failed++;
      }
    }
    
    console.log(`📊 Riepilogo: inviate=${sent}, fallite=${failed}`);
    
    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      total: pendingEmails.length
    }), {
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("❌ Errore generale:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
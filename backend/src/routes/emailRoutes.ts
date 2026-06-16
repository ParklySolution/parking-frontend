import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const router = Router();

// Inizializza Supabase con le variabili d'ambiente
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inizializza Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Endpoint per processare le email in coda
router.post('/process-emails', async (req, res) => {
  try {
    const { batchSize = 10 } = req.body;
    
    console.log(`📧 Processamento email in coda - batch size: ${batchSize}`);
    
    // Prendi le email pendenti
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select(`
        *,
        email_templates!template_id (*)
      `)
      .eq('status', 'pending')
      .limit(batchSize);
    
    if (fetchError) {
      console.error('❌ Errore fetch:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }
    
    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("📭 Nessuna email in coda");
      return res.json({ success: true, message: 'Nessuna email in coda' });
    }
    
    console.log(`📧 Trovate ${pendingEmails.length} email in coda`);
    
    let sent = 0;
    let failed = 0;
    
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
        
        // Invia email con Resend
        const { data: emailData, error: sendError } = await resend.emails.send({
          from: "Park-Ly <noreply@park-ly.it>",
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
        console.error(`❌ Errore per email ${email.id}:`, err.message);
        
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
    
    res.json({ 
      success: true, 
      sent, 
      failed, 
      total: pendingEmails.length 
    });
    
  } catch (error) {
    console.error('❌ Errore generale:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
import { supabase } from './supabase';

export async function processPendingEmails(batchSize: number = 10): Promise<{ sent: number; failed: number }> {
  try {
    console.log('📧 Chiamo Edge Function send-fidelity-email...');
    
    // 🔥 Assicurati che il body sia un oggetto valido
    const body = { batchSize: batchSize || 10 };
    
    const { data, error } = await supabase.functions.invoke('send-fidelity-email', {
      body: body
    });
    
    if (error) {
      console.error('❌ Errore invio email:', error);
      return { sent: 0, failed: 0 };
    }
    
    console.log('📊 Risultato invio email:', data);
    return { sent: data?.sent || 0, failed: data?.failed || 0 };
    
  } catch (error) {
    console.error('❌ Errore processPendingEmails:', error);
    return { sent: 0, failed: 0 };
  }
}

export function startEmailProcessor(intervalSeconds: number = 60) {
  console.log(`🚀 Avvio processore email (intervallo: ${intervalSeconds} secondi)`);
  
  // Esegui subito il primo controllo dopo 5 secondi
  setTimeout(() => {
    console.log('🔄 Primo controllo email in coda...');
    processPendingEmails(10);
  }, 5000);
  
  // Poi ogni X secondi
  setInterval(async () => {
    console.log('🔄 Processamento email in coda...');
    await processPendingEmails(10);
  }, intervalSeconds * 1000);
}
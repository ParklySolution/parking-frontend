import cron from 'node-cron';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Esegui ogni minuto
cron.schedule('* * * * *', async () => {
  console.log('🔄 [CRON] Processamento email in coda...');
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/email/process-emails`, { 
      batchSize: 10 
    });
    
    if (response.data.sent > 0 || response.data.failed > 0) {
      console.log(`📧 [CRON] Email processate: inviate=${response.data.sent}, fallite=${response.data.failed}`);
    } else if (response.data.message === 'Nessuna email in coda') {
      // Non loggare se non ci sono email (opzionale)
      // console.log('📭 [CRON] Nessuna email in coda');
    }
  } catch (error) {
    console.error('❌ [CRON] Errore processamento email:', error.message);
  }
});

console.log('⏰ [CRON] Email processor avviato - controlla ogni minuto');
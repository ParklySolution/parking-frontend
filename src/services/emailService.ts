// File: src/services/emailService.ts
import { supabase } from './supabase';

export async function sendContractEmail(
  to: string,
  contractNumber: string,
  pdfBlob: Blob,
  customerName: string
): Promise<boolean> {
  try {
    console.log('📧 Avvio procedura invio email per:', to);

    // Usa lo STESSO nome file che usiamo in handleEmailContract
    // Nella nostra implementazione usiamo `contratto-${Date.now()}.pdf`
    // Ma dobbiamo ricevere il fileName già generato
    const fileName = `contratto-${contractNumber}.pdf`;
    let filePath = fileName;

    console.log('📤 Caricamento PDF su Supabase Storage...');
    
    // PRIMA prova a eliminare se esiste già
    try {
      await supabase.storage.from('contracts').remove([filePath]);
    } catch (e) {
      // Ignora errori se il file non esiste
    }
    
    // TENTATIVO PRINCIPALE
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf'
      });

    // Se fallisce, PROVA CON NOME ALTERNATIVO (con timestamp)
    if (uploadError) {
      console.error('❌ Errore caricamento Storage:', uploadError);
      
      // Prova con nome alternativo
      const altFileName = `contratto-${Date.now()}.pdf`;
      const { error: retryError } = await supabase.storage
        .from('contracts')
        .upload(altFileName, pdfBlob, {
          contentType: 'application/pdf'
        });
      
      if (retryError) {
        console.error('❌ Anche il retry fallisce:', retryError);
        return false;
      }
      
      // Aggiorna filePath con il nuovo nome
      filePath = altFileName;
    }

    console.log('🚀 Invocazione Edge Function...');
    const { data, error: funcError } = await supabase.functions.invoke('send-contract-v3', {
      body: {
        to,
        contractNumber,
        customerName,
        filePath,
        fileName: filePath // Passa il nome effettivamente usato
      }
    });

    if (funcError) {
      console.error('❌ Errore invocazione funzione:', funcError);
      return false;
    }

    console.log('✅ Procedura completata con successo:', data);
    return true;

  } catch (error) {
    console.error('❌ Errore generale emailService:', error);
    return false;
  }
}
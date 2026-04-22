import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDFFromHTML(html: string, fileName: string): Promise<Blob> {
  // Crea un contenitore temporaneo
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.background = '#fff';
  container.style.padding = '40px';
  document.body.appendChild(container);

  try {
    // Converti in canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      useCORS: true
    });

    // Crea PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Salva o restituisci blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } finally {
    // Pulisci
    document.body.removeChild(container);
  }
}

export function downloadPDF(pdfBlob: Blob, fileName: string) {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printHTML(html: string) {
  // Crea un iframe nascosto invece di usare window.open()
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    alert('Errore nella creazione dell\'anteprima di stampa');
    document.body.removeChild(iframe);
    return;
  }

  // Scrivi il contenuto nell'iframe
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stampa Contratto</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Stampa quando il contenuto è caricato
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (error) {
      console.error('Errore durante la stampa:', error);
      alert('Errore durante la stampa. Riprova.');
    } finally {
      // Rimuovi l'iframe dopo la stampa
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 500);
}
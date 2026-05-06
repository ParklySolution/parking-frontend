// src/services/ticketPrintService.ts
import QRCode from 'qrcode';

interface TicketData {
  ticketNumber: number;
  plate: string;
  entryTime: Date;
  exitTime?: Date;  // 🔥 AGGIUNTO
  brand?: string;
  model?: string;
  category?: string;
  hours?: number;  // 🔥 AGGIUNTO - ore di sosta
  totalAmount?: number;  // 🔥 AGGIUNTO - importo pagato
  paymentMethod?: string;  // 🔥 AGGIUNTO - metodo pagamento
  company?: {
    company_name?: string;
    legal_address?: string;
    operational_address?: string;
    phone?: string;
    email?: string;
    website?: string;
    vat_number?: string;
  };
  tariffInfo?: {
    firstHour?: number;
    hourly?: number;
    nextHours?: number;
    maxDaily?: number;
    nightTariff?: number;
    overnightFixed?: number;
  };
  qrData?: string;
  hasWashServices?: boolean;
  washServices?: string[];
  washTotal?: number;
  bonusHours?: number;
  conventionName?: string;
  notes?: string[];
}

/**
 * Formatta tariffa in Euro
 */
const formatEuro = (value?: number): string => {
  if (value === undefined || value === null) return 'N/D';
  return `€ ${value.toFixed(2)}`;
};

/**
 * Ottiene il testo delle condizioni di posteggio
 */
const getParkingConditions = (): string => {
  return `CONDIZIONI DI POSTEGGIO IN AUTORIMESSA PUBBLICA: Il cliente accetta le condizioni di posteggio con il semplice fatto del deposito del veicolo ed il presente biglietto è il solo documento valido per il ritiro dello stesso e va esibito. Non si risponde per gli oggetti lasciati nel veicolo e dei danni riscontrati sull'auto se, al momento del suo affidamento non ne sia stata verificata l'integrità da parte del nostro personale, eventuali contestazioni dovranno essere sollevate al ritiro del veicolo e prima dell'uscita dal parcheggio.`;
};

/**
 * Stampa un ticket professionale completo
 */
export const printTicket = async (data: TicketData) => {
  try {
    const {
      ticketNumber,
      plate,
      entryTime,
      exitTime,  // 🔥 AGGIUNTO
      brand = '',
      model = '',
      category = '',
      hours = 0,  // 🔥 AGGIUNTO con default
      totalAmount = 0,  // 🔥 AGGIUNTO con default
      paymentMethod = 'Contanti',  // 🔥 AGGIUNTO con default
      company = {},
      tariffInfo = {},
      qrData,
      hasWashServices = false,
      washServices = [],
      washTotal,
      bonusHours,
      conventionName,
      notes = []
    } = data;

    // Genera QR code
    let qrImageUrl = '';
    try {
      const qrContent = qrData || JSON.stringify({
        ticket: ticketNumber,
        plate,
        time: entryTime.toISOString(),
        type: hasWashServices ? 'wash' : conventionName ? 'convention' : 'parking'
      });
      
      qrImageUrl = await QRCode.toDataURL(qrContent, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (qrError) {
      console.error('❌ Errore generazione QR:', qrError);
    }

    // Crea iframe nascosto
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    const entryDateStr = entryTime.toLocaleDateString('it-IT');
    const entryTimeStr = entryTime.toLocaleTimeString('it-IT');
    const exitDateStr = exitTime ? exitTime.toLocaleDateString('it-IT') : '';
    const exitTimeStr = exitTime ? exitTime.toLocaleTimeString('it-IT') : '';
    
    // Combinazione note
    const allNotes = [...notes];
    if (conventionName) {
      allNotes.unshift(`CONVENZIONE APPLICATA: ${conventionName}`);
    }

    // Template HTML ottimizzato
    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${ticketNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 2mm;
            font-size: 9pt;
            background: #fff;
            color: #000;
            line-height: 1.2;
          }
          
          /* BOX AZIENDA - COMPATTO */
          .company-box {
            border: 1px solid #000;
            padding: 2mm;
            margin-bottom: 2mm;
            text-align: center;
          }
          .company-name {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 1mm;
          }
          .company-details {
            font-size: 8pt;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 1mm 0;
            margin: 1mm 0;
          }
          .hours {
            font-size: 8pt;
            font-weight: bold;
            background: #eee;
            padding: 1mm;
            margin-top: 1mm;
          }
          
          /* BOX TICKET + DATI SOSTA - ACCORPATI */
          .ticket-sosta-box {
            border: 2px solid #000;
            margin-bottom: 2mm;
          }
          .ticket-header {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            padding: 2mm;
            background: #f0f0f0;
            border-bottom: 1px solid #000;
          }
          .sosta-details {
            padding: 2mm;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
          }
          .label {
            font-weight: bold;
          }
          
          /* BOX TARIFFE - COMPATTO */
          .section {
            border: 1px solid #000;
            padding: 1.5mm;
            margin-bottom: 2mm;
          }
          .section-title {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 1mm;
            background: #eee;
            padding: 0.5mm;
          }
          .tariff-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5mm 0;
            font-size: 8pt;
            border-bottom: 1px dotted #ccc;
          }
          .tariff-label {
            font-weight: bold;
          }
          .highlight {
            background: #ffffcc;
            font-weight: bold;
          }
          
          /* BOX PAGAMENTO - 🔥 NUOVO */
          .payment-box {
            border: 2px solid #10b981;
            padding: 2mm;
            margin-bottom: 2mm;
            background: #f0fff4;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14pt;
            font-weight: bold;
            padding: 2mm 0;
          }
          .total-amount {
            color: #10b981;
          }
          
          /* SERVIZI LAVAGGIO */
          .service-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5mm 0;
            font-size: 8pt;
            border-bottom: 1px dotted #ccc;
          }
          .bonus-box {
            background: #10b981;
            color: #fff;
            padding: 1mm;
            margin: 1mm 0;
            border-radius: 1mm;
            text-align: center;
            font-size: 8pt;
            font-weight: bold;
          }
          
          /* NOTE E CONDIZIONI */
          .notes-section {
            border: 1px solid #000;
            padding: 1.5mm;
            margin-bottom: 2mm;
          }
          .convention-highlight {
            font-weight: bold;
            margin-bottom: 1mm;
          }
          .conditions-text {
            font-size: 6pt;
            text-align: justify;
          }
          
          /* QR CODE */
          .qr-section {
            text-align: center;
            margin: 2mm 0;
            padding: 1.5mm;
            border: 1px dashed #000;
          }
          .qr-image {
            width: 30mm;
            height: 30mm;
            display: block;
            margin: 0 auto;
          }
          
          /* FOOTER */
          .footer {
            text-align: center;
            font-size: 7pt;
            border-top: 1px solid #000;
            padding-top: 1mm;
          }
          .website {
            font-weight: bold;
            font-size: 8pt;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 1mm 0;
          }
        </style>
      </head>
      <body>
        <!-- BOX AZIENDA COMPATTO CON ORARI -->
        <div class="company-box">
          <div class="company-name">${company.company_name || 'PARK-LY'}</div>
          <div style="font-size: 8pt;">${company.legal_address || 'Via Roma 1, 20100 Milano'}</div>
          ${company.vat_number ? `<div style="font-size: 7pt;">P.IVA: ${company.vat_number}</div>` : ''}
          <div class="company-details">
            <div>📞 ${company.phone || '02 12345678'} | 📧 ${company.email || 'info@park-ly.com'}</div>
          </div>
          <div class="hours">
            ⏰ APERTO H24 - 7 GIORNI SU 7
          </div>
        </div>

        <!-- BOX ACCORPATO: NUMERO TICKET + DATI SOSTA -->
        <div class="ticket-sosta-box">
          <div class="ticket-header">
            TICKET N. ${ticketNumber}
          </div>
          <div class="sosta-details">
            <div class="row">
              <span class="label">📅 Ingresso:</span>
              <span>${entryDateStr} ${entryTimeStr}</span>
            </div>
            ${exitTime ? `
            <div class="row">
              <span class="label">📅 Uscita:</span>
              <span>${exitDateStr} ${exitTimeStr}</span>
            </div>
            ` : ''}
            <div class="row">
              <span class="label">⏱️ Ore sosta:</span>
              <span>${hours}</span>
            </div>
            <div class="row">
              <span class="label">🚗 Targa:</span>
              <span>${plate}</span>
            </div>
            <div class="row">
              <span class="label">🚘 Veicolo:</span>
              <span>${brand} ${model} ${category ? `(${category})` : ''}</span>
            </div>
          </div>
        </div>

        <!-- 🔥 BOX PAGAMENTO - Mostra SOLO se è un ticket di USCITA (totalAmount > 0) -->
${totalAmount !== undefined && totalAmount > 0 ? `
<div class="payment-box" style="border: 2px solid #10b981; padding: 2mm; margin-bottom: 2mm; background: #f0fff4;">
  <div style="display: flex; justify-content: space-between; font-size: 14pt; font-weight: bold; padding: 2mm 0;">
    <span>TOTALE PAGATO:</span>
    <span style="color: #10b981;">${formatEuro(totalAmount)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; margin: 1mm 0;">
    <span style="font-weight: bold;">💳 Metodo pagamento:</span>
    <span>${paymentMethod === 'CASH' ? 'Contanti' : paymentMethod === 'CARD' ? 'Carta di credito/debito' : paymentMethod || 'Non specificato'}</span>
  </div>
</div>
` : ''}

        <!-- SERVIZI LAVAGGIO (se presenti) -->
        ${hasWashServices && washServices.length > 0 ? `
        <div class="section">
          <div class="section-title">🧼 SERVIZI LAVAGGIO</div>
          ${washServices.map((service, idx) => `
            <div class="service-item">
              <span>${service}</span>
            </div>
          `).join('')}
          ${washTotal !== undefined ? `
          <div class="row" style="font-weight: bold; margin-top: 1mm; border-top: 1px solid #000; padding-top: 0.5mm;">
            <span>TOTALE LAVAGGI:</span>
            <span>€ ${washTotal.toFixed(2)}</span>
          </div>
          ` : ''}
          ${bonusHours !== undefined && bonusHours > 0 ? `
          <div class="bonus-box">
            🎁 BONUS PARCHEGGIO: ${bonusHours} ORE GRATIS
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- BOX TARIFFE COMPATTO -->
        ${(tariffInfo.firstHour !== undefined || tariffInfo.hourly !== undefined || 
           tariffInfo.nextHours !== undefined || tariffInfo.nightTariff !== undefined || 
           tariffInfo.overnightFixed !== undefined || tariffInfo.maxDaily !== undefined) ? `
        <div class="section">
          <div class="section-title">💰 TARIFFE ${category ? `- ${category}` : ''}</div>
          
          ${(tariffInfo.firstHour !== undefined || tariffInfo.hourly !== undefined || tariffInfo.nextHours !== undefined) ? `
            ${tariffInfo.firstHour !== undefined ? `
            <div class="tariff-item">
              <span class="tariff-label">Prima ora:</span>
              <span>${formatEuro(tariffInfo.firstHour)}</span>
            </div>` : ''}
            ${tariffInfo.nextHours !== undefined ? `
            <div class="tariff-item">
              <span class="tariff-label">Ore successive:</span>
              <span>${formatEuro(tariffInfo.nextHours)}</span>
            </div>` : ''}
            ${tariffInfo.hourly !== undefined ? `
            <div class="tariff-item">
              <span class="tariff-label">Tariffa oraria:</span>
              <span>${formatEuro(tariffInfo.hourly)}</span>
            </div>` : ''}
          ` : ''}

          ${(tariffInfo.nightTariff !== undefined || tariffInfo.overnightFixed !== undefined || tariffInfo.maxDaily !== undefined) ? `
            ${tariffInfo.nightTariff !== undefined ? `
            <div class="tariff-item">
              <span class="tariff-label">Notturna (oraria):</span>
              <span>${formatEuro(tariffInfo.nightTariff)}</span>
            </div>` : ''}
            ${tariffInfo.overnightFixed !== undefined ? `
            <div class="tariff-item highlight">
              <span class="tariff-label">🛏️ Pernottamento:</span>
              <span>${formatEuro(tariffInfo.overnightFixed)}</span>
            </div>` : ''}
            ${tariffInfo.maxDaily !== undefined ? `
            <div class="tariff-item">
              <span class="tariff-label">📅 Massimo giornaliero:</span>
              <span>${formatEuro(tariffInfo.maxDaily)}</span>
            </div>` : ''}
          ` : ''}
        </div>
        ` : ''}

        <!-- NOTE E CONDIZIONI -->
        <div class="notes-section">
          <div class="section-title">📝 NOTE</div>
          
          ${conventionName ? `
          <div class="convention-highlight">CONVENZIONE APPLICATA: ${conventionName}</div>
          ` : ''}
          
          ${allNotes.length > 0 ? `
          <div style="font-size: 8pt; margin-bottom: 1mm;">
            ${allNotes.map(note => `<div>${note}</div>`).join('')}
          </div>
          ` : ''}
          
          <div class="conditions-text">
            ${getParkingConditions()}
          </div>
        </div>

        <!-- QR CODE -->
        <div class="qr-section">
          ${qrImageUrl ? 
            `<img src="${qrImageUrl}" class="qr-image" alt="QR Code" />` : 
            `<div style="font-family: monospace; font-size: 6pt; word-break: break-all;">${qrData || `TICKET:${ticketNumber}`}</div>`
          }
          <div style="font-size: 7pt; margin-top: 1mm;">
            Scannerizza per uscita rapida
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <div class="website">${company.website || 'www.park-ly.garagesolution.com'}</div>
          <div style="font-size: 6pt;">
            Emesso il ${new Date().toLocaleString('it-IT')}
          </div>
        </div>
      </body>
      </html>
    `;

    // Stampa
    iframeDoc.open();
    iframeDoc.write(ticketHTML);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
        console.log(`🖨️ Ticket #${ticketNumber} inviato alla stampante - Importo: €${totalAmount}`);
      } catch (printError) {
        console.error('❌ Errore stampa:', printError);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 500);

  } catch (error) {
    console.error('❌ Errore generazione ticket:', error);
  }
};

/**
 * Versione semplificata per ticket senza lavaggi/convenzioni
 */
export const printSimpleTicket = (
  ticketNumber: number,
  plate: string,
  entryTime: Date,
  companyName?: string
) => {
  return printTicket({
    ticketNumber,
    plate,
    entryTime,
    company: {
      company_name: companyName || 'PARK-LY'
    }
  });
};
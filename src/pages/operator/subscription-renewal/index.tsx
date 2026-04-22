// src/pages/operator/subscription-renewal/index.tsx

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { 
  FaSearch,
  FaArrowLeft,
  FaPrint,
  FaEnvelope,
  FaMoneyBillWave,
  FaCreditCard,
  FaUniversity,
  FaCheckCircle
} from "react-icons/fa";
import { generatePDFFromHTML, printHTML } from '@/services/pdfService';
import { sendContractEmail } from '@/services/emailService';
import { formatDate, formatCurrency } from '@/pages/operator/Contracts/utils/formatters';
import { useCustomerSubscription } from './hooks/useCustomerSubscription';
import { MonthSelector } from './components/MonthSelector';

// Colori
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

export default function SubscriptionRenewal() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedMonths, setSelectedMonths] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [shouldPrint, setShouldPrint] = useState(true);
  const [shouldEmail, setShouldEmail] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // ⭐ State per gli insoluti
  const [includeOutstandings, setIncludeOutstandings] = useState(false);

  const { searchCustomer, loading } = useCustomerSubscription();

  // Calcola il totale finale includendo eventuali insoluti
  const finalTotal = includeOutstandings && selectedCustomer?.outstandings
    ? totalAmount + selectedCustomer.outstandings.total
    : totalAmount;

  // Carica i metodi di pagamento all'avvio
  useEffect(() => {
    loadPaymentMethods();
  }, [tenantId]);

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_cash', { ascending: false });
    
    setPaymentMethods(data || []);
    if (data && data.length > 0) {
      setPaymentMethod(data[0].code);
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    const results = await searchCustomer(searchInput);
    setSearchResults(results || []);
    setShowResults(true);
    setSelectedCustomer(null);
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setShowResults(false);
    setSelectedMonths([]);
    setTotalAmount(0);
    setIncludeOutstandings(false); // Reset insoluti quando cambio cliente
  };

  const handleMonthSelection = (months: any[], total: number) => {
    setSelectedMonths(months);
    setTotalAmount(total);
  };

  const handlePayment = async () => {
    if (!selectedCustomer || selectedMonths.length === 0 || !paymentMethod) {
      alert('Seleziona almeno un mese e un metodo di pagamento');
      return;
    }

    setProcessing(true);
    try {
      // ⭐ USA LA SUBSCRIPTION INVECE DEL CONTRATTO
      const subscription = selectedCustomer.subscriptions?.[0];
      
      if (!subscription) {
        throw new Error('Nessuna subscription attiva trovata per questo cliente. Assicurati che il contratto sia di tipo abbonamento.');
      }

      const firstMonth = selectedMonths[0];
      const lastMonth = selectedMonths[selectedMonths.length - 1];
      
      // Ottieni l'ID dell'utente loggato
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utente non autenticato');
      }
      
      // Trova ID metodo pagamento
      const { data: method, error: methodError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('code', paymentMethod)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (methodError || !method) {
        throw new Error(`Metodo di pagamento ${paymentMethod} non configurato. Vai in Gestione > Metodi Pagamento per configurarlo.`);
      }

      // Prepara i dati con tutti i campi obbligatori
      const paymentData = {
        tenant_id: tenantId,
        subscription_id: subscription.id,
        period_from: firstMonth.periodStart || firstMonth.period_from,
        period_to: lastMonth.periodEnd || lastMonth.period_to,
        amount: finalTotal, // ⭐ Usa finalTotal invece di totalAmount
        payment_method_id: method.id,
        created_by: user.id,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      console.log('📦 Invio dati pagamento:', paymentData);

      // Inserisci pagamento
      const { data: payment, error: paymentError } = await supabase
        .from('subscription_payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // ⭐ 3️⃣ Chiudi gli insoluti se selezionati
      if (includeOutstandings && selectedCustomer.outstandings?.items?.length > 0) {
  const outstandingIds = selectedCustomer.outstandings.items.map(o => String(o.id));

const { error: closeError } = await supabase
  .from("outstanding_payments")
  .update({
    status: "paid",
    closed_at: new Date().toISOString(),
    closed_by_payment_id: payment.id
  })
  .in("id", outstandingIds);

  if (closeError) {
    console.error("❌ Errore chiusura insoluti:", closeError);
  } else {
    console.log("🔒 Insoluti chiusi correttamente:", outstandingIds);
  }
}

      // Trova il metodo di pagamento per il nome
      const selectedMethod = paymentMethods.find(m => m.code === paymentMethod);

      // Genera ricevuta con insoluti
      const receiptHTML = generateReceiptHTML(payment, selectedCustomer, selectedMonths, selectedMethod, includeOutstandings);
      const pdfBlob = await generatePDFFromHTML(receiptHTML, `ricevuta-${Date.now()}.pdf`);

      // Stampa se richiesto
      if (shouldPrint) {
        printHTML(receiptHTML);
      }

      // Email se richiesto
      if (shouldEmail && selectedCustomer.email) {
        await sendContractEmail(
          selectedCustomer.email,
          `RICEVUTA-${payment.id.substring(0, 8)}`,
          pdfBlob,
          `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
        );
      }

      alert('✅ Pagamento registrato con successo!');

      // ⭐ TORNA ALLA DASHBOARD DOPO 2 SECONDI
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('❌ Errore pagamento:', error);
      alert(error.message || 'Errore durante la registrazione del pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const generateReceiptHTML = (payment: any, customer: any, months: any[], method: any, includeOutstandings: boolean) => {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    const outstandingsTotal = includeOutstandings && customer.outstandings ? customer.outstandings.total : 0;
    const grandTotal = payment.amount;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ricevuta Pagamento</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 5mm;
            font-size: 10pt;
            line-height: 1.2;
          }
          h1 {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin: 2mm 0;
            color: #000;
          }
          h2 {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin: 2mm 0;
            color: #000;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
          }
          .section {
            margin: 3mm 0;
            padding: 2mm 0;
            border-bottom: 1px dotted #000;
          }
          .section-title {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 2mm;
            background: #eee;
            padding: 1mm;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
          }
          .label {
            font-weight: bold;
          }
          .vehicle {
            border: 1px solid #000;
            padding: 2mm;
            margin: 2mm 0;
          }
          .total {
            font-size: 12pt;
            font-weight: bold;
            text-align: right;
            margin-top: 3mm;
          }
          .footer {
            text-align: center;
            margin-top: 5mm;
            font-size: 9pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            padding: 1mm 0;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
          }
          .outstanding {
            color: #ff4444;
            border-top: 1px solid #ff4444;
            margin-top: 5px;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PARK-LY</h1>
          <h2>RICEVUTA DI PAGAMENTO</h2>
          <div>Abbonamento Parcheggio</div>
          <hr>
        </div>

        <div class="section">
          <div class="section-title">📋 DATI CLIENTE</div>
          <div class="row">
            <span class="label">Cliente:</span>
            <span>${customer.first_name} ${customer.last_name}</span>
          </div>
          ${customer.email ? `<div class="row"><span class="label">Email:</span> <span>${customer.email}</span></div>` : ''}
          ${customer.phone ? `<div class="row"><span class="label">Tel:</span> <span>${customer.phone}</span></div>` : ''}
          ${customer.fiscal_code ? `<div class="row"><span class="label">CF:</span> <span>${customer.fiscal_code}</span></div>` : ''}
        </div>

        <div class="section">
          <div class="section-title">🚗 VEICOLI ABBONATI</div>
          ${customer.customer_vehicles && customer.customer_vehicles.length > 0 ? 
            customer.customer_vehicles.map((v: any) => `
              <div class="vehicle">
                <div class="row"><span class="label">Targa:</span> <span><strong>${v.plate}</strong></span></div>
                <div class="row"><span class="label">Marca/Modello:</span> <span>${v.make} ${v.model}</span></div>
              </div>
            `).join('') 
            : '<div>Nessun veicolo registrato</div>'
          }
        </div>

        <div class="section">
          <div class="section-title">💰 DETTAGLIO PAGAMENTO</div>
          <div class="row">
            <span class="label">Ricevuta n.:</span>
            <span>${payment.id.substring(0, 8)}</span>
          </div>
          <div class="row">
            <span class="label">Data:</span>
            <span>${new Date().toLocaleDateString('it-IT')}</span>
          </div>
          <div class="row">
            <span class="label">Periodo:</span>
            <span>${formatDate(firstMonth.period_from)} - ${formatDate(lastMonth.period_to)}</span>
          </div>
          <div class="row">
            <span class="label">Mesi pagati:</span>
            <span>${months.length}</span>
          </div>
          <div class="row">
            <span class="label">Metodo:</span>
            <span>${method?.name || paymentMethod}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📅 MESI PAGATI</div>
          <table>
            ${months.map(m => `
              <tr>
                <td>${m.label}</td>
                <td style="text-align: right;">€ ${m.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${includeOutstandings && customer.outstandings && customer.outstandings.total > 0 ? `
              <tr class="outstanding">
                <td style="color: #ff4444;">⚠️ Insoluti pregressi</td>
                <td style="text-align: right; color: #ff4444;">+ € ${customer.outstandings.total.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr><td colspan="2"><hr></td></tr>
            <tr style="font-weight: bold; font-size: 12pt;">
              <td>TOTALE</td>
              <td style="text-align: right;">€ ${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Grazie per il pagamento!</p>
          <p>${new Date().toLocaleString('it-IT')}</p>
          <p>_________________________</p>
          <p>Firma del cliente</p>
        </div>
      </body>
      </html>
    `;
  };

  // Funzione per ottenere l'icona giusta in base al metodo
  const getMethodIcon = (method: any) => {
    if (method.is_cash) return <FaMoneyBillWave />;
    if (method.code.includes('CARD') || method.code.includes('BANCOMAT')) return <FaCreditCard />;
    if (method.code.includes('BANK') || method.code.includes('BONIFICO')) return <FaUniversity />;
    return <FaCreditCard />;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "20px", 
        marginBottom: "30px",
        background: BG_DARK,
        padding: "15px 20px",
        borderRadius: "10px"
      }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: BLUE, 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "14px"
          }}
        >
          <FaArrowLeft /> Indietro
        </button>
        <h1 style={{ color: "#fff", margin: 0, fontSize: "20px" }}>
          🔄 Rinnovo Abbonamento
        </h1>
      </div>

      {/* Search Bar */}
      <div style={{ 
        background: BG_DARK, 
        padding: "30px", 
        borderRadius: "12px",
        marginBottom: "30px"
      }}>
        <h2 style={{ color: "#fff", marginBottom: "20px", fontSize: "18px" }}>
          Cerca Cliente Abbonato
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Inserisci cognome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: "12px 15px",
              background: BG_LIGHTER,
              border: "1px solid #333",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "14px"
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchInput.trim()}
            style={{
              padding: "12px 25px",
              background: BLUE,
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: loading || !searchInput.trim() ? 0.5 : 1
            }}
          >
            <FaSearch /> Cerca
          </button>
        </div>

        {/* Risultati ricerca */}
        {showResults && (
          <div style={{ marginTop: "20px" }}>
            {loading ? (
              <p style={{ color: "#9ca3af", textAlign: "center" }}>Caricamento...</p>
            ) : searchResults.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center" }}>
                Nessun cliente abbonato trovato con questo cognome
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {searchResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    style={{
                      padding: "15px",
                      background: BG_LIGHTER,
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: "1px solid #333",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#3d3d4a";
                      e.currentTarget.style.borderColor = BLUE;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = BG_LIGHTER;
                      e.currentTarget.style.borderColor = "#333";
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#fff" }}>
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                      {customer.email} | {customer.phone}
                    </div>
                    <div style={{ fontSize: "12px", color: BLUE, marginTop: "5px" }}>
                      📅 Contratto: {customer.contracts[0]?.contract_number}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dettaglio Cliente Selezionato */}
      {selectedCustomer && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Colonna Sinistra - Info Cliente */}
          <div>
            {/* Card Cliente con nome in evidenza */}
            <div style={{ 
              background: BG_DARK, 
              padding: "20px", 
              borderRadius: "12px",
              marginBottom: "20px",
              border: `1px solid ${BLUE}40`
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: BLUE,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#fff"
                }}>
                  {selectedCustomer.first_name?.[0]}{selectedCustomer.last_name?.[0]}
                </div>
                <div>
                  <h2 style={{ color: "#fff", margin: "0 0 4px 0", fontSize: "20px" }}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h2>
                  <div style={{ color: BLUE, fontSize: "14px" }}>
                    Cliente selezionato
                  </div>
                </div>
              </div>
              
              <div style={{ display: "grid", gap: "10px" }}>
                {selectedCustomer.email && (
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>Email</div>
                    <div style={{ color: "#fff" }}>{selectedCustomer.email}</div>
                  </div>
                )}
                {selectedCustomer.phone && (
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>Telefono</div>
                    <div style={{ color: "#fff" }}>{selectedCustomer.phone}</div>
                  </div>
                )}
                {selectedCustomer.fiscal_code && (
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px" }}>Codice Fiscale</div>
                    <div style={{ color: "#fff" }}>{selectedCustomer.fiscal_code}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Veicolo con marca e modello */}
            {selectedCustomer.customer_vehicles?.length > 0 && (
              <div style={{ 
                background: BG_DARK, 
                padding: "20px", 
                borderRadius: "12px",
                marginBottom: "20px"
              }}>
                <h3 style={{ color: "#fff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: BLUE }}>🚗</span> Veicoli
                </h3>
                {selectedCustomer.customer_vehicles.map((v: any, idx: number) => (
                  <div key={idx} style={{
                    padding: "15px",
                    background: BG_LIGHTER,
                    borderRadius: "8px",
                    marginBottom: idx < selectedCustomer.customer_vehicles.length - 1 ? "10px" : 0,
                    border: "1px solid #333"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold", color: BLUE, fontSize: "16px", marginBottom: "4px" }}>
                          {v.plate}
                        </div>
                        <div style={{ fontSize: "14px", color: "#9ca3af" }}>
                          {v.make} {v.model}
                        </div>
                      </div>
                      <div style={{
                        padding: "4px 8px",
                        background: "#10b981",
                        color: "#fff",
                        borderRadius: "4px",
                        fontSize: "12px"
                      }}>
                        Abbonato
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ⭐ Insoluti del Cliente */}
            {selectedCustomer.outstandings && selectedCustomer.outstandings.count > 0 && (
              <div style={{
                background: BG_DARK,
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "20px",
                border: "1px solid #ff444440"
              }}>
                <h3 style={{ color: "#fff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "#ff4444" }}>⚠️</span> Insoluti del Cliente
                </h3>

                <div style={{ marginBottom: "10px", color: "#fff" }}>
                  Totale insoluti: <strong style={{ color: "#ff4444" }}>€ {selectedCustomer.outstandings.total.toFixed(2)}</strong>
                </div>

                <ul style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "15px", listStyle: "none", padding: 0 }}>
                  {selectedCustomer.outstandings.items.map((o: any) => (
                    <li key={o.id} style={{ padding: "5px 0", borderBottom: "1px solid #333" }}>
                      {o.description || "Insoluto"} — € {Number(o.amount).toFixed(2)}
                    </li>
                  ))}
                </ul>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeOutstandings}
                    onChange={(e) => setIncludeOutstandings(e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span style={{ color: "#fff" }}>Includi insoluti nel rinnovo</span>
                </label>
              </div>
            )}

            {/* Storico Pagamenti */}
            <div style={{ 
              background: BG_DARK, 
              padding: "20px", 
              borderRadius: "12px"
            }}>
              <h3 style={{ color: "#fff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: BLUE }}>📜</span> Storico Pagamenti
              </h3>
              {selectedCustomer.contracts[0]?.subscription_payments?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedCustomer.contracts[0].subscription_payments
                    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                    .map((payment: any) => {
                      const start = new Date(payment.period_from);
                      const end = new Date(payment.period_to);
                      const monthsPaid = [];
                      
                      let current = new Date(start);
                      current = new Date(current.getFullYear(), current.getMonth(), 1);
                      
                      const lastDay = new Date(end);
                      lastDay.setDate(1);
                      
                      while (current < lastDay) {
                        monthsPaid.push(
                          current.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
                        );
                        current.setMonth(current.getMonth() + 1);
                      }

                      return (
                        <div key={payment.id} style={{
                          padding: "12px",
                          background: BG_LIGHTER,
                          borderRadius: "8px",
                          border: "1px solid #333"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "14px" }}>
                              € {payment.amount.toFixed(2)}
                            </span>
                            <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                              {new Date(payment.payment_date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "5px" }}>
                            <strong>Mesi pagati:</strong>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "5px" }}>
                            {monthsPaid.map((month, idx) => (
                              <span key={idx} style={{
                                padding: "2px 8px",
                                background: BLUE + '20',
                                color: "#fff",
                                borderRadius: "12px",
                                fontSize: "11px"
                              }}>
                                {month}
                              </span>
                            ))}
                          </div>
                          
                          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "5px" }}>
                            Metodo: {payment.payment_method?.name || payment.payment_method_id}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p style={{ color: "#9ca3af", textAlign: "center" }}>Nessun pagamento registrato</p>
              )}
            </div>
          </div>

          {/* Colonna Destra - Gestione Pagamento */}
          <div>
            {/* Selettore Mesi */}
            <MonthSelector
              contract={selectedCustomer.contracts[0]}
              onSelectionChange={handleMonthSelection}
            />

            {/* Riepilogo e Pagamento */}
            {selectedMonths.length > 0 && (
              <div style={{ 
                background: BG_DARK, 
                padding: "20px", 
                borderRadius: "12px",
                marginTop: "20px"
              }}>
                <h3 style={{ color: "#fff", marginBottom: "15px" }}>💰 Riepilogo Pagamento</h3>
                
                <div style={{ marginBottom: "20px" }}>
                  {selectedMonths.map((month, idx) => (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: idx < selectedMonths.length - 1 ? "1px solid #333" : "none"
                    }}>
                      <span style={{ color: "#9ca3af" }}>{month.label}</span>
                      <span style={{ color: "#fff" }}>€ {month.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  {/* ⭐ SEZIONE INSOLUTI NEL RIEPILOGO */}
                  {includeOutstandings && selectedCustomer.outstandings && selectedCustomer.outstandings.total > 0 && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderTop: "1px solid #ff4444",
                      marginTop: "5px",
                      paddingTop: "12px"
                    }}>
                      <span style={{ color: "#ff4444" }}>⚠️ Insoluti pregressi</span>
                      <span style={{ color: "#ff4444", fontWeight: "bold" }}>+ € {selectedCustomer.outstandings.total.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "15px 0 5px",
                    fontWeight: "bold"
                  }}>
                    <span style={{ color: "#fff" }}>TOTALE</span>
                    <span style={{ color: BLUE, fontSize: "20px" }}>€ {finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Metodo Pagamento - DINAMICO */}
                {paymentMethods.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "10px" }}>
                      Metodo di pagamento
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.code)}
                          style={{
                            flex: 1,
                            padding: "12px",
                            background: paymentMethod === method.code ? BLUE : BG_LIGHTER,
                            border: "none",
                            borderRadius: "8px",
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.2s"
                          }}
                        >
                          {getMethodIcon(method)}
                          {method.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opzioni aggiuntive */}
                <div style={{ 
                  marginBottom: "20px",
                  padding: "15px",
                  background: BG_LIGHTER,
                  borderRadius: "8px"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <input
                      type="checkbox"
                      checked={shouldPrint}
                      onChange={(e) => setShouldPrint(e.target.checked)}
                    />
                    <span style={{ color: "#9ca3af" }}>Stampa ricevuta</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={shouldEmail}
                      onChange={(e) => setShouldEmail(e.target.checked)}
                      disabled={!selectedCustomer.email}
                    />
                    <span style={{ color: selectedCustomer.email ? "#9ca3af" : "#666" }}>
                      Invia ricevuta via email {!selectedCustomer.email && "(cliente senza email)"}
                    </span>
                  </label>
                </div>

                {/* Bottone Conferma */}
                <button
                  onClick={handlePayment}
                  disabled={processing || selectedMonths.length === 0 || !paymentMethod}
                  style={{
                    width: "100%",
                    padding: "15px",
                    background: "#10b981",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    opacity: processing || selectedMonths.length === 0 ? 0.5 : 1
                  }}
                >
                  <FaCheckCircle />
                  {processing ? "REGISTRAZIONE IN CORSO..." : "CONFERMA PAGAMENTO"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { 
  FaUser, FaSearch, FaFileInvoice, FaCheckCircle, 
  FaArrowLeft, FaMoneyBillWave 
} from "react-icons/fa";

// 🔥 STESSI COLORI DELLE ALTRE PAGINE
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";
const BG_MAIN = "#0d1117";

interface OutstandingPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  source_id: string;
  source_type: string;
  amount: number;
  description: string;
  created_at: string;
  ticket_number?: number;
}

export default function OutstandingPayments() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [outstandings, setOutstandings] = useState<OutstandingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedOutstanding, setSelectedOutstanding] = useState<OutstandingPayment | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTenantAndOutstandings();
  }, []);

  const loadTenantAndOutstandings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tid = session?.user?.user_metadata?.tenant_id || null;
      setTenantId(tid);

      if (tid) {
        await loadOutstandings(tid);
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOutstandings = async (tid: string) => {
    try {
      const { data: payments, error: paymentsError } = await supabase
        .from('outstanding_payments')
        .select(`
          *,
          customers!customer_id (name)
        `)
        .eq('tenant_id', tid)
        .is('closed_at', null)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const enrichedPayments = await Promise.all((payments || []).map(async (p: any) => {
        let ticketNumber = null;

        if (p.source_type === 'parking' && p.source_id) {
          const { data: session } = await supabase
            .from('parking_sessions')
            .select('ticket_number')
            .eq('id', p.source_id)
            .single();
          
          if (session) {
            ticketNumber = session.ticket_number;
          }
        }

        return {
          id: p.id,
          customer_id: p.customer_id,
          customer_name: p.customers?.name || 'Cliente sconosciuto',
          source_id: p.source_id,
          source_type: p.source_type,
          amount: p.amount,
          description: p.description || `${p.source_type === 'parking' ? 'Sosta' : 'Altro'} - Ticket #${ticketNumber || 'N/D'}`,
          created_at: p.created_at,
          ticket_number: ticketNumber
        };
      }));

      setOutstandings(enrichedPayments);
      const total = enrichedPayments.reduce((sum, p) => sum + p.amount, 0);
      setTotalAmount(total);

    } catch (error) {
      console.error("Errore caricamento insoluti:", error);
    }
  };

  const handleCloseOutstanding = async (id: string) => {
    if (!confirm("Sei sicuro di voler chiudere questo insoluto?")) return;

    try {
      const { error } = await supabase
        .from('outstanding_payments')
        .update({ status: 'paid', closed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      if (tenantId) await loadOutstandings(tenantId);
      
    } catch (error) {
      console.error("Errore chiusura insoluto:", error);
      alert("Errore durante la chiusura dell'insoluto");
    }
  };

  const handleViewDetails = (outstanding: OutstandingPayment) => {
    setSelectedOutstanding(outstanding);
    setShowModal(true);
  };

  const filteredOutstandings = outstandings.filter(o =>
    o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.ticket_number && o.ticket_number.toString().includes(searchTerm))
  );

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: BG_MAIN, minHeight: "100vh" }}>
        Caricamento insoluti...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG_MAIN, padding: "20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Header con freccia indietro */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "transparent",
                border: "none",
                color: BLUE,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px"
              }}
            >
              ← Indietro
            </button>
            <h1 style={{ color: BLUE, display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <FaFileInvoice /> Insoluti
            </h1>
          </div>
          
          <div style={{ background: BG_DARK, padding: "12px 20px", borderRadius: "8px" }}>
            <span style={{ color: "#9ca3af" }}>Totale insoluti: </span>
            <span style={{ color: "#f59e0b", fontSize: "20px", fontWeight: "bold" }}>€{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: BG_DARK, padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <FaSearch color="#9ca3af" />
            <input
              type="text"
              placeholder="Cerca per cliente, ticket o descrizione..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                background: BG_LIGHTER,
                border: "1px solid #333",
                borderRadius: "6px",
                color: "#fff"
              }}
            />
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>
              {filteredOutstandings.length} insoluti trovati
            </span>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: BG_DARK, borderRadius: "12px", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #333", background: BG_LIGHTER }}>
                <th style={{ padding: "16px", textAlign: "left", color: "#9ca3af" }}>Cliente</th>
                <th style={{ padding: "16px", textAlign: "left", color: "#9ca3af" }}>Ticket</th>
                <th style={{ padding: "16px", textAlign: "left", color: "#9ca3af" }}>Data</th>
                <th style={{ padding: "16px", textAlign: "left", color: "#9ca3af" }}>Descrizione</th>
                <th style={{ padding: "16px", textAlign: "right", color: "#9ca3af" }}>Importo</th>
                <th style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>Azioni</th>
               </tr>
            </thead>
            <tbody>
              {filteredOutstandings.map((outstanding) => (
                <tr key={outstanding.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "16px", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FaUser color={BLUE} />
                      {outstanding.customer_name}
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "#fff" }}>
                    {outstanding.ticket_number ? `#${outstanding.ticket_number}` : "N/D"}
                  </td>
                  <td style={{ padding: "16px", color: "#9ca3af" }}>
                    {new Date(outstanding.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td style={{ padding: "16px", color: "#9ca3af" }}>{outstanding.description}</td>
                  <td style={{ padding: "16px", textAlign: "right", color: "#f59e0b", fontWeight: "bold" }}>
                    €{outstanding.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => handleViewDetails(outstanding)}
                        style={{
                          background: BLUE,
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        Dettagli
                      </button>
                      <button
                        onClick={() => handleCloseOutstanding(outstanding.id)}
                        style={{
                          background: "#10b981",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <FaCheckCircle size={12} /> Chiudi
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOutstandings.length === 0 && (
            <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
              <FaFileInvoice size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
              <p>Nessun insoluto presente</p>
            </div>
          )}
        </div>

        {/* Modal Dettagli */}
        {showModal && selectedOutstanding && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
          }}>
            <div style={{ background: BG_DARK, padding: "30px", borderRadius: "12px", maxWidth: "500px", width: "90%" }}>
              <h3 style={{ color: "#fff", marginBottom: "20px" }}>Dettaglio Insoluto</h3>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ color: "#9ca3af", fontSize: "12px" }}>Cliente</label>
                <p style={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }}>{selectedOutstanding.customer_name}</p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ color: "#9ca3af", fontSize: "12px" }}>Ticket</label>
                <p style={{ color: "#fff", fontSize: "16px" }}>#{selectedOutstanding.ticket_number || "N/D"}</p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ color: "#9ca3af", fontSize: "12px" }}>Data</label>
                <p style={{ color: "#fff", fontSize: "16px" }}>
                  {new Date(selectedOutstanding.created_at).toLocaleString('it-IT')}
                </p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ color: "#9ca3af", fontSize: "12px" }}>Descrizione</label>
                <p style={{ color: "#fff", fontSize: "16px" }}>{selectedOutstanding.description}</p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ color: "#9ca3af", fontSize: "12px" }}>Importo</label>
                <p style={{ color: "#f59e0b", fontSize: "24px", fontWeight: "bold" }}>€{selectedOutstanding.amount.toFixed(2)}</p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleCloseOutstanding(selectedOutstanding.id)}
                  style={{ flex: 1, padding: "12px", background: "#10b981", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer" }}
                >
                  Chiudi Insoluto
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #333", borderRadius: "8px", color: "#fff", cursor: "pointer" }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
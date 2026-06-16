import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { FaGift, FaUser, FaSearch, FaList, FaArrowLeft } from "react-icons/fa";

// 🔥 STESSI COLORI DELLE ALTRE PAGINE
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";
const BG_MAIN = "#0d1117";

interface FidelityCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  current_count: number;
  reward_available: boolean;
  fidelity_program_name: string;
  required_actions: number;
  last_wash_date?: string;
}

interface WashHistory {
  id: string;
  wash_service_name: string;
  wash_service_price: number;
  completed_at: string;
  ticket_number: number;
  is_reward: boolean;
}

export default function FidelityCustomers() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<FidelityCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<FidelityCustomer | null>(null);
  const [washHistory, setWashHistory] = useState<WashHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadTenantAndCustomers();
  }, []);

  const loadTenantAndCustomers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tid = session?.user?.user_metadata?.tenant_id || null;
      setTenantId(tid);

      if (tid) {
        await loadCustomers(tid);
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async (tid: string) => {
    try {
      const { data: fidelityData, error: fidelityError } = await supabase
        .from('customer_fidelity')
        .select(`
          *,
          customers!customer_id (id, name, email, phone),
          fidelity_programs!fidelity_program_id (name, required_actions)
        `)
        .eq('tenant_id', tid)
        .eq('is_active', true);

      if (fidelityError) throw fidelityError;

      const customersWithLastWash = await Promise.all((fidelityData || []).map(async (cf: any) => {
        const { data: lastWash } = await supabase
          .from('parking_session_wash_services')
          .select('completed_at')
          .eq('tenant_id', tid)
          .eq('wash_service_id', cf.fidelity_programs?.service_id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          id: cf.customer_id,
          name: cf.customers?.name || 'Sconosciuto',
          email: cf.customers?.email,
          phone: cf.customers?.phone,
          current_count: cf.current_count,
          reward_available: cf.reward_available,
          fidelity_program_name: cf.fidelity_programs?.name || 'Programma Fedeltà',
          required_actions: cf.fidelity_programs?.required_actions || 10,
          last_wash_date: lastWash?.completed_at
        };
      }));

      setCustomers(customersWithLastWash);

    } catch (error) {
      console.error("Errore caricamento clienti fedeltà:", error);
    }
  };

  const loadWashHistory = async (customerId: string) => {
    setHistoryLoading(true);
    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('parking_sessions')
        .select(`
          id,
          ticket_number,
          entry_time,
          parking_session_wash_services (
            id,
            wash_service_name,
            wash_service_price,
            completed_at
          )
        `)
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)
        .order('entry_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      const washes: WashHistory[] = [];
      for (const session of sessions || []) {
        if (session.parking_session_wash_services) {
          for (const wash of session.parking_session_wash_services) {
            if (wash.completed_at) {
              washes.push({
                id: wash.id,
                wash_service_name: wash.wash_service_name,
                wash_service_price: wash.wash_service_price,
                completed_at: wash.completed_at,
                ticket_number: session.ticket_number,
                is_reward: wash.wash_service_price === 0
              });
            }
          }
        }
      }

      washes.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
      setWashHistory(washes);

    } catch (error) {
      console.error("Errore caricamento storico lavaggi:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistory = async (customer: FidelityCustomer) => {
    setSelectedCustomer(customer);
    await loadWashHistory(customer.id);
    setShowHistoryModal(true);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: BG_MAIN, minHeight: "100vh" }}>
        Caricamento clienti fedeltà...
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
              <FaGift /> Clienti Fedeltà
            </h1>
          </div>
          
          <div style={{ background: BG_DARK, padding: "8px 16px", borderRadius: "8px" }}>
            <span style={{ color: "#9ca3af" }}>Totale clienti: </span>
            <span style={{ color: BLUE, fontWeight: "bold" }}>{customers.length}</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: BG_DARK, padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <FaSearch color="#9ca3af" />
            <input
              type="text"
              placeholder="Cerca per nome cliente o email..."
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
              {filteredCustomers.length} clienti trovati
            </span>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: BG_DARK,
                borderRadius: "12px",
                padding: "20px",
                border: `1px solid ${customer.reward_available ? "#f59e0b" : "#333"}`,
                transition: "transform 0.2s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <FaUser color={BLUE} />
                    <h3 style={{ color: "#fff", margin: 0 }}>{customer.name}</h3>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    {customer.email || "Nessuna email"} • {customer.phone || "Nessun telefono"}
                  </div>
                </div>
                {customer.reward_available && (
                  <div style={{
                    background: "#f59e0b20",
                    padding: "4px 8px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    color: "#f59e0b"
                  }}>
                    🎁 Premio disponibile
                  </div>
                )}
              </div>

              <div style={{ background: BG_LIGHTER, borderRadius: "8px", padding: "12px", marginBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>Programma</span>
                  <span style={{ color: BLUE, fontWeight: "bold" }}>{customer.fidelity_program_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>Progresso</span>
                  <span style={{ color: "#fff", fontWeight: "bold" }}>
                    {customer.current_count} / {customer.required_actions} lavaggi
                  </span>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <div style={{
                    background: "#333",
                    borderRadius: "10px",
                    height: "8px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${(customer.current_count / customer.required_actions) * 100}%`,
                      background: BLUE,
                      height: "100%",
                      borderRadius: "10px"
                    }} />
                  </div>
                </div>
                {customer.last_wash_date && (
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "8px" }}>
                    Ultimo lavaggio: {new Date(customer.last_wash_date).toLocaleDateString('it-IT')}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => navigate("/customers", { 
                    state: { from: "/fidelity-customers" }
                  })}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "transparent",
                    border: `1px solid ${BLUE}`,
                    borderRadius: "6px",
                    color: BLUE,
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <FaUser /> Scheda Cliente
                </button>
                <button
                  onClick={() => handleViewHistory(customer)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: BLUE,
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px"
                  }}
                >
                  <FaList /> Storico
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px",
            background: BG_DARK,
            borderRadius: "12px",
            color: "#9ca3af"
          }}>
            <FaGift size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
            <p>Nessun cliente iscritto al programma fedeltà</p>
          </div>
        )}

        {/* Modal Storico Lavaggi - VERSIONE PREMIUM */}
        {showHistoryModal && selectedCustomer && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            overflow: "auto",
            backdropFilter: "blur(4px)"
          }}>
            <div style={{
              background: `linear-gradient(135deg, ${BG_DARK} 0%, #111827 100%)`,
              borderRadius: "20px",
              maxWidth: "900px",
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              margin: "20px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid rgba(79, 140, 255, 0.2)"
            }}>
              {/* Header Premium */}
              <div style={{
                position: "sticky",
                top: 0,
                background: `linear-gradient(135deg, ${BG_DARK} 0%, #0f172a 100%)`,
                padding: "24px 28px",
                borderBottom: "1px solid rgba(79, 140, 255, 0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 10
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: `linear-gradient(135deg, ${BLUE}, #3b82f6)`,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <FaList size={20} color="#fff" />
                    </div>
                    <h2 style={{ color: "#fff", margin: 0, fontSize: "22px" }}>Storico Lavaggi</h2>
                  </div>
                  <p style={{ color: "#9ca3af", margin: "8px 0 0 0", fontSize: "14px" }}>
                    Cliente: <strong style={{ color: BLUE }}>{selectedCustomer.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "24px 28px" }}>
                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: "60px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      border: `3px solid ${BG_LIGHTER}`,
                      borderTopColor: BLUE,
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto 16px"
                    }} />
                    <p style={{ color: "#9ca3af" }}>Caricamento storico...</p>
                  </div>
                ) : washHistory.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px" }}>
                    <div style={{
                      width: "80px",
                      height: "80px",
                      background: BG_LIGHTER,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px"
                    }}>
                      <FaList size={32} color="#4f8cff" opacity={0.5} />
                    </div>
                    <p style={{ color: "#9ca3af", fontSize: "16px" }}>Nessun lavaggio effettuato</p>
                  </div>
                ) : (
                  <>
                    {/* Statistiche riassuntive */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      marginBottom: "28px"
                    }}>
                      <div style={{
                        background: BG_LIGHTER,
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: BLUE }}>
                          {washHistory.length}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>Totale Lavaggi</div>
                      </div>
                      <div style={{
                        background: BG_LIGHTER,
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>
                          {washHistory.filter(w => w.is_reward).length}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>Premi Utilizzati</div>
                      </div>
                      <div style={{
                        background: BG_LIGHTER,
                        borderRadius: "14px",
                        padding: "16px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>
                          {washHistory.filter(w => !w.is_reward).length}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>Lavaggi Pagati</div>
                      </div>
                    </div>

                    {/* Tabella */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(79, 140, 255, 0.2)" }}>
                            <th style={{ padding: "14px 12px", textAlign: "left", color: "#9ca3af", fontSize: "12px", fontWeight: "500" }}>DATA</th>
                            <th style={{ padding: "14px 12px", textAlign: "left", color: "#9ca3af", fontSize: "12px", fontWeight: "500" }}>TICKET</th>
                            <th style={{ padding: "14px 12px", textAlign: "left", color: "#9ca3af", fontSize: "12px", fontWeight: "500" }}>SERVIZIO</th>
                            <th style={{ padding: "14px 12px", textAlign: "right", color: "#9ca3af", fontSize: "12px", fontWeight: "500" }}>IMPORTO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {washHistory.map((wash, idx) => (
                            <tr 
                              key={wash.id} 
                              style={{ 
                                borderBottom: idx === washHistory.length - 1 ? "none" : "1px solid rgba(255,255,255,0.05)",
                                transition: "background 0.2s",
                                background: wash.is_reward ? "rgba(245, 158, 11, 0.05)" : "transparent"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(79, 140, 255, 0.05)"}
                              onMouseLeave={(e) => {
                                if (wash.is_reward) {
                                  e.currentTarget.style.background = "rgba(245, 158, 11, 0.05)";
                                } else {
                                  e.currentTarget.style.background = "transparent";
                                }
                              }}
                            >
                              <td style={{ padding: "14px 12px", color: "#fff", fontSize: "14px" }}>
                                {new Date(wash.completed_at).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                                  {new Date(wash.completed_at).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </td>
                              <td style={{ padding: "14px 12px", color: "#fff", fontSize: "14px" }}>
                                <span style={{
                                  background: BG_LIGHTER,
                                  padding: "4px 10px",
                                  borderRadius: "20px",
                                  fontSize: "12px",
                                  fontFamily: "monospace"
                                }}>
                                  #{wash.ticket_number}
                                </span>
                              </td>
                              <td style={{ padding: "14px 12px", color: "#fff", fontSize: "14px" }}>
                                {wash.wash_service_name}
                                {wash.is_reward && (
                                  <span style={{
                                    marginLeft: "10px",
                                    fontSize: "10px",
                                    padding: "3px 8px",
                                    background: "linear-gradient(135deg, #f59e0b20, #f59e0b10)",
                                    borderRadius: "20px",
                                    color: "#f59e0b",
                                    border: "1px solid rgba(245, 158, 11, 0.3)"
                                  }}>
                                    🎁 PREMIO
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "14px 12px", textAlign: "right", fontSize: "16px", fontWeight: "600" }}>
                                {wash.is_reward ? (
                                  <span style={{ color: "#10b981" }}>GRATUITO</span>
                                ) : (
                                  <span style={{ color: "#fff" }}>€{wash.wash_service_price.toFixed(2)}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "16px 28px",
                borderTop: "1px solid rgba(79, 140, 255, 0.1)",
                background: "rgba(0,0,0,0.2)",
                textAlign: "center"
              }}>
                <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>
                  Storico completo dei lavaggi effettuati
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Animazione spin per il loading */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
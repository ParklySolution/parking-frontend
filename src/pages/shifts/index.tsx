import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { FaPlay, FaStop, FaHistory, FaMoneyBillWave, FaCreditCard, FaCoins, FaCalendarAlt, FaUser, FaClock, FaPrint, FaChartLine } from "react-icons/fa";

// Colori
const BLUE = "#4f8cff";
const GREEN = "#10b981";
const RED = "#ef4444";
const ORANGE = "#f59e0b";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

interface Shift {
  id: string;
  opened_by: string;
  opened_by_email?: string;
  opened_at: string;
  closed_at: string | null;
  closed_by: string | null;
  status: 'open' | 'closed';
  created_at: string;
}

interface ShiftSummary {
  total_cash: number;
  total_card: number;
  total_other: number;
  transaction_count: number;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  is_cash: boolean;
}

export default function ShiftsPage() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [pastShifts, setPastShifts] = useState<Shift[]>([]);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureNotes, setClosureNotes] = useState("");
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  // Recupera tenant ID all'avvio
  useEffect(() => {
    async function loadTenant() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login');
          return;
        }

        let id = session?.user?.user_metadata?.tenant_id ||
                session?.user?.app_metadata?.tenant_id ||
                null;

        if (!id && session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();
          id = profile?.tenant_id || null;
        }
        
        setTenantId(id);
      } catch (err) {
        console.error('❌ Errore recupero tenant ID:', err);
      }
    }
    loadTenant();
  }, [navigate]);

  // Carica metodi pagamento
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!tenantId) return;
      
      const { data } = await supabase
        .from('payment_methods')
        .select('id, code, name, is_cash')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      setPaymentMethods(data || []);
    };

    loadPaymentMethods();
  }, [tenantId]);

  // Carica turno corrente e storico
  useEffect(() => {
    if (!tenantId) return;

    const loadShifts = async () => {
      setLoading(true);
      
      try {
        // 1. Carica turno corrente (aperto)
        const { data: openShift } = await supabase
          .from('shifts')
          .select(`
            *,
            opened_by_user:opened_by (
              email
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'open')
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (openShift) {
          setCurrentShift({
            ...openShift,
            opened_by_email: openShift.opened_by_user?.email
          });
          
          // Carica riepilogo per il turno aperto
          await loadShiftSummary(openShift.id);
        }

        // 2. Carica ultimi 10 turni chiusi
        const { data: closedShifts } = await supabase
          .from('shifts')
          .select(`
            *,
            opened_by_user:opened_by (
              email
            ),
            closed_by_user:closed_by (
              email
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'closed')
          .order('closed_at', { ascending: false })
          .limit(10);

        setPastShifts(closedShifts?.map(s => ({
          ...s,
          opened_by_email: s.opened_by_user?.email,
          closed_by_email: s.closed_by_user?.email
        })) || []);

      } catch (error) {
        console.error('❌ Errore caricamento turni:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [tenantId]);

  // Carica riepilogo incassi per un turno
  const loadShiftSummary = async (shiftId: string) => {
    try {
      // Usa la vista v_shift_payments esistente
      const { data } = await supabase
        .from('v_shift_payments')
        .select('*')
        .eq('shift_id', shiftId);

      if (data) {
        const summary: ShiftSummary = {
          total_cash: 0,
          total_card: 0,
          total_other: 0,
          transaction_count: data.length
        };

        // Raggruppa per metodo di pagamento
        data.forEach((payment: any) => {
          const method = paymentMethods.find(m => m.id === payment.payment_method_id);
          if (method?.is_cash) {
            summary.total_cash += payment.amount;
          } else if (method?.code === 'CARD') {
            summary.total_card += payment.amount;
          } else {
            summary.total_other += payment.amount;
          }
        });

        setShiftSummary(summary);
      }
    } catch (error) {
      console.error('❌ Errore caricamento riepilogo:', error);
    }
  };

  // Apri nuovo turno
  const handleOpenShift = async () => {
    if (!tenantId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          tenant_id: tenantId,
          opened_by: user?.id,
          opened_at: new Date().toISOString(),
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Aggiorna lo stato
      setCurrentShift({
        ...data,
        opened_by_email: user?.email
      });
      
      await loadShiftSummary(data.id);
      
    } catch (error) {
      console.error('❌ Errore apertura turno:', error);
      alert('Errore durante l\'apertura del turno');
    }
  };

  // Chiudi turno
  const handleCloseShift = async () => {
    if (!currentShift || !tenantId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('shifts')
        .update({
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
          status: 'closed'
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      // Aggiorna la lista
      setCurrentShift(null);
      setShiftSummary(null);
      setShowClosureModal(false);
      
      // Ricarica storico turni
      const { data: closedShifts } = await supabase
        .from('shifts')
        .select(`
          *,
          opened_by_user:opened_by (
            email
          ),
          closed_by_user:closed_by (
            email
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(10);

      setPastShifts(closedShifts?.map(s => ({
        ...s,
        opened_by_email: s.opened_by_user?.email,
        closed_by_email: s.closed_by_user?.email
      })) || []);
      
    } catch (error) {
      console.error('❌ Errore chiusura turno:', error);
      alert('Errore durante la chiusura del turno');
    }
  };

  // Formatta data/ora
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff" }}>
        Caricamento turni...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#0d1117",
      color: "#fff",
      padding: "20px"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <h1 style={{ color: BLUE, display: "flex", alignItems: "center", gap: "10px" }}>
            <FaClock /> Gestione Turni
          </h1>
          
          {!currentShift ? (
            <button
              onClick={handleOpenShift}
              style={{
                padding: "12px 24px",
                background: GREEN,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FaPlay /> APRI TURNO
            </button>
          ) : (
            <button
              onClick={() => setShowClosureModal(true)}
              style={{
                padding: "12px 24px",
                background: RED,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FaStop /> CHIUDI TURNO
            </button>
          )}
        </div>

        {/* Turno Corrente */}
        {currentShift && (
          <div style={{
            background: BG_DARK,
            border: `2px solid ${GREEN}`,
            borderRadius: "12px",
            padding: "25px",
            marginBottom: "30px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{
                width: "12px",
                height: "12px",
                background: GREEN,
                borderRadius: "50%",
                animation: "pulse 2s infinite"
              }} />
              <h2 style={{ color: GREEN, margin: 0 }}>TURNO APERTO</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              <div>
                <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                  <FaUser /> Aperto da
                </div>
                <div style={{ fontWeight: "bold" }}>{currentShift.opened_by_email || 'Operatore'}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {formatDateTime(currentShift.opened_at)}
                </div>
              </div>

              {shiftSummary && (
                <>
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                      <FaMoneyBillWave /> Transazioni
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                      {shiftSummary.transaction_count}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                      <FaCoins /> Contanti
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: GREEN }}>
                      € {shiftSummary.total_cash.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                      <FaCreditCard /> Carta
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: BLUE }}>
                      € {shiftSummary.total_card.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                      <FaMoneyBillWave /> Altro
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: ORANGE }}>
                      € {shiftSummary.total_other.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                      <FaChartLine /> Totale
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>
                      € {(shiftSummary.total_cash + shiftSummary.total_card + shiftSummary.total_other).toFixed(2)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Storico Turni */}
        <div style={{
          background: BG_DARK,
          borderRadius: "12px",
          padding: "25px"
        }}>
          <h2 style={{ color: BLUE, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaHistory /> Storico Turni (ultimi 10)
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pastShifts.map((shift) => (
              <div
                key={shift.id}
                style={{
                  background: BG_LIGHTER,
                  borderRadius: "8px",
                  padding: "15px",
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr auto",
                  alignItems: "center",
                  gap: "15px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  border: "1px solid transparent"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = BLUE}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
                onClick={() => setSelectedShift(shift)}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    <FaCalendarAlt /> Apertura
                  </div>
                  <div>{formatDate(shift.opened_at)}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    {formatTime(shift.opened_at)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    <FaCalendarAlt /> Chiusura
                  </div>
                  {shift.closed_at ? (
                    <>
                      <div>{formatDate(shift.closed_at)}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {formatTime(shift.closed_at)}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: ORANGE }}>Non chiuso</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    <FaUser /> Operatore
                  </div>
                  <div style={{ fontSize: "14px" }}>{shift.opened_by_email || 'N/D'}</div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    Stato
                  </div>
                  <span style={{
                    background: shift.status === 'open' ? ORANGE : '#2d4d32',
                    color: shift.status === 'open' ? '#fff' : GREEN,
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}>
                    {shift.status === 'open' ? 'APERTO' : 'CHIUSO'}
                  </span>
                </div>

                <button
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${BLUE}`,
                    borderRadius: "4px",
                    color: BLUE,
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShift(shift);
                  }}
                >
                  Dettagli
                </button>
              </div>
            ))}

            {pastShifts.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                Nessun turno precedente trovato
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chiusura Turno */}
      {showClosureModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div style={{
            background: BG_DARK,
            padding: "30px",
            borderRadius: "12px",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h2 style={{ color: RED, marginBottom: "20px" }}>
              Chiudi Turno
            </h2>

            {shiftSummary && (
              <div style={{ marginBottom: "20px", padding: "15px", background: BG_LIGHTER, borderRadius: "8px" }}>
                <h3 style={{ color: "#fff", marginBottom: "10px" }}>Riepilogo Incassi</h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Contanti:</span>
                    <span style={{ color: GREEN }}>€ {shiftSummary.total_cash.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Carta:</span>
                    <span style={{ color: BLUE }}>€ {shiftSummary.total_card.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Altro:</span>
                    <span style={{ color: ORANGE }}>€ {shiftSummary.total_other.toFixed(2)}</span>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid #333"
                  }}>
                    <strong>TOTALE:</strong>
                    <strong>€ {(shiftSummary.total_cash + shiftSummary.total_card + shiftSummary.total_other).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="Note di chiusura (opzionale)"
              rows={3}
              style={{
                width: "100%",
                padding: "10px",
                background: BG_LIGHTER,
                border: "1px solid #333",
                borderRadius: "4px",
                color: "#fff",
                marginBottom: "20px",
                resize: "vertical"
              }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCloseShift}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: RED,
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                CONFERMA CHIUSURA
              </button>
              <button
                onClick={() => setShowClosureModal(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                ANNULLA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Turno */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          paymentMethods={paymentMethods}
          onClose={() => setSelectedShift(null)}
        />
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Modal Dettaglio Turno
function ShiftDetailModal({ shift, paymentMethods, onClose }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const loadPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select(`
          *,
          payment_method:payment_method_id (
            name,
            code,
            is_cash
          )
        `)
        .eq('shift_id', shift.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPayments(data);
        
        const totals = {
          cash: 0,
          card: 0,
          other: 0,
          total: 0
        };

        data.forEach((p: any) => {
          totals.total += p.amount;
          if (p.payment_method?.is_cash) {
            totals.cash += p.amount;
          } else if (p.payment_method?.code === 'CARD') {
            totals.card += p.amount;
          } else {
            totals.other += p.amount;
          }
        });

        setSummary(totals);
      }
    };

    loadPayments();
  }, [shift.id]);

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000
    }}>
      <div style={{
        background: BG_DARK,
        padding: "30px",
        borderRadius: "12px",
        maxWidth: "800px",
        width: "90%",
        maxHeight: "80vh",
        overflow: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: BLUE }}>Dettaglio Turno</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: "20px", padding: "15px", background: BG_LIGHTER, borderRadius: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>Apertura</div>
              <div>{formatDateTime(shift.opened_at)}</div>
              <div style={{ fontSize: "12px", color: "#9ca3af" }}>da {shift.opened_by_email}</div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>Chiusura</div>
              {shift.closed_at ? (
                <>
                  <div>{formatDateTime(shift.closed_at)}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>da {shift.closed_by_email}</div>
                </>
              ) : (
                <div style={{ color: ORANGE }}>Non chiuso</div>
              )}
            </div>
          </div>
        </div>

        {summary && (
          <div style={{ marginBottom: "20px", padding: "15px", background: BG_LIGHTER, borderRadius: "8px" }}>
            <h3 style={{ marginBottom: "10px" }}>Riepilogo Incassi</h3>
            <div style={{ display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Contanti:</span>
                <span style={{ color: GREEN }}>€ {summary.cash.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Carta:</span>
                <span style={{ color: BLUE }}>€ {summary.card.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Altro:</span>
                <span style={{ color: ORANGE }}>€ {summary.other.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between",
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #333"
              }}>
                <strong>TOTALE:</strong>
                <strong>€ {summary.total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        <h3 style={{ marginBottom: "15px" }}>Elenco Pagamenti</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {payments.map((payment) => (
            <div key={payment.id} style={{
              padding: "12px",
              background: BG_LIGHTER,
              borderRadius: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>{formatDateTime(payment.created_at)}</div>
                <div>{payment.payment_method?.name || 'Metodo sconosciuto'}</div>
                {payment.reference_type && (
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {payment.reference_type}: {payment.reference_id}
                  </div>
                )}
              </div>
              <div style={{ 
                fontSize: "16px", 
                fontWeight: "bold",
                color: payment.payment_method?.is_cash ? GREEN : (payment.payment_method?.code === 'CARD' ? BLUE : ORANGE)
              }}>
                € {payment.amount.toFixed(2)}
              </div>
            </div>
          ))}

          {payments.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
              Nessun pagamento registrato in questo turno
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
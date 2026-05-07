import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { 
  FaCar, 
  FaClock, 
  FaCheckCircle, 
  FaSearch,
  FaFilter,
  FaSync,
  FaEye,
  FaMoneyBillWave,
  FaTicketAlt,
  FaUser,
  FaCalendarAlt,
  FaIdCard,
  FaArrowLeft,
  FaStickyNote,
  FaSoap,
  FaFileContract
} from "react-icons/fa";

// Colori
const BLUE = "#4f8cff";
const GREEN = "#10b981";
const RED = "#ef4444";
const ORANGE = "#f59e0b";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

interface ParkingSession {
  id: string;
  ticket_number: number;
  entry_time: string;
  exit_time: string | null;
  status: 'active' | 'completed';
  final_amount: number | null;
  customer_id: string | null;
  notes?: string | null;
  payment_method?: {
    name: string;
    is_cash?: boolean;
  } | null;
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  parking_session_vehicles?: Array<{
    plate: string;
    brand_name: string;
    model_name: string;
    category_name: string;
    color: string;
  }>;
  parking_session_wash_services?: Array<{
    wash_service_name?: string;
    wash_service_type?: string;
    amount: number;
  }>;
  convention_name?: string;
  service_type?: 'parking' | 'convention' | 'wash';
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<ParkingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<ParkingSession[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<ParkingSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Recupera tenant ID
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

  // Determina il tipo di servizio della sessione
  const getServiceType = (session: any): 'parking' | 'convention' | 'wash' => {
    if (session.convention_id) return 'convention';
    if (session.parking_session_wash_services?.length > 0) return 'wash';
    return 'parking';
  };

  // Carica sessioni
  useEffect(() => {
    if (!tenantId) return;

    const loadSessions = async () => {
      setLoading(true);
      try {
        // Carica sessioni attive
        const { data: active, error: activeError } = await supabase
          .from('parking_sessions')
          .select(`
            *,
            customer:customers (
              first_name,
              last_name,
              email,
              phone
            ),
            parking_session_vehicles (
              plate,
              brand_name,
              model_name,
              category_name,
              color
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'open')
          .order('entry_time', { ascending: false });

        if (activeError) throw activeError;
        
        // Carica servizi lavaggio per le sessioni attive
        const activeWithServices = await Promise.all((active || []).map(async (session) => {
          const { data: washServices } = await supabase
            .from('parking_session_wash_services')
            .select('*')
            .eq('parking_session_id', session.id);
          
          let conventionName = null;
          if (session.convention_id) {
            const { data: convention } = await supabase
              .from('conventions')
              .select('name')
              .eq('id', session.convention_id)
              .single();
            conventionName = convention?.name;
          }
          
          return {
            ...session,
            status: 'active',
            service_type: getServiceType({ ...session, parking_session_wash_services: washServices }),
            convention_name: conventionName,
            parking_session_wash_services: washServices || []
          };
        }));
        
        setActiveSessions(activeWithServices);

        // Carica sessioni chiuse (versione semplificata senza payments nella select)
        const { data: completed, error: completedError } = await supabase
          .from('parking_sessions')
          .select(`
            *,
            customer:customers (
              first_name,
              last_name,
              email,
              phone
            ),
            parking_session_vehicles (
              plate,
              brand_name,
              model_name,
              category_name,
              color
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'closed')
          .order('exit_time', { ascending: false })
          .limit(50);

        if (completedError) throw completedError;
        
        // Carica wash services, convenzioni e pagamenti per le sessioni chiuse
        const completedWithDetails = await Promise.all((completed || []).map(async (session) => {
          // Wash services
          const { data: washServices } = await supabase
            .from('parking_session_wash_services')
            .select('*')
            .eq('parking_session_id', session.id);
          
          // Convenzione
          let conventionName = null;
          if (session.convention_id) {
            const { data: convention } = await supabase
              .from('conventions')
              .select('name')
              .eq('id', session.convention_id)
              .single();
            conventionName = convention?.name;
          }
          
          // Pagamento (caricato separatamente)
          const { data: paymentData } = await supabase
            .from('payments')
            .select(`
              amount,
              payment_method:payment_methods (
                name,
                is_cash
              )
            `)
            .eq('reference_id', session.id)
            .eq('reference_type', 'parking_session')
            .maybeSingle();
          
          return {
            ...session,
            status: 'completed',
            service_type: getServiceType({ ...session, parking_session_wash_services: washServices }),
            convention_name: conventionName,
            parking_session_wash_services: washServices || [],
            payment_method: paymentData?.payment_method || null
          };
        }));
        
        setCompletedSessions(completedWithDetails);

      } catch (error) {
        console.error('❌ Errore caricamento sessioni:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();

    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [tenantId]);

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

  // Calcola durata sosta
  const calculateDuration = (entry: string, exit?: string | null) => {
    const start = new Date(entry);
    const end = exit ? new Date(exit) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  // Ottieni il nome del servizio per la visualizzazione
  const getServiceDisplay = (session: ParkingSession) => {
    if (session.service_type === 'convention') {
      return { icon: <FaFileContract size={12} />, text: session.convention_name || 'Convenzione', color: ORANGE };
    }
    if (session.service_type === 'wash') {
      const washNames = session.parking_session_wash_services?.map(w => w.wash_service_name || 'Lavaggio').join(', ');
      return { icon: <FaSoap size={12} />, text: washNames || 'Lavaggio', color: BLUE };
    }
    return { icon: <FaCar size={12} />, text: 'Sosta', color: GREEN };
  };

  // Filtra sessioni
  const getFilteredSessions = () => {
    let sessions: ParkingSession[] = [];
    
    if (filter === 'active' || filter === 'all') {
      sessions = [...sessions, ...activeSessions];
    }
    if (filter === 'completed' || filter === 'all') {
      sessions = [...sessions, ...completedSessions];
    }

    // Filtro per tipo servizio
    if (serviceFilter !== 'all') {
      sessions = sessions.filter(s => s.service_type === serviceFilter);
    }

    // Filtro per ricerca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      sessions = sessions.filter(s => 
        s.ticket_number.toString().includes(term) ||
        s.parking_session_vehicles?.[0]?.plate?.toLowerCase().includes(term) ||
        s.customer?.first_name?.toLowerCase().includes(term) ||
        s.customer?.last_name?.toLowerCase().includes(term) ||
        s.customer?.email?.toLowerCase().includes(term)
      );
    }

    return sessions;
  };

  const filteredSessions = getFilteredSessions();

  if (loading && !tenantId) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: "#0d1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff"
      }}>
        Caricamento...
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Header con navigazione */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "20px",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "8px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = BG_LIGHTER}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <FaArrowLeft />
            </button>
            <h1 style={{ color: BLUE, display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <FaCar /> Soste Attive e Chiuse
            </h1>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              background: BG_LIGHTER,
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <FaSync /> Aggiorna
          </button>
        </div>

        {/* Filtri e ricerca */}
        <div style={{ 
          background: BG_DARK,
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "30px"
        }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {/* Filtro stato */}
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px", display: "block" }}>
                <FaFilter /> Stato
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: BG_LIGHTER,
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "14px"
                }}
              >
                <option value="all">Tutte le soste</option>
                <option value="active">Soste attive</option>
                <option value="completed">Soste concluse</option>
              </select>
            </div>

            {/* Filtro per servizio */}
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px", display: "block" }}>
                <FaFilter /> Tipo servizio
              </label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: BG_LIGHTER,
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "14px"
                }}
              >
                <option value="all">Tutti i servizi</option>
                <option value="parking">🚗 Sosta</option>
                <option value="convention">📄 Convenzione</option>
                <option value="wash">🧼 Lavaggio</option>
              </select>
            </div>

            {/* Ricerca */}
            <div style={{ flex: 2, minWidth: "300px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px", display: "block" }}>
                <FaSearch /> Cerca per ticket, targa o cliente
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Inserisci ticket, targa, nome cliente..."
                style={{
                  width: "100%",
                  padding: "10px",
                  background: BG_LIGHTER,
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {/* Statistiche rapide */}
          <div style={{ 
            display: "flex", 
            gap: "20px", 
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #333"
          }}>
            <div>
              <span style={{ color: "#9ca3af" }}>Soste attive:</span>
              <span style={{ marginLeft: "10px", color: GREEN, fontWeight: "bold" }}>
                {activeSessions.length}
              </span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>Soste concluse (ultime 50):</span>
              <span style={{ marginLeft: "10px", color: BLUE, fontWeight: "bold" }}>
                {completedSessions.length}
              </span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>Totale visualizzate:</span>
              <span style={{ marginLeft: "10px", color: "#fff", fontWeight: "bold" }}>
                {filteredSessions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Lista sessioni */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredSessions.map((session) => {
            const vehicle = session.parking_session_vehicles?.[0];
            const isActive = session.status === 'active';
            const serviceInfo = getServiceDisplay(session);
            const hasNotes = session.notes && session.notes.trim().length > 0;
            
            return (
              <div
                key={session.id}
                style={{
                  background: BG_DARK,
                  borderRadius: "10px",
                  padding: "15px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "20px",
                  alignItems: "center",
                  border: `1px solid ${isActive ? GREEN : 'transparent'}`,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onClick={() => {
                  setSelectedSession(session);
                  setShowDetailModal(true);
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = BG_LIGHTER}
                onMouseLeave={(e) => e.currentTarget.style.background = BG_DARK}
              >
                {/* Icona stato */}
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: isActive ? `${GREEN}20` : `${RED}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isActive ? GREEN : RED
                }}>
                  {isActive ? <FaClock size={20} /> : <FaCheckCircle size={20} />}
                </div>

                {/* Info principali */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "15px" }}>
                  {/* Ticket */}
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FaTicketAlt size={10} /> Ticket
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                      #{session.ticket_number}
                      {hasNotes && (
                        <span style={{ color: ORANGE, fontSize: "12px", cursor: "help" }} title={session.notes || ''}>
                          📝
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Servizio */}
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      {serviceInfo.icon} Servizio
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "13px", color: serviceInfo.color }}>
                      {serviceInfo.text}
                    </div>
                  </div>

                  {/* Targa */}
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FaIdCard size={10} /> Targa
                    </div>
                    <div style={{ fontWeight: "bold", fontFamily: "monospace", fontSize: "14px" }}>
                      {vehicle?.plate || 'N/D'}
                    </div>
                  </div>

                  {/* Veicolo */}
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px" }}>Veicolo</div>
                    <div style={{ fontSize: "13px" }}>
                      {vehicle?.brand_name} {vehicle?.model_name}
                    </div>
                    <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                      {vehicle?.category_name} {vehicle?.color && `- ${vehicle.color}`}
                    </div>
                  </div>

                  {/* Orari */}
                  <div>
                    <div style={{ color: "#9ca3af", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FaCalendarAlt size={10} /> Ingresso
                    </div>
                    <div style={{ fontSize: "13px" }}>{formatTime(session.entry_time)}</div>
                    <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                      {formatDate(session.entry_time)}
                    </div>
                  </div>

                  {/* Durata / Uscita */}
                  <div>
                    {isActive ? (
                      <>
                        <div style={{ color: "#9ca3af", fontSize: "11px" }}>Durata</div>
                        <div style={{ color: GREEN, fontWeight: "bold", fontSize: "13px" }}>
                          {calculateDuration(session.entry_time)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: "#9ca3af", fontSize: "11px" }}>Uscita</div>
                        <div style={{ fontSize: "13px" }}>{session.exit_time ? formatTime(session.exit_time) : 'N/D'}</div>
                        <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                          {session.exit_time ? formatDate(session.exit_time) : ''}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Importo */}
                  {!isActive && session.final_amount !== null && (
                    <div>
                      <div style={{ color: "#9ca3af", fontSize: "11px" }}>Importo</div>
                      <div style={{ color: BLUE, fontWeight: "bold", fontSize: "13px" }}>
                        € {session.final_amount.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pulsante dettaglio */}
                <button
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: `1px solid ${BLUE}`,
                    borderRadius: "6px",
                    color: BLUE,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSession(session);
                    setShowDetailModal(true);
                  }}
                >
                  <FaEye /> Dettaglio
                </button>
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <div style={{ 
              background: BG_DARK,
              borderRadius: "10px",
              padding: "60px",
              textAlign: "center",
              color: "#9ca3af"
            }}>
              <FaCar size={48} style={{ opacity: 0.3, marginBottom: "15px" }} />
              <h3>Nessuna sosta trovata</h3>
              <p style={{ marginTop: "10px" }}>
                {searchTerm 
                  ? "Prova a modificare i criteri di ricerca"
                  : filter === 'active' 
                    ? "Non ci sono soste attive al momento"
                    : filter === 'completed'
                      ? "Non ci sono soste concluse negli ultimi record"
                      : "Non ci sono soste nel sistema"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal dettaglio sosta */}
      {showDetailModal && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setShowDetailModal(false)}
          onViewPayment={() => {
            if (selectedSession.status === 'active') {
              navigate('/exit', { state: { ticket: selectedSession.ticket_number } });
            }
            setShowDetailModal(false);
          }}
        />
      )}
    </div>
  );
}

// Modal Dettaglio Sosta
function SessionDetailModal({ session, onClose, onViewPayment }: any) {
  const vehicle = session.parking_session_vehicles?.[0];
  const washServices = session.parking_session_wash_services || [];

  const getServiceDisplay = (s: any) => {
    if (s.service_type === 'convention') {
      return { icon: <FaFileContract size={14} />, text: s.convention_name || 'Convenzione', color: ORANGE };
    }
    if (s.service_type === 'wash') {
      const washNames = s.parking_session_wash_services?.map((w: any) => w.wash_service_name || 'Lavaggio').join(', ');
      return { icon: <FaSoap size={14} />, text: washNames || 'Lavaggio', color: BLUE };
    }
    return { icon: <FaCar size={14} />, text: 'Sosta', color: GREEN };
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDuration = (entry: string, exit?: string | null) => {
    const start = new Date(entry);
    const end = exit ? new Date(exit) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
  };

  const serviceInfo = getServiceDisplay(session);

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
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflow: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: BLUE, display: "flex", alignItems: "center", gap: "10px" }}>
            <FaCar /> Dettaglio Sosta #{session.ticket_number}
          </h2>
          <button 
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#fff", fontSize: "24px", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* Stato */}
          <div style={{ 
            padding: "10px", 
            background: BG_LIGHTER, 
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: session.status === 'active' ? GREEN : RED
            }} />
            <span style={{ fontWeight: "bold" }}>
              {session.status === 'active' ? '🟢 SOSTA ATTIVA' : '🔴 SOSTA CONCLUSA'}
            </span>
          </div>

          {/* Tipo servizio */}
          <div style={{ 
            padding: "10px", 
            background: BG_LIGHTER, 
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: `1px solid ${serviceInfo.color}`
          }}>
            {serviceInfo.icon}
            <span style={{ fontWeight: "bold", color: serviceInfo.color }}>
              {serviceInfo.text}
            </span>
          </div>

          {/* Ticket e Targa */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "15px",
            padding: "15px",
            background: BG_LIGHTER,
            borderRadius: "8px"
          }}>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                <FaTicketAlt /> Ticket
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>
                #{session.ticket_number}
              </div>
            </div>
            <div>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                <FaIdCard /> Targa
              </div>
              <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "monospace" }}>
                {vehicle?.plate || 'N/D'}
              </div>
            </div>
          </div>

          {/* Veicolo */}
          {vehicle && (
            <div style={{ 
              padding: "15px", 
              background: BG_LIGHTER, 
              borderRadius: "8px" 
            }}>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "10px" }}>
                <FaCar /> Veicolo
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Marca</div>
                  <div>{vehicle.brand_name || 'N/D'}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Modello</div>
                  <div>{vehicle.model_name || 'N/D'}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Categoria</div>
                  <div>{vehicle.category_name || 'N/D'}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Colore</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {vehicle.color && vehicle.color !== 'N/D' && (
                      <div style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        background: vehicle.color,
                        border: "1px solid #666"
                      }} />
                    )}
                    {vehicle.color || 'N/D'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {session.notes && (
            <div style={{ 
              padding: "15px", 
              background: `${ORANGE}20`, 
              borderRadius: "8px",
              border: `1px solid ${ORANGE}`
            }}>
              <div style={{ color: ORANGE, fontSize: "12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaStickyNote /> Note
              </div>
              <div style={{ fontSize: "14px", color: "#fff" }}>
                {session.notes}
              </div>
            </div>
          )}

          {/* Servizi lavaggio */}
          {washServices.length > 0 && (
            <div style={{ 
              padding: "15px", 
              background: BG_LIGHTER, 
              borderRadius: "8px" 
            }}>
              <div style={{ color: BLUE, fontSize: "12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaSoap /> Servizi Lavaggio
              </div>
              {washServices.map((wash: any, idx: number) => (
                <div key={idx} style={{ 
                  display: "flex", 
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: idx < washServices.length - 1 ? "1px solid #333" : "none"
                }}>
                  <span>{wash.wash_service_name || 'Lavaggio'}</span>
                  <span style={{ color: BLUE }}>€ {wash.amount?.toFixed(2) || '0.00'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Orari */}
          <div style={{ 
            padding: "15px", 
            background: BG_LIGHTER, 
            borderRadius: "8px" 
          }}>
            <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "10px" }}>
              <FaClock /> Orari
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>Ingresso</div>
                <div style={{ fontWeight: "bold", fontSize: "13px" }}>{formatDateTime(session.entry_time)}</div>
              </div>
              {session.exit_time && (
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>Uscita</div>
                  <div style={{ fontWeight: "bold", fontSize: "13px" }}>{formatDateTime(session.exit_time)}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: "10px", padding: "10px", background: BG_DARK, borderRadius: "6px" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>Durata totale</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: BLUE }}>
                {calculateDuration(session.entry_time, session.exit_time)}
              </div>
            </div>
          </div>

          {/* Importo + Metodo pagamento */}
          {session.final_amount !== null && (
            <div style={{ 
              padding: "15px", 
              background: BG_LIGHTER, 
              borderRadius: "8px",
              border: `2px solid ${BLUE}`
            }}>
              <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "5px" }}>
                <FaMoneyBillWave /> Importo pagato
              </div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: BLUE }}>
                € {session.final_amount.toFixed(2)}
              </div>
              {session.payment_method && (
                <div style={{ 
                  marginTop: "10px", 
                  padding: "8px", 
                  background: BG_DARK, 
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span>💳 Pagato con:</span>
                  <span style={{ fontWeight: "bold" }}>
                    {session.payment_method.is_cash ? 'Contanti' : session.payment_method.name || 'Carta'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pulsanti azione */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            {session.status === 'active' && (
              <button
                onClick={onViewPayment}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: GREEN,
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <FaMoneyBillWave /> PROCEDI AL PAGAMENTO
              </button>
            )}
            <button
              onClick={onClose}
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
              CHIUDI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
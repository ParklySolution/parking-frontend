// src/pages/Dashboard/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";

import PlatesLogTable from "@/components/PlatesLogTable";
import KpiBar from "@/components/dashboard/KpiBar";
import AccessGate from "@/components/dashboard/AccessGate";
import TicketExitModal from "@/components/exit/TicketExitModal";

import { fetchPlateLogs } from "@/services/plateLogsService";
import type { PlateLog } from "@/types/plateLog";

// Import icone da react-icons
import { 
  FaSignInAlt, 
  FaSignOutAlt, 
  FaTicketAlt, 
  FaFileContract, 
  FaChartBar, 
  FaCog,
  FaCamera,
  FaCar,
  FaHistory,
  FaClock,
  FaPlusCircle,
  FaSyncAlt  // Nuova icona per rinnovo
} from "react-icons/fa";

import "@/styles/dashboard.css";

type GateStatus = "idle" | "checking" | "allowed" | "blocked";

export default function Dashboard() {
  const navigate = useNavigate();

  // Stati per tenant e autenticazione
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  const [logs, setLogs] = useState<PlateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateStatus, setGateStatus] = useState<GateStatus>("idle");

  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Targhe di esempio predefinite (solo se non ci sono log)
  const samplePlates = [
    { plate: 'AA123BB', time: '10:30' },
    { plate: 'BC456CD', time: '10:28' },
    { plate: 'DE789EF', time: '10:25' },
    { plate: 'FG012GH', time: '10:22' },
    { plate: 'HI345IL', time: '10:18' },
    { plate: 'JK678MN', time: '10:15' }
  ];

  /* ===============================
     RECUPERA TENANT ID DAL LOGIN
     =============================== */
  useEffect(() => {
    const getTenantId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔍 Utente loggato:', user?.email);
        
        if (!user) {
          console.error('❌ Nessun utente loggato');
          setLoadingTenant(false);
          return;
        }

        // Recupera il profilo dell'utente per ottenere tenant_id
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ Errore recupero profilo:', error);
          setLoadingTenant(false);
          return;
        }

        if (profile?.tenant_id) {
          console.log('🏢 Tenant ID recuperato:', profile.tenant_id);
          setTenantId(profile.tenant_id);
        } else {
          console.error('❌ Nessun tenant_id associato al profilo');
        }
      } catch (err) {
        console.error('❌ Errore recupero tenant ID:', err);
      } finally {
        setLoadingTenant(false);
      }
    };

    getTenantId();
  }, []);

  /* ===============================
     BODY CLASS
     =============================== */
  useEffect(() => {
    document.body.classList.add("dashboard-active");
    return () => {
      document.body.classList.remove("dashboard-active");
    };
  }, []);

  /* ===============================
     CARICAMENTO LOG TARGHE
     =============================== */
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        setGateStatus("checking");

        const data = await fetchPlateLogs();
        setLogs(data);

        if (data.length > 0) {
          const last = data[0];
          setGateStatus(last.allowed ? "allowed" : "blocked");
        } else {
          setGateStatus("idle");
        }
      } catch (e) {
        console.error("Errore caricamento log", e);
        setGateStatus("blocked");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ===============================
     CONFERMA NUMERO TICKET
     =============================== */
  const handleTicketConfirm = (ticketNumber: number) => {
    setShowExitModal(false);
    navigate("/exit", {
      state: { ticket: ticketNumber },
    });
  };

  /* ===============================
     GESTIONE CLICK CONTRATTI (NUOVO CONTRATTO)
     =============================== */
  const handleContractsClick = async () => {
    try {
      if (!tenantId) {
        alert("Tenant non identificato. Attendere il caricamento...");
        return;
      }
      
      navigate(`/tenant/${tenantId}/contracts`);
    } catch (error) {
      console.error("Errore nella navigazione contratti:", error);
      alert("Errore nell'aprire la pagina contratti");
    }
  };

  /* ===============================
     GESTIONE CLICK GESTIONE CONTRATTI
     =============================== */
  const handleContractsManagementClick = () => {
    if (!tenantId) {
      alert("Tenant non identificato. Attendere il caricamento...");
      return;
    }
    navigate(`/tenant/${tenantId}/contracts-management`);
  };

  /* ===============================
     ⭐ NUOVO: GESTIONE CLICK RINNOVO ABBONAMENTO
     =============================== */
  const handleSubscriptionRenewalClick = () => {
    if (!tenantId) {
      alert("Tenant non identificato. Attendere il caricamento...");
      return;
    }
    navigate(`/tenant/${tenantId}/subscription-renewal`);
  };

  /* ===============================
     NAVIGA A INGRESSO CON TARGA
     =============================== */
  const handleGoToIngresso = (plate?: string) => {
    navigate("/ingresso", {
      state: { plate: plate || "" },
    });
  };

  // Mostra loading mentre si recupera il tenant
  if (loadingTenant) {
    return (
      <div className="dashboard-container">
        <div className="dashboard">
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            height: "100vh",
            color: "#fff"
          }}>
            Caricamento sessione...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-container">
        <div className="dashboard">
          {/* ================= HEADER ================= */}
          <header className="dashboard-header">
            <button
              className="btn-entry"
              onClick={() => handleGoToIngresso(selectedPlate || undefined)}
              style={{
                background: selectedPlate ? "#4f8cff" : "#2d3748",
                opacity: selectedPlate ? 1 : 0.7
              }}
            >
              <FaSignInAlt /> 
              {selectedPlate ? `ENTRATA ${selectedPlate}` : "NUOVA ENTRATA"}
            </button>

            <div className="datetime-box">
              <div className="date">
                <FaClock style={{ marginRight: "8px", opacity: 0.7 }} />
                {new Date().toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="time">
                {new Date().toLocaleTimeString("it-IT")}
              </div>
            </div>

            <button
              className="btn-exit"
              onClick={() => setShowExitModal(true)}
            >
              USCITA <FaSignOutAlt />
            </button>
          </header>

          {/* ================= KPI ================= */}
          <KpiBar logs={logs} />

          {/* ================= GRID ================= */}
          <main className="dashboard-grid">
            {/* TARGHE LIVE */}
            <section className="grid-cell targhe-live">
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: "15px" 
              }}>
                <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaCar color="#4f8cff" /> Targhe rilevate
                </h3>
                
                {/* Icona fotocamera per nuovo ingresso manuale */}
                <button
                  onClick={() => handleGoToIngresso()}
                  style={{
                    width: "40px",
                    height: "40px",
                    background: "#4f8cff",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "18px",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(79, 140, 255, 0.3)"
                  }}
                  title="Nuovo ingresso manuale"
                  onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#4f8cff"}
                >
                  <FaCamera />
                </button>
              </div>

              {/* Lista targhe */}
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {logs.length > 0 ? (
                  logs.slice(0, 6).map((log, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedPlate(log.plate)}
                      style={{
                        cursor: "pointer",
                        padding: "12px 16px",
                        margin: "4px 0",
                        borderRadius: "8px",
                        background: selectedPlate === log.plate ? "#4f8cff" : "#1a1f25",
                        color: selectedPlate === log.plate ? "#fff" : "#e6e6e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease",
                        border: "1px solid rgba(255,255,255,0.05)",
                        boxShadow: selectedPlate === log.plate ? "0 4px 12px rgba(79, 140, 255, 0.3)" : "none"
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPlate !== log.plate) {
                          e.currentTarget.style.background = "#2d3748";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPlate !== log.plate) {
                          e.currentTarget.style.background = "#1a1f25";
                        }
                      }}
                    >
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaCar size={12} style={{ opacity: 0.7 }} />
                        {log.plate}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: "12px" }}>
                        {new Date(log.timestamp).toLocaleTimeString("it-IT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))
                ) : (
                  // Targhe di esempio selezionabili
                  samplePlates.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedPlate(item.plate)}
                      style={{
                        cursor: "pointer",
                        padding: "12px 16px",
                        margin: "4px 0",
                        borderRadius: "8px",
                        background: selectedPlate === item.plate ? "#4f8cff" : "#1a1f25",
                        color: selectedPlate === item.plate ? "#fff" : "#e6e6e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease",
                        border: "1px solid rgba(255,255,255,0.05)",
                        boxShadow: selectedPlate === item.plate ? "0 4px 12px rgba(79, 140, 255, 0.3)" : "none"
                      }}
                      onMouseEnter={(e) => {
                        if (selectedPlate !== item.plate) {
                          e.currentTarget.style.background = "#2d3748";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedPlate !== item.plate) {
                          e.currentTarget.style.background = "#1a1f25";
                        }
                      }}
                    >
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaCar size={12} style={{ opacity: 0.7 }} />
                        {item.plate}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: "12px" }}>{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* FOTO */}
            <section className="grid-cell foto-targa">
              <div className="photo-box">
                <div className="photo-placeholder">
                  {selectedPlate ? (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <FaCamera style={{ fontSize: "64px", marginBottom: "10px", color: "#4f8cff" }} />
                      <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4f8cff" }}>
                        {selectedPlate}
                      </div>
                      <div style={{ marginTop: "10px", color: "#9ca3af" }}>
                        Targa selezionata
                      </div>
                      <button
                        onClick={() => handleGoToIngresso(selectedPlate)}
                        style={{
                          marginTop: "15px",
                          padding: "8px 16px",
                          background: "#4f8cff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px"
                        }}
                      >
                        <FaSignInAlt /> Entra con questa targa
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <FaCamera style={{ fontSize: "48px", marginBottom: "10px", color: "#666" }} />
                      <div style={{ color: "#9ca3af", marginBottom: "15px" }}>
                        Seleziona una targa o clicca sulla fotocamera
                      </div>
                      <button
                        onClick={() => handleGoToIngresso()}
                        style={{
                          padding: "10px 20px",
                          background: "#4f8cff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "16px"
                        }}
                      >
                        <FaPlusCircle /> Nuovo ingresso manuale
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* TRANSITI */}
            <section className="grid-cell transiti-live">
              <div className="live-box">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaHistory color="#4f8cff" /> Transiti in tempo reale
                </h3>

                <div className="gate-status-container">
                  <AccessGate
                    status={gateStatus}
                    onReset={() => setGateStatus("idle")}
                  />
                </div>

                <div className="transits-list">
                  <div className="list-header">
                    <span>ORA</span>
                    <span>TARGA</span>
                    <span>STATO</span>
                  </div>

                  {logs.slice(0, 5).map((log, index) => (
                    <div
                      key={index}
                      className={`transit-item ${log.allowed ? "allowed" : "blocked"}`}
                    >
                      <span className="transit-time">
                        {new Date(log.timestamp).toLocaleTimeString("it-IT")}
                      </span>
                      <span className="transit-plate">{log.plate}</span>
                      <span className={`transit-status ${log.allowed ? "allowed" : "blocked"}`}>
                        {log.allowed ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}

                  {logs.length === 0 && (
                    samplePlates.slice(0, 3).map((item, index) => (
                      <div key={index} className="transit-item allowed">
                        <span className="transit-time">{item.time}</span>
                        <span className="transit-plate">{item.plate}</span>
                        <span className="transit-status allowed">✓</span>
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="loading-transits">
                      Caricamento transiti...
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid-cell spazio-vuoto" />
            
            {/* MENU CON PULSANTI - VERSIONE COMPATTA */}
<section className="grid-cell menu">
  <div className="menu-box" style={{ 
    display: "flex", 
    flexDirection: "column", 
    gap: "6px",
    padding: "12px"
  }}>
    <button 
      onClick={() => navigate("/subscriptions")}
      style={{
        padding: "8px 10px",
        fontSize: "13px",
        background: "#2d3748",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#4a5568"}
      onMouseLeave={(e) => e.currentTarget.style.background = "#2d3748"}
    >
      <FaTicketAlt size={14} /> Abbonamenti
    </button>
    
    {/* PULSANTE RINNOVO ABBONAMENTO */}
    <button 
      onClick={handleSubscriptionRenewalClick}
      disabled={!tenantId}
      style={{ 
        padding: "8px 10px",
        fontSize: "13px",
        opacity: tenantId ? 1 : 0.5,
        background: "#10b981",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: tenantId ? "pointer" : "not-allowed",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        if (tenantId) e.currentTarget.style.background = "#059669";
      }}
      onMouseLeave={(e) => {
        if (tenantId) e.currentTarget.style.background = "#10b981";
      }}
    >
      <FaSyncAlt size={14} /> Rinnova
    </button>
    
    {/* PULSANTE NUOVO CONTRATTO */}
    <button 
      onClick={handleContractsClick}
      style={{
        padding: "8px 10px",
        fontSize: "13px",
        background: "#2d3748",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#4a5568"}
      onMouseLeave={(e) => e.currentTarget.style.background = "#2d3748"}
    >
      <FaFileContract size={14} /> Nuovo Contratto
    </button>

    {/* PULSANTE GESTIONE CONTRATTI */}
    <button 
      onClick={handleContractsManagementClick}
      disabled={!tenantId}
      style={{ 
        padding: "8px 10px",
        fontSize: "13px",
        opacity: tenantId ? 1 : 0.5,
        background: "#2d3748",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        cursor: tenantId ? "pointer" : "not-allowed",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => {
        if (tenantId) e.currentTarget.style.background = "#4a5568";
      }}
      onMouseLeave={(e) => {
        if (tenantId) e.currentTarget.style.background = "#2d3748";
      }}
    >
      <FaFileContract size={14} /> Gestione Contratti
    </button>
    
    {/* PULSANTE SOSTE */}
    <button 
      onClick={() => navigate("/sessions")}
      style={{ 
        padding: "8px 10px",
        fontSize: "13px",
        background: "#f59e0b",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#d97706"}
      onMouseLeave={(e) => e.currentTarget.style.background = "#f59e0b"}
    >
      <FaClock size={14} /> Soste
    </button>
    
    {/* PULSANTE TURNI */}
    <button 
      onClick={() => navigate("/shifts")}
      style={{ 
        padding: "8px 10px",
        fontSize: "13px",
        background: "#4f8cff",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#3a6ecf"}
      onMouseLeave={(e) => e.currentTarget.style.background = "#4f8cff"}
    >
      <FaClock size={14} /> Turni
    </button>
    
    {/* PULSANTE IMPOSTAZIONI */}
    <button 
      onClick={() => alert("Impostazioni - in sviluppo")}
      style={{
        padding: "8px 10px",
        fontSize: "13px",
        background: "#2d3748",
        border: "none",
        borderRadius: "6px",
        color: "#fff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
        opacity: 0.7
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#4a5568"}
      onMouseLeave={(e) => e.currentTarget.style.background = "#2d3748"}
    >
      <FaCog size={14} /> Impostazioni
    </button>
  </div>
</section>

            <section className="grid-cell storico">
              <div className="history-box">
                <PlatesLogTable logs={logs} loading={loading} />
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* ================= MODALE USCITA ================= */}
      {showExitModal && (
        <TicketExitModal
          onClose={() => setShowExitModal(false)}
          onConfirm={handleTicketConfirm}
        />
      )}
    </>
  );
}
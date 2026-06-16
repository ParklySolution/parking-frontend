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
  FaSyncAlt,
  FaGift
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
      
      navigate(`/operator/${tenantId}/contracts`);
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
    navigate(`/operator/${tenantId}/contracts-management`);
  };

  /* ===============================
     GESTIONE CLICK RINNOVO ABBONAMENTO
     =============================== */
  const handleSubscriptionRenewalClick = () => {
    if (!tenantId) {
      alert("Tenant non identificato. Attendere il caricamento...");
      return;
    }
    navigate(`/operator/${tenantId}/subscription-renewal`);
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
            {/* TARGHE LIVE - LEGGERMENTE RIDOTTO */}
            <section className="grid-cell targhe-live" style={{ height: "420px" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: "12px" 
              }}>
                <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaCar color="#4f8cff" /> Targhe rilevate
                </h3>
                
                <button
                  onClick={() => handleGoToIngresso()}
                  style={{
                    width: "36px",
                    height: "36px",
                    background: "#4f8cff",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <FaCamera />
                </button>
              </div>

              {/* Ridotto leggermente l'altezza massima */}
              <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                {logs.length > 0 ? (
                  logs.slice(0, 6).map((log, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedPlate(log.plate)}
                      style={{
                        cursor: "pointer",
                        padding: "10px 14px",
                        margin: "4px 0",
                        borderRadius: "8px",
                        background: selectedPlate === log.plate ? "#4f8cff" : "#1a1f25",
                        color: selectedPlate === log.plate ? "#fff" : "#e6e6e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaCar size={12} /> {log.plate}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: "11px" }}>
                        {new Date(log.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                ) : (
                  samplePlates.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedPlate(item.plate)}
                      style={{
                        cursor: "pointer",
                        padding: "10px 14px",
                        margin: "4px 0",
                        borderRadius: "8px",
                        background: selectedPlate === item.plate ? "#4f8cff" : "#1a1f25",
                        color: selectedPlate === item.plate ? "#fff" : "#e6e6e6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaCar size={12} /> {item.plate}
                      </span>
                      <span style={{ opacity: 0.7, fontSize: "11px" }}>{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* FOTO - LEGGERMENTE RIDOTTO */}
            <section className="grid-cell foto-targa" style={{ height: "420px" }}>
              <div className="photo-box" style={{ padding: "16px" }}>
                <div className="photo-placeholder" style={{ minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedPlate ? (
                    <div style={{ textAlign: "center", padding: "16px" }}>
                      <FaCamera style={{ fontSize: "56px", marginBottom: "12px", color: "#4f8cff" }} />
                      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4f8cff" }}>
                        {selectedPlate}
                      </div>
                      <button
                        onClick={() => handleGoToIngresso(selectedPlate)}
                        style={{
                          marginTop: "12px",
                          padding: "8px 16px",
                          background: "#4f8cff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <FaSignInAlt /> Entra
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "16px" }}>
                      <FaCamera style={{ fontSize: "48px", marginBottom: "12px", color: "#666" }} />
                      <button
                        onClick={() => handleGoToIngresso()}
                        style={{
                          padding: "10px 20px",
                          background: "#4f8cff",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <FaPlusCircle /> Nuovo ingresso
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* TRANSITI - LEGGERMENTE RIDOTTO */}
            <section className="grid-cell transiti-live" style={{ height: "420px" }}>
              <div className="live-box">
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaHistory color="#4f8cff" /> Transiti in tempo reale
                </h3>
                <div className="gate-status-container">
                  <AccessGate status={gateStatus} onReset={() => setGateStatus("idle")} />
                </div>
                <div className="transits-list" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  <div className="list-header">
                    <span>ORA</span>
                    <span>TARGA</span>
                    <span>STATO</span>
                  </div>
                  {logs.slice(0, 5).map((log, index) => (
                    <div key={index} className={`transit-item ${log.allowed ? "allowed" : "blocked"}`}>
                      <span className="transit-time">
                        {new Date(log.timestamp).toLocaleTimeString("it-IT")}
                      </span>
                      <span className="transit-plate">{log.plate}</span>
                      <span className={`transit-status ${log.allowed ? "allowed" : "blocked"}`}>
                        {log.allowed ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid-cell spazio-vuoto" />

            {/* MENU - AUMENTATO */}
            <section className="grid-cell menu">
              <div className="menu-box" style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "10px",
                padding: "20px 16px",
                minHeight: "10px"
              }}>
                {/* Abbonamenti */}
                <button onClick={() => navigate("/subscriptions")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaTicketAlt size={24} /><span>Abbonamenti</span>
                </button>
                <button onClick={handleSubscriptionRenewalClick} disabled={!tenantId} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", opacity: tenantId ? 1 : 0.5, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: tenantId ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaSyncAlt size={24} /><span>Rinnova</span>
                </button>
                <button onClick={handleContractsClick} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaFileContract size={24} /><span>Nuovo Contratto</span>
                </button>
                <button onClick={handleContractsManagementClick} disabled={!tenantId} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", opacity: tenantId ? 1 : 0.5, background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: tenantId ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaFileContract size={24} /><span>Gestione Contratti</span>
                </button>
                <button onClick={() => navigate("/sessions")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaClock size={24} /><span>Soste</span>
                </button>
                <button onClick={() => navigate("/shifts")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaClock size={24} /><span>Turni</span>
                </button>
                <button onClick={() => navigate("/outstanding-payments")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaTicketAlt size={24} /><span>Insoluti</span>
                </button>
                <button onClick={() => navigate("/fidelity-customers")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #ec489a 0%, #be185d 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <FaGift size={24} /><span>Clienti Fedeltà</span>
                </button>
                <button onClick={() => alert("Impostazioni")} style={{ padding: "14px 6px", fontSize: "13px", fontWeight: "600", background: "linear-gradient(135deg, #64748b 0%, #475569 100%)", border: "none", borderRadius: "10px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", opacity: 0.7 }}>
                  <FaCog size={24} /><span>Impostazioni</span>
                </button>
                <div></div><div></div><div></div>
              </div>
            </section>

            {/* STORICO */}
<section className="grid-cell storico">
  <div className="history-box" style={{ padding: "16px", overflowY: "auto" }}>
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
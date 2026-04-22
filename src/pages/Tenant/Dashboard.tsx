import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { useNavigate } from "react-router-dom";
import TenantLayout from "./layout/TenantLayout";
import { FaUsers, FaTicketAlt, FaCar, FaChartLine } from "react-icons/fa";

/* ======================================================
   STATI E INTERFACCE
   ====================================================== */

interface DashboardStats {
  todayEntries: number;
  todayExits: number;
  activeSubscriptions: number;
  activeSessions: number;
  occupancyRate: number;
  revenue: number;
}

export default function TenantDashboard() {
  const navigate = useNavigate();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [companyTenants, setCompanyTenants] = useState<any[]>([]);
  const [isSelectingTenant, setIsSelectingTenant] = useState(true);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayEntries: 0,
    todayExits: 0,
    activeSubscriptions: 0,
    activeSessions: 0,
    occupancyRate: 0,
    revenue: 0
  });

  const { flags, loading: flagsLoading } = useFeatureFlags(tenantId || "");

  /* ======================================================
     1️⃣ CARICAMENTO COMPANY → TENANTS
     ====================================================== */

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          setLoading(false);
          return;
        }

        // 1️⃣ Recupero il profilo del Company Owner
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", userId)
          .single();

        if (!profile?.company_id) {
          console.error("❌ Nessuna company associata all'utente");
          setLoading(false);
          return;
        }

        // 2️⃣ Recupero tutti i garage della company
        const { data: tenants } = await supabase
          .from("tenants")
          .select("id, name, address, city")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: true });

        setCompanyTenants(tenants || []);

        // 3️⃣ Se c'è un solo garage → seleziono automaticamente
        if (tenants && tenants.length === 1) {
          setTenantId(tenants[0].id);
          setIsSelectingTenant(false);
        } else {
          setIsSelectingTenant(true);
        }

      } catch (err) {
        console.error("Errore caricamento company/tenants:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ======================================================
     2️⃣ LOADING
     ====================================================== */

  if (loading || flagsLoading) {
    return (
      <TenantLayout>
        <div style={loadingContainer}>
          <div style={spinner}></div>
          <p style={{ color: "#9ca3af", marginTop: "16px" }}>Caricamento...</p>
        </div>
      </TenantLayout>
    );
  }

  /* ======================================================
     3️⃣ SELEZIONE GARAGE (solo se più di uno)
     ====================================================== */

  if (isSelectingTenant) {
    return (
      <TenantLayout>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={pageTitle}>I tuoi garage</h1>
          <p style={pageSubtitle}>Seleziona il garage che vuoi gestire</p>
        </div>

        {companyTenants.length === 0 && (
          <div style={errorContainer}>
            <span style={{ fontSize: "48px", marginBottom: "16px" }}>🏗️</span>
            <h2 style={{ color: "#fff", marginBottom: "8px" }}>
              Nessun garage configurato
            </h2>
            <p style={{ color: "#9ca3af" }}>
              Contatta il Super Admin per aggiungere un garage.
            </p>
          </div>
        )}

        {companyTenants.map((t) => (
          <div
            key={t.id}
            style={{
              background: "#111418",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}
            onClick={() => {
              setTenantId(t.id);
              setIsSelectingTenant(false);
            }}
          >
            <div style={{ color: "#fff", fontSize: "18px", fontWeight: 600 }}>
              {t.name}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "14px" }}>
              {t.address}, {t.city}
            </div>
          </div>
        ))}
      </TenantLayout>
    );
  }

  /* ======================================================
     4️⃣ DASHBOARD DEL GARAGE (come prima)
     ====================================================== */

  if (!tenantId) {
    return (
      <TenantLayout>
        <div style={errorContainer}>
          <span style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</span>
          <h2 style={{ color: "#ff4444", marginBottom: "8px" }}>Errore: Tenant non identificato</h2>
          <p style={{ color: "#9ca3af" }}>Impossibile caricare la dashboard.</p>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={pageTitle}>Dashboard Garage</h1>
          <p style={pageSubtitle}>Gestisci il tuo garage</p>
        </div>
        <div style={dateBadge}>
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Navigazione rapida */}
      <div style={quickNavStyle}>
        <button onClick={() => navigate(`/tenant/${tenantId}/abbonati`)} style={navButtonStyle}>
          <FaUsers style={{ fontSize: "20px" }} />
          <span>Gestione Abbonati</span>
        </button>

        <button onClick={() => navigate(`/tenant/${tenantId}/clienti`)} style={navButtonStyle}>
          <FaCar style={{ fontSize: "20px" }} />
          <span>Clienti</span>
        </button>

        <button onClick={() => navigate(`/tenant/${tenantId}/ingressi`)} style={navButtonStyle}>
          <FaTicketAlt style={{ fontSize: "20px" }} />
          <span>Ingressi</span>
        </button>

        <button onClick={() => navigate(`/tenant/${tenantId}/management/price-lists`)} style={navButtonStyle}>
          <FaChartLine style={{ fontSize: "20px" }} />
          <span>Tariffe</span>
        </button>
      </div>

      {/* KPI */}
      <div style={kpiGrid}>
        <StatCard label="Ingressi oggi" value={stats.todayEntries} icon="🚗" trend={+12} />
        <StatCard label="Uscite oggi" value={stats.todayExits} icon="💰" trend={+8} />
        <StatCard label="Sessioni attive" value={stats.activeSessions} icon="⏱️" trend={-3} />
        <StatCard label="Abbonamenti attivi" value={stats.activeSubscriptions} icon="📋" trend={+5} />
      </div>

      {/* Seconda riga */}
      <div style={secondaryGrid}>
        <div style={chartCard}>
          <div style={chartHeader}>
            <h3 style={chartTitle}>Occupazione parcheggio</h3>
            <span style={chartValue}>{stats.occupancyRate}%</span>
          </div>
          <div style={progressBarContainer}>
            <div style={{ ...progressBarFill, width: `${stats.occupancyRate}%` }} />
          </div>
          <p style={chartNote}>48 posti disponibili su 120</p>
        </div>

        <div style={revenueCard}>
          <h3 style={chartTitle}>Ricavi oggi</h3>
          <div style={revenueValue}>€ {stats.revenue.toFixed(2)}</div>
          <p style={revenueNote}>+15% rispetto a ieri</p>
        </div>
      </div>

      {/* Feature flags */}
      {flags?.analytics && (
        <div style={analyticsWidget}>
          <div style={analyticsHeader}>
            <h3 style={{ color: "#3B82F6", margin: 0 }}>📊 Analytics avanzati</h3>
            <span style={analyticsBadge}>ATTIVO</span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
            I report dettagliati sono disponibili nella sezione dedicata.
          </p>
        </div>
      )}
    </TenantLayout>
  );
}

/* ======================================================
   COMPONENTE STAT CARD
   ====================================================== */

function StatCard({ label, value, icon, trend }: { 
  label: string; 
  value: number; 
  icon: string;
  trend?: number;
}) {
  const trendColor = trend && trend > 0 ? "#10b981" : trend && trend < 0 ? "#ef4444" : "#9ca3af";
  const trendIcon = trend && trend > 0 ? "↑" : trend && trend < 0 ? "↓" : "→";

  return (
    <div style={statCardStyle}>
      <div style={statCardHeader}>
        <span style={statIcon}>{icon}</span>
        {trend !== undefined && (
          <span style={{ ...trendStyle, color: trendColor }}>
            {trendIcon} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* ======================================================
   STILI (identici ai tuoi)
   ====================================================== */

const loadingContainer = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px" };
const spinner = { width: "40px", height: "40px", border: "3px solid rgba(59, 130, 246, 0.1)", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 1s linear infinite" };
const errorContainer = { textAlign: "center", padding: "60px 20px" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "16px" };
const pageTitle = { fontSize: "28px", fontWeight: 700, color: "#fff", margin: "0 0 4px 0" };
const pageSubtitle = { fontSize: "14px", color: "#9ca3af", margin: 0 };
const dateBadge = { padding: "8px 16px", background: "#1a1f25", borderRadius: "8px", color: "#9ca3af", fontSize: "14px", border: "1px solid rgba(255,255,255,0.05)" };
const quickNavStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "30px" };
const navButtonStyle = { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "15px", background: "#1a1f25", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" };
const kpiGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "20px" };
const statCardStyle = { background: "#111418", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer" };
const statCardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" };
const statIcon = { fontSize: "24px", lineHeight: 1 };
const trendStyle = { fontSize: "12px", fontWeight: 600, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: "20px" };
const statValue = { fontSize: "32px", fontWeight: 700, color: "#fff", marginBottom: "4px" };
const statLabel = { fontSize: "14px", color: "#9ca3af" };
const secondaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" };
const chartCard = { background: "#111418", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" };
const chartHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" };
const chartTitle = { fontSize: "16px", fontWeight: 600, color: "#fff", margin: 0 };
const chartValue = { fontSize: "24px", fontWeight: 700, color: "#3B82F6" };
const progressBarContainer = { width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", marginBottom: "8px", overflow: "hidden" };
const progressBarFill = { height: "100%", background: "#3B82F6", borderRadius: "4px", transition: "width 0.3s ease" };
const chartNote = { fontSize: "12px", color: "#6b7280", margin: 0 };
const revenueCard = { background: "#111418", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "8px" };
const revenueValue = { fontSize: "32px", fontWeight: 700, color: "#10b981", lineHeight: 1.2 };
const revenueNote = { fontSize: "12px", color: "#6b7280", margin: 0 };
const analyticsWidget = { background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "12px", padding: "20px", marginTop: "20px" };
const analyticsHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" };
const analyticsBadge = { padding: "4px 8px", background: "#3B82F6", color: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: 600 };

const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

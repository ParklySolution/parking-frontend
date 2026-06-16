import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaTicketAlt, FaCar, FaChartLine, FaEuroSign } from "react-icons/fa";

/* ======================================================
   🔥 COLORI
   ====================================================== */
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";
const BG_MAIN = "#0d1117";

/* ======================================================
   INTERFACCE
   ====================================================== */
interface DashboardStats {
  todayEntries: number;
  todayExits: number;
  activeSubscriptions: number;
  activeSessions: number;
  occupancyRate: number;
  revenue: number;
  totalCustomers: number;
}

export default function TenantDashboard() {
  const navigate = useNavigate();
  
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayEntries: 0,
    todayExits: 0,
    activeSubscriptions: 0,
    activeSessions: 0,
    occupancyRate: 0,
    revenue: 0,
    totalCustomers: 0
  });

  /* ======================================================
     1️⃣ RECUPERO TENANT ID (Dagli User Metadata)
     ====================================================== */
  useEffect(() => {
    async function getTenantId() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userMetadata = session?.user?.user_metadata;
        
        if (userMetadata?.tenant_id) {
          setTenantId(userMetadata.tenant_id);
          setTenantName(userMetadata.full_name || "Garage");
        }
      } catch (err) {
        console.error("❌ Errore ricerca tenant:", err);
      } finally {
        setLoading(false);
      }
    }
    getTenantId();
  }, []);

  /* ======================================================
     2️⃣ CARICAMENTO STATISTICHE
     ====================================================== */
  const fetchStats = async (id: string) => {
    if (!id) return;
    setStatsLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;
      
      const [entries, exits, active, subs, customers, revenueRes] = await Promise.all([
        supabase.from("parking_sessions").select("*", { count: 'exact', head: true }).eq("tenant_id", id).gte("entry_time", startOfDay).lte("entry_time", endOfDay),
        supabase.from("parking_sessions").select("*", { count: 'exact', head: true }).eq("tenant_id", id).gte("exit_time", startOfDay).lte("exit_time", endOfDay),
        supabase.from("parking_sessions").select("*", { count: 'exact', head: true }).eq("tenant_id", id).is("exit_time", null),
        supabase.from("subscriptions").select("*", { count: 'exact', head: true }).eq("tenant_id", id).eq("is_active", true),
        supabase.from("customers").select("*", { count: 'exact', head: true }).eq("tenant_id", id),
        supabase.from("parking_sessions").select("final_amount").eq("tenant_id", id).gte("exit_time", startOfDay).lte("exit_time", endOfDay).eq("status", "completed")
      ]);

      const revTotal = revenueRes.data?.reduce((sum, s) => sum + (Number(s.final_amount) || 0), 0) || 0;
      const activeCount = active.count || 0;

      setStats({
        todayEntries: entries.count || 0,
        todayExits: exits.count || 0,
        activeSubscriptions: subs.count || 0,
        activeSessions: activeCount,
        occupancyRate: activeCount > 0 ? Math.min(Math.round((activeCount / 50) * 100), 100) : 0,
        revenue: revTotal,
        totalCustomers: customers.count || 0
      });
    } catch (err) {
      console.error("❌ Errore fetchStats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchStats(tenantId);
      const interval = setInterval(() => fetchStats(tenantId), 30000);
      return () => clearInterval(interval);
    }
  }, [tenantId]);

  /* ======================================================
     3️⃣ RENDERING
     ====================================================== */

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: "#9ca3af", marginTop: "16px" }}>Inizializzazione dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", background: BG_DARK, minHeight: "100vh" }}>
      
      {/* Header Interno della Pagina */}
      <div style={styles.headerStyle}>
        <div>
          <h1 style={styles.pageTitle}>🏢 Benvenuto, {tenantName}</h1>
          <p style={styles.pageSubtitle}>Monitoraggio attività in tempo reale</p>
        </div>
        <div style={styles.dateBadge}>
          📅 {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* Navigazione Rapida */}
      <div style={styles.quickNavStyle}>
        <button onClick={() => navigate(`/tenant/${tenantId}/ingressi`)} style={styles.navButtonStyle}><FaCar size={18} /> Ingressi</button>
        <button onClick={() => navigate(`/tenant/${tenantId}/uscite`)} style={styles.navButtonStyle}><FaTicketAlt size={18} /> Uscite</button>
        <button onClick={() => navigate(`/tenant/${tenantId}/clienti`)} style={styles.navButtonStyle}><FaUsers size={18} /> Clienti</button>
        <button onClick={() => navigate(`/tenant/${tenantId}/abbonati`)} style={styles.navButtonStyle}><FaChartLine size={18} /> Abbonati</button>
      </div>

      {/* Griglia KPI */}
      <div style={styles.kpiGrid}>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>🚗</div>
          <div style={styles.cardValue}>{stats.todayEntries}</div>
          <div style={styles.cardLabel}>Ingressi oggi</div>
        </div>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>💰</div>
          <div style={styles.cardValue}>{stats.todayExits}</div>
          <div style={styles.cardLabel}>Uscite oggi</div>
        </div>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>⏱️</div>
          <div style={styles.cardValue}>{stats.activeSessions}</div>
          <div style={styles.cardLabel}>Veicoli presenti</div>
        </div>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>📋</div>
          <div style={styles.cardValue}>{stats.activeSubscriptions}</div>
          <div style={styles.cardLabel}>Abbonati attivi</div>
        </div>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>💶</div>
          <div style={styles.cardValue}>€ {stats.revenue.toFixed(2)}</div>
          <div style={styles.cardLabel}>Incasso oggi</div>
        </div>
        <div style={styles.cardStyle}>
          <div style={styles.cardIcon}>👥</div>
          <div style={styles.cardValue}>{stats.totalCustomers}</div>
          <div style={styles.cardLabel}>Clienti totali</div>
        </div>
      </div>

      {/* Occupazione */}
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <h3 style={styles.chartTitle}>📊 Stato Occupazione</h3>
          <span style={styles.chartValue}>{stats.occupancyRate}%</span>
        </div>
        <div style={styles.progressBarContainer}>
          <div style={{ ...styles.progressBarFill, width: `${stats.occupancyRate}%` }} />
        </div>
      </div>

      {statsLoading && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "#3B82F6", marginTop: "20px" }}>
          🔄 Sincronizzazione dati in corso...
        </p>
      )}
    </div>
  );
}

/* ======================================================
   STILI (CSS-in-JS)
   ====================================================== */
const styles = {
  loadingContainer: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", height: "60vh" },
  spinner: { width: "30px", height: "30px", border: "3px solid rgba(59, 130, 246, 0.1)", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 1s linear infinite" },
  headerStyle: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
  pageTitle: { fontSize: "24px", fontWeight: 700, color: "#fff", margin: 0 },
  pageSubtitle: { fontSize: "14px", color: "#9ca3af", margin: "4px 0 0 0" },
  dateBadge: { padding: "6px 12px", background: "#1a1f25", borderRadius: "8px", color: "#9ca3af", fontSize: "12px", border: "1px solid rgba(255,255,255,0.05)" },
  quickNavStyle: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "30px" },
  navButtonStyle: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", background: "#1a1f25", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", fontSize: "13px", cursor: "pointer" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" },
  cardStyle: { background: "#111418", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" as const },
  cardIcon: { fontSize: "28px", marginBottom: "10px" },
  cardValue: { fontSize: "30px", fontWeight: 800, color: "#fff", marginBottom: "4px" },
  cardLabel: { fontSize: "11px", color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "1px" },
  chartCard: { background: "#111418", padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.05)" },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  chartTitle: { fontSize: "15px", color: "#fff", margin: 0 },
  chartValue: { fontSize: "22px", fontWeight: 800, color: "#3B82F6" },
  progressBarContainer: { width: "100%", height: "10px", background: "rgba(255,255,255,0.05)", borderRadius: "5px", overflow: "hidden" as const },
  progressBarFill: { height: "100%", background: "#3B82F6", borderRadius: "5px", transition: "width 1s ease" }
};
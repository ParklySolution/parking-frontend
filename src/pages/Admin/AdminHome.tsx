import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { useParams } from "react-router-dom";

export default function AdminHome() {
  const { tenantId } = useParams(); // ⭐ tenantId ora arriva dalla URL
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({
    active_sessions: 0,
    active_subscriptions: 0,
    total_customers: 0,
  });

  const [stats, setStats] = useState({
    total_revenue: 0,
    total_entries: 0,
    total_exits: 0,
    subscription_transits: 0,
  });

  const [trend, setTrend] = useState([]);

  const [range, setRange] = useState("7d");

  function getDateRange() {
    const now = new Date();
    let from = new Date();

    switch (range) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7d":
        from.setDate(now.getDate() - 7);
        break;
      case "30d":
        from.setDate(now.getDate() - 30);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        now.setDate(0);
        break;
      case "year":
        from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
    }

    return {
      from: from.toISOString(),
      to: new Date().toISOString(),
    };
  }

  async function loadData() {
    setLoading(true);

    if (!tenantId) {
      console.error("❌ Nessun tenantId nella URL");
      setLoading(false);
      return;
    }

    // 1️⃣ KPI principali
    const { data: kpiData } = await supabase.rpc("get_admin_dashboard_kpis", {
      tenant_id: tenantId,
    });

    if (kpiData?.length > 0) setKpis(kpiData[0]);

    // 2️⃣ Statistiche filtrate
    const { from, to } = getDateRange();

    const { data: statsData } = await supabase.rpc(
      "get_admin_dashboard_stats",
      {
        tenant_id: tenantId,
        date_from: from,
        date_to: to,
      }
    );

    if (statsData?.length > 0) setStats(statsData[0]);

    // 3️⃣ Trend ricavi
    const { data: trendData } = await supabase.rpc(
      "get_admin_revenue_trend",
      {
        tenant_id: tenantId,
        date_from: from,
        date_to: to,
      }
    );

    if (trendData) setTrend(trendData);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [range, tenantId]);

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>Caricamento…</div>
    );
  }

  const BLUE = "#3B82F6";

  return (
    <div
      style={{
        padding: "24px",
        color: "#fff",
        background: "#0d1117",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: BLUE,
          marginBottom: "8px",
        }}
      >
        Dashboard Manager
      </h1>

      <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
        Panoramica operativa del tuo parcheggio.
      </p>

      {/* FILTRI */}
      <div style={{ marginBottom: "24px", display: "flex", gap: "12px" }}>
        {[
          { key: "today", label: "Oggi" },
          { key: "7d", label: "7 giorni" },
          { key: "30d", label: "30 giorni" },
          { key: "month", label: "Mese corrente" },
          { key: "last_month", label: "Mese scorso" },
          { key: "year", label: "Ultimo anno" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setRange(f.key)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: range === f.key ? BLUE : "transparent",
              color: range === f.key ? "#000" : "#fff",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KPI ISTANTANEI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {[
          { label: "Posti occupati ora", value: kpis.active_sessions },
          { label: "Abbonamenti attivi", value: kpis.active_subscriptions },
          { label: "Clienti registrati", value: kpis.total_customers },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "20px",
              background: "#111418",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                marginBottom: "6px",
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: BLUE,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* KPI FILTRABILI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {[
          { label: "Ricavi", value: stats.total_revenue.toFixed(2) + " €" },
          { label: "Ingressi", value: stats.total_entries },
          { label: "Uscite", value: stats.total_exits },
          { label: "Transiti abbonati", value: stats.subscription_transits },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              padding: "20px",
              background: "#111418",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                marginBottom: "6px",
              }}
            >
              {k.label}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: BLUE,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* GRAFICO RICAVI */}
      <div
        style={{
          padding: "20px",
          background: "#111418",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "32px",
        }}
      >
        <h3 style={{ color: BLUE, marginBottom: "12px" }}>
          Trend ricavi
        </h3>

        {trend.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>Nessun dato disponibile.</p>
        ) : (
          <svg width="100%" height="120">
            {trend.map((t, i) => {
              const max = Math.max(...trend.map((x) => x.total_amount));
              const x = (i / (trend.length - 1)) * 100;
              const y = 100 - (t.total_amount / max) * 100;

              return (
                <circle
                  key={i}
                  cx={x + "%"}
                  cy={y + "%"}
                  r="3"
                  fill={BLUE}
                />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

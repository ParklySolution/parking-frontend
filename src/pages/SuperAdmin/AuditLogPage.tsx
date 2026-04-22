// src/pages/SuperAdmin/AuditLogPage.tsx

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/services/supabase";
import { logAudit } from "@/services/auditLog";

export default function AuditLogPage() {
  const [events, setEvents] = useState([]);
  const [tenants, setTenants] = useState({});
  const [users, setUsers] = useState({});
  const [limit, setLimit] = useState(50);

  // FILTRI
  const [search, setSearch] = useState("");
  const [filterTenant, setFilterTenant] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  /* ============================================================
     LOAD BASE DATA
  ============================================================ */
  useEffect(() => {
    console.log("🔵 AuditLogPage MOUNTED");

    loadBaseData();

    // ⭐ AUDIT LOG: apertura pagina
    logAudit({
      action: "view_audit_log",
      entity: "audit",
      entity_id: null,
      details: {},
    });
  }, []);

  /* ============================================================
     LOAD EVENTS
  ============================================================ */
  useEffect(() => {
    loadEvents();
  }, [limit, search]);

  async function loadBaseData() {
    console.log("🔵 Loading base data...");

    // Tenants
    const { data: tenantData, error: tenantErr } =
      await supabase.rpc("get_tenants_overview");

    console.log("📌 get_tenants_overview →", { tenantData, tenantErr });

    if (tenantErr) console.error("❌ ERROR get_tenants_overview:", tenantErr);

    const tenantMap = {};
    tenantData?.forEach((t) => (tenantMap[t.id] = t.name));
    setTenants(tenantMap);

    // Users
    const { data: userData, error: userErr } =
      await supabase.rpc("get_all_users");

    console.log("📌 get_all_users →", { userData, userErr });

    if (userErr) console.error("❌ ERROR get_all_users:", userErr);

    const userMap = {};
    userData?.forEach(
      (u) => (userMap[u.id] = u.full_name || u.email || "Utente sconosciuto")
    );
    setUsers(userMap);
  }

  async function loadEvents() {
    console.log("🔵 Loading audit events...", { search, limit });

    let data;
    let error;

    if (search.trim() !== "") {
      console.log("🔍 Searching audit events...");

      const { data: searchData, error: searchErr } =
        await supabase.rpc("search_audit_events", {
          query: search,
          limit_count: limit,
        });

      console.log("📌 search_audit_events →", { searchData, searchErr });

      if (searchErr)
        console.error("❌ ERROR search_audit_events:", searchErr);

      data = searchData;
      error = searchErr;
    } else {
      console.log("📄 Loading recent audit events...");

      const { data: auditData, error: auditErr } =
        await supabase.rpc("get_recent_audit_events", {
          limit_count: limit,
        });

      console.log("📌 get_recent_audit_events →", { auditData, auditErr });

      if (auditErr)
        console.error("❌ ERROR get_recent_audit_events:", auditErr);

      data = auditData;
      error = auditErr;
    }

    if (error) {
      console.error("❌ FINAL AUDIT LOAD ERROR:", error);
    }

    setEvents(data || []);
  }

  /* ============================================================
     HELPERS
  ============================================================ */
  function formatDate(ts) {
    return new Date(ts).toLocaleString("it-IT");
  }

  function getEventIcon(type) {
    if (!type) return "ℹ️";
    const t = type.toLowerCase();
    if (t.includes("delete")) return "🗑️";
    if (t.includes("update")) return "✏️";
    if (t.includes("create")) return "🟢";
    if (t.includes("auth")) return "🔐";
    if (t.includes("impersonate")) return "🕵️";
    return "📄";
  }

  function getEventColor(type) {
    if (!type) return "#9ca3af";
    const t = type.toLowerCase();
    if (t.includes("delete")) return "#f87171";
    if (t.includes("update")) return "#fbbf24";
    if (t.includes("create")) return "#4ade80";
    if (t.includes("auth")) return "#60a5fa";
    if (t.includes("impersonate")) return "#facc15";
    return "#9ca3af";
  }

  const dynamicTypes = useMemo(() => {
    const set = new Set();
    events.forEach((e) => e.event_type && set.add(e.event_type));
    return Array.from(set);
  }, [events]);

  function categorize(type) {
    if (!type) return "other";
    const t = type.toLowerCase();
    if (t.includes("create")) return "create";
    if (t.includes("update")) return "update";
    if (t.includes("delete")) return "delete";
    if (t.includes("auth") || t.includes("impersonate")) return "security";
    return "other";
  }

  const filteredEvents = events.filter((e) => {
    if (filterTenant && e.tenant_id !== filterTenant) return false;
    if (filterUser && e.user_id !== filterUser) return false;
    if (filterCategory && categorize(e.event_type) !== filterCategory)
      return false;
    return true;
  });

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ padding: "20px" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            color: "#4ea8ff",
            fontSize: "32px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Audit Log
        </h1>

        <p style={{ color: "#9ca3af", marginTop: "6px", fontSize: "15px" }}>
          Storico completo degli eventi di sistema, modifiche e attività degli utenti.
        </p>
      </div>

      {/* FILTRI */}
      <div
        style={{
          background: "#111418",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
        }}
      >
        <input
          placeholder="Cerca eventi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "#0b0f14",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />

        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          style={{
            background: "#0b0f14",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <option value="">Tutti i tenant</option>
          {Object.entries(tenants).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{
            background: "#0b0f14",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <option value="">Tutti gli utenti</option>
          {Object.entries(users).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{
            background: "#0b0f14",
            color: "#fff",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <option value="">Tutte le categorie</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="security">Security/Auth</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* TABELLA */}
      <div
        style={{
          background: "#0b0f14",
          borderRadius: "14px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
        }}
      >
        <h3
          style={{
            color: "#fff",
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          Eventi recenti
        </h3>

        {filteredEvents.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>Nessun evento trovato.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#9ca3af", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>Evento</th>
                <th style={{ padding: "10px" }}>Tenant</th>
                <th style={{ padding: "10px" }}>Utente</th>
                <th style={{ padding: "10px" }}>Data</th>
              </tr>
            </thead>

            <tbody>
              {filteredEvents.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={{ padding: "10px", color: getEventColor(e.event_type) }}>
                    {getEventIcon(e.event_type)} {e.event_type}
                  </td>

                  <td style={{ padding: "10px", color: "#fff" }}>
                    {tenants[e.tenant_id] || "—"}
                  </td>

                  <td style={{ padding: "10px", color: "#fff" }}>
                    {users[e.user_id] || "—"}
                  </td>

                  <td style={{ padding: "10px", color: "#9ca3af" }}>
                    {formatDate(e.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

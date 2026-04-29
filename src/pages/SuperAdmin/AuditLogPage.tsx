// src/pages/SuperAdmin/AuditLogPage.tsx

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/services/supabase";
import { logAudit } from "@/services/auditLog";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AuditLogPage() {
  const [events, setEvents] = useState([]);
  const [tenants, setTenants] = useState({});
  const [users, setUsers] = useState({});
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterTenant, setFilterTenant] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    loadBaseData();
    logAudit({
      action: "view_audit_log",
      entity: "audit",
      entity_id: null,
      details: {},
    });
  }, []);

  useEffect(() => {
    loadEvents();
  }, [limit, search]);

  // 🔥 CARICA TENANTS E USERS DAL BACKEND
  async function loadBaseData() {
    console.log("🔵 Loading base data from backend...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1️⃣ Carica tenants da backend
      const tenantsRes = await fetch(`${API_URL}/api/superadmin/tenants-list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        const tenantMap = {};
        if (tenantsData.data) {
          tenantsData.data.forEach(t => tenantMap[t.id] = t.name);
        } else if (tenantsData.tenants) {
          tenantsData.tenants.forEach(t => tenantMap[t.id] = t.name);
        }
        setTenants(tenantMap);
      }

      // 2️⃣ 🔥 CARICA PROFILI DAL BACKEND (NON DA SUPABASE DIRECT)
      const profilesRes = await fetch(`${API_URL}/api/superadmin/profiles/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        const userMap = {};
        if (profilesData.profiles) {
          profilesData.profiles.forEach(u => {
            const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
            userMap[u.auth_user_id] = name || u.email || "Utente sconosciuto";
          });
        }
        setUsers(userMap);
        console.log("✅ Utenti caricati:", Object.keys(userMap).length);
      } else {
        console.error("❌ Errore caricamento profili:", await profilesRes.text());
      }

    } catch (err) {
      console.error("❌ Errore loadBaseData:", err);
    }
  }

  // 🔥 CARICA EVENTI AUDIT LOG
  async function loadEvents() {
    setLoading(true);
    console.log("🔵 Loading audit events...", { search, limit });

    try {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (search.trim() !== "") {
        query = query.or(`action.ilike.%${search}%, entity.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Errore caricamento audit log:", error);
      } else {
        console.log("✅ Eventi caricati:", data?.length);
        setEvents(data || []);
      }
    } catch (err) {
      console.error("❌ Eccezione loadEvents:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString("it-IT");
  }

  function getEventIcon(action) {
    if (!action) return "ℹ️";
    const t = action.toLowerCase();
    if (t.includes("delete")) return "🗑️";
    if (t.includes("update")) return "✏️";
    if (t.includes("create")) return "🟢";
    if (t.includes("impersonate")) return "🕵️";
    if (t.includes("view")) return "👁️";
    return "📄";
  }

  function getEventColor(action) {
    if (!action) return "#9ca3af";
    const t = action.toLowerCase();
    if (t.includes("delete")) return "#f87171";
    if (t.includes("update")) return "#fbbf24";
    if (t.includes("create")) return "#4ade80";
    if (t.includes("impersonate")) return "#facc15";
    return "#9ca3af";
  }

  const filteredEvents = events.filter((e) => {
    if (filterTenant && e.entity_id !== filterTenant && e.entity !== filterTenant) return false;
    if (filterUser && e.performed_by !== filterUser) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "#9ca3af" }}>Caricamento eventi...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ color: "#4ea8ff", fontSize: "32px", fontWeight: 700, margin: 0 }}>
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
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <input
          placeholder="Cerca eventi..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            loadEvents();
          }}
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
      </div>

      {/* TABELLA */}
      <div
        style={{
          background: "#0b0f14",
          borderRadius: "14px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 style={{ color: "#fff", fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>
          Eventi recenti
        </h3>

        {filteredEvents.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>Nessun evento trovato.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#9ca3af", textAlign: "left", borderBottom: "1px solid #1f2937" }}>
                <th style={{ padding: "10px" }}>Evento</th>
                <th style={{ padding: "10px" }}>Entità</th>
                <th style={{ padding: "10px" }}>ID Entità</th>
                <th style={{ padding: "10px" }}>Utente</th>
                <th style={{ padding: "10px" }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={{ padding: "10px", color: getEventColor(e.action) }}>
                    {getEventIcon(e.action)} {e.action}
                  </td>
                  <td style={{ padding: "10px", color: "#fff" }}>
                    {e.entity || "—"}
                  </td>
                  <td style={{ padding: "10px", color: "#9ca3af", fontSize: "12px" }}>
                    {e.entity_id ? e.entity_id.substring(0, 8) + "..." : "—"}
                  </td>
                  <td style={{ padding: "10px", color: "#fff" }}>
                    {users[e.performed_by] || e.performed_by?.substring(0, 8) + "..." || "—"}
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
// src/pages/SuperAdmin/TenantDetailPage.tsx
console.log("🔥 TenantDetailPage RENDERED");

import { supabase } from "@/services/supabase";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import {
  getTenantDetailNew,
  toggleTenantStatus_new,
  getTenantFeatures_new,
  updateTenantFeatures_new,
  impersonateTenant,
  getTenantsByCompany_new,
  createTenantAdmin,
} from "@/services/superAdminService";

import { logAudit } from "@/services/auditLog";
import "./TenantDetail.css";

// ============================================================
// STILI MODALE - Z-INDEX MASSIMO ASSOLUTO
// ============================================================
const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999999999,   // 🔥 MASSIMO ASSOLUTO
  pointerEvents: "auto" as const,
};

const modalBox = {
  background: "#1a1d21",
  padding: "30px",
  borderRadius: "12px",
  width: "400px",
  maxWidth: "90vw",
  color: "#fff",
  position: "relative" as const,
  zIndex: 9999999999,   // 🔥 ANCORA PIÙ ALTO
  pointerEvents: "auto" as const,
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #333",
  background: "#111418",
  color: "#fff",
  fontSize: "14px",
};

const btnCancel = {
  padding: "10px 14px",
  marginRight: "10px",
  background: "#444",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
};

const btnCreate = {
  padding: "10px 14px",
  background: "#2563eb",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  fontSize: "14px",
};

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<any>(null);
  const [features, setFeatures] = useState<any>(null);
  const [overrides, setOverrides] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<any[]>([]);

  // 🔥 Stato modale "Crea Tenant Admin"
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  /* ============================================================
     LOAD TENANT DATA
  ============================================================ */
  useEffect(() => {
    async function load() {
      try {
        if (!tenantId) return;

        await logAudit({
          action: "view_tenant_detail",
          entity: "tenant",
          entity_id: tenantId,
          details: {},
        });

        const data = await getTenantDetailNew(tenantId);
        setTenant(data);

        if (data?.company_id) {
          const list = await getTenantsByCompany_new(data.company_id);
          setSiblings(list.filter((t: any) => t.id !== tenantId));
        }

        const merged = await getTenantFeatures_new(tenantId);
        setFeatures(merged);

        setOverrides(data?.feature_flags || {});
      } catch (err) {
        console.error("❌ Errore caricamento tenant:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tenantId]);

  /* ============================================================
     TOGGLE TENANT STATUS
  ============================================================ */
  const handleToggleStatus = async () => {
    if (!tenant || !tenantId) return;

    const newStatus = !tenant.is_active;

    try {
      await toggleTenantStatus_new(tenantId, newStatus);

      await logAudit({
        action: newStatus ? "activate_tenant" : "deactivate_tenant",
        entity: "tenant",
        entity_id: tenantId,
        details: {
          previous_status: tenant.is_active,
          new_status: newStatus,
        },
      });

      setTenant({
        ...tenant,
        is_active: newStatus,
      });
    } catch (err) {
      console.error("Errore toggle:", err);
      alert("Errore durante l'aggiornamento dello stato del tenant");
    }
  };

  /* ============================================================
     TOGGLE FEATURE FLAG
  ============================================================ */
  async function handleToggleFeature(key: string) {
    if (!tenantId) return;

    const newOverrides = {
      ...overrides,
      [key]: !features[key],
    };

    setOverrides(newOverrides);

    await updateTenantFeatures_new(tenantId, newOverrides);

    await logAudit({
      action: "toggle_tenant_feature",
      entity: "tenant",
      entity_id: tenantId,
      details: {
        feature: key,
        previous_value: features[key],
        new_value: !features[key],
      },
    });

    const merged = await getTenantFeatures_new(tenantId);
    setFeatures(merged);
  }

  /* ============================================================
     IMPERSONATION
  ============================================================ */
  async function handleImpersonate() {
    if (!tenantId) return;

    try {
      setLoading(true);

      const tenantOwnerUserId = tenant?.owner_user_id;
      if (!tenantOwnerUserId) {
        alert("Questo tenant non ha un owner_user_id valido");
        return;
      }

      const { data: currentSessionData } = await supabase.auth.getSession();
      const originalAccess = currentSessionData?.session?.access_token;
      const originalRefresh = currentSessionData?.session?.refresh_token;

      if (!originalAccess || !originalRefresh) {
        alert("Impossibile recuperare la sessione originale del SuperAdmin");
        return;
      }

      localStorage.setItem(
        "superadmin_original_session",
        JSON.stringify({
          access_token: originalAccess,
          refresh_token: originalRefresh,
        })
      );

      localStorage.setItem("is_impersonating", "true");
      localStorage.setItem("impersonated_tenant_name", tenant.name);

      console.log("🔥 handleImpersonate → impersonating:", tenantOwnerUserId);

      const session = await impersonateTenant(tenantOwnerUserId);

      if (!session?.access_token || !session?.refresh_token) {
        alert("Impossibile impersonare il tenant");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (sessionError) {
        console.error("Errore setSession:", sessionError);
        alert("Errore durante il login impersonato");
        return;
      }

      navigate(`/tenant/${tenantId}/dashboard`);
    } catch (err) {
      console.error("Errore impersonation:", err);
      alert("Errore durante l'impersonazione");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
     CREA TENANT ADMIN
  ============================================================ */
  async function handleCreateTenantAdmin() {
    console.log("🔥 CLICK → handleCreateTenantAdmin");
    console.log("🔑 TOKEN:", localStorage.getItem("sb-access-token")?.substring(0, 20) + "...");
    
    if (!tenantId) {
      console.error("❌ tenantId mancante!");
      return;
    }

    console.log("🚀 STO PER CHIAMARE IL BACKEND...");

    const res = await createTenantAdmin(tenantId, {
      full_name: newAdmin.full_name,
      email: newAdmin.email,
    });

    console.log("📩 RISPOSTA BACKEND:", res);

    if (!res.success) {
      alert("Errore durante la creazione dell'admin");
      return;
    }

    alert("Tenant admin creato con successo!");
    setShowCreateAdmin(false);

    setNewAdmin({ full_name: "", email: "", password: "" });
  }

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <p className="sa-loading">Caricamento...</p>;
  if (!tenant) return <p className="sa-error">Tenant non trovato.</p>;

  const createdAt = tenant.created_at ? new Date(tenant.created_at) : null;

  return (
    // 🔥 Container SENZA zIndex negativo che nasconde la modale
    <div className="sa-detail-container">
      <h1 className="sa-detail-title">{tenant.tenant_name}</h1>

      <div style={{ marginBottom: "20px" }}>
        <Link
          to={`/super/companies/${tenant.company_id}`}
          className="sa-btn sa-btn-secondary"
        >
          ← Apri Company
        </Link>
      </div>

      {/* ============================
          GRID INFO BASE
      ============================ */}
      <div className="sa-detail-grid">
        <div className="sa-detail-card">
          <h3>Company</h3>
          <p>{tenant.company_name}</p>
        </div>

        <div className="sa-detail-card">
          <h3>Indirizzo</h3>
          <p>{tenant.address || "—"}</p>
        </div>

        <div className="sa-detail-card">
          <h3>Città</h3>
          <p>{tenant.city || "—"}</p>
        </div>

        <div className="sa-detail-card">
          <h3>Partita IVA</h3>
          <p>{tenant.vat_number || "—"}</p>
        </div>

        <div className="sa-detail-card">
          <h3>Stato</h3>
          <p className={tenant.is_active ? "sa-active" : "sa-inactive"}>
            {tenant.is_active ? "Attivo" : "Disattivo"}
          </p>
        </div>

        <div className="sa-detail-card">
          <h3>Creato il</h3>
          <p>{createdAt ? createdAt.toLocaleDateString() : "—"}</p>
        </div>

        <div className="sa-detail-card">
          <h3>Piano attuale</h3>

          {tenant.plan_id ? (
            <>
              <p>{tenant.plan_name ?? "Caricamento..."}</p>

              <button
                className="sa-btn sa-btn-small"
                onClick={() => navigate(`/super/plans/${tenant.plan_id}`)}
              >
                Vai al piano →
              </button>
            </>
          ) : (
            <p>— Nessun piano assegnato —</p>
          )}
        </div>
      </div>

      {/* ============================
          SIBLINGS
      ============================ */}
      {siblings.length > 0 && (
        <div className="sa-detail-card" style={{ marginTop: "24px" }}>
          <h3>Altri tenant della stessa Company</h3>

          <ul style={{ marginTop: "10px", listStyle: "none", padding: 0 }}>
            {siblings.map((s) => (
              <li key={s.id} style={{ marginBottom: "8px" }}>
                <Link
                  to={`/super/tenants/${s.id}`}
                  className="sa-link-detail"
                  style={{ color: "#4f8cff", textDecoration: "none" }}
                >
                  {s.tenant_name ?? s.name ?? s.id} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ============================
          FEATURE FLAGS
      ============================ */}
      <div className="sa-detail-card sa-feature-card">
        <h3>Moduli attivi (Feature Flags)</h3>

        {!features ? (
          <p>Caricamento moduli...</p>
        ) : (
          <div className="feature-grid">
            {Object.entries(features).map(([key, value]) => {
              const isOverride =
                overrides && Object.prototype.hasOwnProperty.call(overrides, key);

              return (
                <div key={key} className="feature-row">
                  <div className="feature-info">
                    <span className="feature-name">{key}</span>
                    <span className={isOverride ? "flag-override" : "flag-default"}>
                      {isOverride ? "override" : "default"}
                    </span>
                  </div>

                  <div className="feature-controls">
                    <span className={value ? "badge-active" : "badge-inactive"}>
                      {value ? "Attivo" : "Disattivo"}
                    </span>

                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={() => handleToggleFeature(key)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================
          ACTIONS
      ============================ */}
      <div className="sa-actions">
        <button
          className="sa-btn sa-btn-primary"
          onClick={() => navigate(`/super/tenants/${tenantId}/edit`)}
        >
          Modifica
        </button>

        <button className="sa-btn sa-btn-danger" onClick={handleToggleStatus}>
          {tenant.is_active ? "Disattiva Tenant" : "Attiva Tenant"}
        </button>

        <button className="sa-btn sa-btn-secondary" onClick={handleImpersonate}>
          Entra come tenant
        </button>

        {/* 🔥 CREA TENANT ADMIN */}
        <button
          className="sa-btn sa-btn-primary"
          onClick={() => {
            console.log("🔥 CLICK → APRI MODALE");
            setShowCreateAdmin(true);
          }}
        >
          + Crea Tenant Admin
        </button>
      </div>

      {/* ============================
          MODALE CREA TENANT ADMIN
          RIMOSSO zIndex NEGATIVO DAL CONTAINER
      ============================ */}
      {showCreateAdmin && (
        <div style={modalOverlay} onClick={() => setShowCreateAdmin(false)}>
          <div 
            style={modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 20 }}>Crea Tenant Admin</h2>

            <input
              type="text"
              placeholder="Nome completo"
              value={newAdmin.full_name}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, full_name: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, email: e.target.value })
              }
              style={inputStyle}
            />

            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button
                onClick={() => setShowCreateAdmin(false)}
                style={btnCancel}
              >
                Annulla
              </button>

              <button
                onClick={() => {
                  console.log("🔥 CLICK → BOTTONE CREA ADMIN");
                  handleCreateTenantAdmin();
                }}
                style={btnCreate}
              >
                Crea Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
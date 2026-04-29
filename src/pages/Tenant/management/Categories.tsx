// src/pages/Tenant/management/Categories.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import {
  fetchVehicleCategories,
  toggleVehicleCategory,
  createVehicleCategory,
} from "@/services/vehicleCategoryService";
import CategoryModal from "./components/CategoryModal";

export default function TenantCategories() {
  const { tenantId: urlTenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [realTenantId, setRealTenantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const BLUE = "#3B82F6";

  // Risolve il tenant ID (company_id → tenant_id)
  useEffect(() => {
    async function resolveTenantId() {
      try {
        console.log("🔍 TenantCategories - URL tenantId:", urlTenantId);

        if (!urlTenantId) {
          setError("Tenant ID non trovato nell'URL");
          setResolving(false);
          return;
        }

        // Verifica se è un tenant valido
        const { data: tenant } = await supabase
          .from("admin_tenants")
          .select("id")
          .eq("id", urlTenantId)
          .maybeSingle();

        if (tenant) {
          setRealTenantId(urlTenantId);
          setResolving(false);
          return;
        }

        // Cerca tenant tramite company_id
        const { data: companyTenant } = await supabase
          .from("admin_tenants")
          .select("id")
          .eq("company_id", urlTenantId)
          .maybeSingle();

        if (companyTenant) {
          setRealTenantId(companyTenant.id);
          setResolving(false);
          return;
        }

        setError("Tenant non trovato");
      } catch (err) {
        console.error("❌ Errore risoluzione tenant:", err);
        setError("Errore durante la risoluzione del tenant");
      } finally {
        setResolving(false);
      }
    }

    resolveTenantId();
  }, [urlTenantId]);

  const load = async () => {
    if (!realTenantId) {
      setError("Tenant ID non valido");
      setLoading(false);
      return;
    }

    console.log("🔍 TenantCategories - Caricamento categorie per tenantId:", realTenantId);

    setLoading(true);
    setError(null);
    try {
      const data = await fetchVehicleCategories(realTenantId);
      console.log(`✅ Trovate ${data.length} categorie`);
      setCategories(data);
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
      setError("Errore durante il caricamento delle categorie");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (realTenantId) {
      load();
    }
  }, [realTenantId]);

  if (resolving) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p style={{ color: "#9ca3af", marginTop: "16px" }}>Caricamento tenant...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#ff4444", padding: "24px", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  if (!realTenantId) {
    return (
      <div style={{ color: "#ff4444", padding: "24px" }}>
        Errore: Tenant ID non valido
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p style={{ marginTop: "16px" }}>Caricamento categorie...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* Pulsante Torna alla Dashboard */}
      <button
        onClick={() => navigate(`/tenant/${realTenantId}/dashboard`)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "8px 16px",
          borderRadius: "8px",
          color: "#9ca3af",
          cursor: "pointer",
          marginBottom: "24px",
          fontSize: "14px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#9ca3af";
        }}
      >
        ← Torna alla Dashboard
      </button>

      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: BLUE,
          }}
        >
          📋 Categorie veicolo
        </h2>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: BLUE,
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ➕ Nuova categoria
        </button>
      </div>

      {/* TABELLA */}
      {categories.length === 0 ? (
        <div
          style={{
            background: "#111418",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          Nessuna categoria trovata. Crea la prima categoria!
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#111418",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#1a1f25",
                textAlign: "left",
                color: "#9ca3af",
              }}
            >
              <th style={{ padding: "12px 16px" }}>Nome</th>
              <th style={{ padding: "12px 16px" }}>Attiva</th>
              <th style={{ padding: "12px 16px" }}>Azioni</th>
            </tr>
          </thead>

          <tbody>
            {categories.map((c) => (
              <tr
                key={c.id}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <td style={{ padding: "12px 16px" }}>{c.name}</td>
                <td style={{ padding: "12px 16px" }}>
                  {c.is_active ? "✅" : "❌"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={async () => {
                      if (!realTenantId) return;
                      try {
                        await toggleVehicleCategory(c.id, !c.is_active);
                        await load();
                      } catch (err) {
                        console.error("Errore toggle categoria:", err);
                        setError("Errore durante l'aggiornamento");
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: c.is_active ? "#ef4444" : BLUE,
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {c.is_active ? "Disattiva" : "Attiva"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODALE */}
      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (name) => {
          if (!realTenantId) return;
          try {
            await createVehicleCategory(realTenantId, name);
            await load();
          } catch (err) {
            console.error("Errore creazione categoria:", err);
            setError("Errore durante la creazione");
          }
        }}
      />
    </div>
  );
}
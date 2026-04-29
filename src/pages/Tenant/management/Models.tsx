import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import {
  fetchVehicleModels,
  toggleVehicleModel,
  createVehicleModel,
  updateVehicleModelCategory,
} from "@/services/vehicleModelService";
import { fetchVehicleBrands } from "@/services/vehicleBrandsAdminService";
import { fetchVehicleCategories } from "@/services/vehicleCategoryService";
import ModelModal from "./components/ModelModal";
import EditCategoryModal from "./components/EditCategoryModal";

export default function TenantModels() {
  const { tenantId: urlTenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [realTenantId, setRealTenantId] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [filteredModels, setFilteredModels] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const BLUE = "#3B82F6";

  // Risolve il tenant ID
  useEffect(() => {
    async function resolveTenantId() {
      try {
        console.log("🔍 TenantModels - URL tenantId:", urlTenantId);

        if (!urlTenantId) {
          setError("Tenant ID non trovato nell'URL");
          setResolving(false);
          return;
        }

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

  const loadBrands = async () => {
    if (!realTenantId) return;
    try {
      const data = await fetchVehicleBrands(realTenantId);
      setBrands(data.filter(b => b.is_active));
    } catch (err) {
      console.error("Errore caricamento marche:", err);
    }
  };

  const loadCategories = async () => {
    if (!realTenantId) return;
    try {
      const data = await fetchVehicleCategories(realTenantId);
      setCategories(data.filter(c => c.is_active));
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
    }
  };

  const loadModels = async () => {
    if (!realTenantId) {
      setError("Tenant ID non valido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchVehicleModels(realTenantId);
      setModels(data);
      setFilteredModels(data);
    } catch (err) {
      console.error("Errore caricamento modelli:", err);
      setError("Errore durante il caricamento dei modelli");
    } finally {
      setLoading(false);
    }
  };

  // Filtra modelli in base alla ricerca
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredModels(models);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = models.filter(m => 
        m.name.toLowerCase().includes(term) ||
        (m.brand_name && m.brand_name.toLowerCase().includes(term))
      );
      setFilteredModels(filtered);
    }
  }, [searchTerm, models]);

  const handleEditCategory = (model: any) => {
    setSelectedModel(model);
    setEditModalOpen(true);
  };

  const handleUpdateCategory = async (modelId: string, categoryId: string) => {
    try {
      await updateVehicleModelCategory(realTenantId!, modelId, categoryId);
      await loadModels();
      setEditModalOpen(false);
      setSelectedModel(null);
    } catch (err) {
      console.error("Errore aggiornamento categoria:", err);
      setError("Errore durante l'aggiornamento della categoria");
    }
  };

  useEffect(() => {
    if (realTenantId) {
      loadBrands();
      loadCategories();
      loadModels();
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
        <p style={{ marginTop: "16px" }}>Caricamento modelli...</p>
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
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <h2 style={{ fontSize: "28px", fontWeight: 700, color: BLUE }}>
          🚘 Modelli veicolo
        </h2>

        <div style={{ display: "flex", gap: "12px" }}>
          {/* 🔍 Barra di ricerca */}
          <input
            type="text"
            placeholder="🔍 Cerca marca o modello..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "250px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
              fontSize: "14px",
            }}
          />

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
            ➕ Nuovo modello
          </button>
        </div>
      </div>

      {/* TABELLA */}
      {filteredModels.length === 0 ? (
        <div
          style={{
            background: "#111418",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          {searchTerm ? "Nessun modello trovato per la ricerca." : "Nessun modello trovato."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
                <th style={{ padding: "12px 16px" }}>Marca</th>
                <th style={{ padding: "12px 16px" }}>Modello</th>
                <th style={{ padding: "12px 16px" }}>Categoria</th>
                <th style={{ padding: "12px 16px" }}>Attivo</th>
                <th style={{ padding: "12px 16px" }}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {filteredModels.map((m) => (
                <tr
                  key={m.id}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>{m.brand_name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>{m.name}</td>
                  <td style={{ padding: "12px 16px", color: m.category_name ? "#fff" : "#888" }}>
                    {m.category_name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{m.is_active ? "✅" : "❌"}</td>
                  <td style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={async () => {
                        try {
                          await toggleVehicleModel(m.id, !m.is_active);
                          await loadModels();
                        } catch (err) {
                          console.error("Errore toggle modello:", err);
                          setError("Errore durante l'aggiornamento");
                        }
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: m.is_active ? "#ef4444" : BLUE,
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {m.is_active ? "Disattiva" : "Attiva"}
                    </button>

                    {/* ✏️ Pulsante Modifica categoria */}
                    <button
                      onClick={() => handleEditCategory(m)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: BLUE,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      ✏️ Categoria
                    </button>
                  </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALE CREAZIONE */}
      <ModelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        brands={brands}
        categories={categories}
        onSave={async (brandId, categoryId, name) => {
          if (!realTenantId) return;
          try {
            await createVehicleModel(realTenantId, brandId, categoryId, name);
            await loadModels();
          } catch (err) {
            console.error("Errore creazione modello:", err);
            setError("Errore durante la creazione");
          }
        }}
      />

      {/* MODALE MODIFICA CATEGORIA */}
      <EditCategoryModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedModel(null);
        }}
        model={selectedModel}
        categories={categories}
        onSave={handleUpdateCategory}
      />
    </div>
  );
}
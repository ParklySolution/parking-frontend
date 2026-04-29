import { useEffect, useState } from "react";
import {
  fetchGlobalModels,
  updateGlobalModelCategory,
  toggleGlobalModel
} from "@/services/globalModelsService";
import { fetchGlobalBrands } from "@/services/globalBrandsService";
import { fetchGlobalCategories } from "@/services/globalCategoriesService";
import EditCategoryModal from "./components/EditGlobalModelCategoryModal";

interface GlobalModel {
  id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  default_category_id: string;
  category_name: string;
  is_active: boolean;
}

export default function GlobalModelsPage() {
  const [models, setModels] = useState<GlobalModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<GlobalModel[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GlobalModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsData, categoriesData] = await Promise.all([
        fetchGlobalModels(),
        fetchGlobalCategories()
      ]);
      setModels(modelsData);
      setFilteredModels(modelsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      setError("Errore durante il caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtra modelli
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

  const handleEditCategory = (model: GlobalModel) => {
    setSelectedModel(model);
    setEditModalOpen(true);
  };

  const handleUpdateCategory = async (modelId: string, categoryId: string) => {
    try {
      await updateGlobalModelCategory(modelId, categoryId);
      await loadData();
      setEditModalOpen(false);
      setSelectedModel(null);
    } catch (err) {
      console.error("Errore aggiornamento categoria:", err);
      setError("Errore durante l'aggiornamento della categoria");
    }
  };

  const handleToggle = async (modelId: string, isActive: boolean) => {
    try {
      await toggleGlobalModel(modelId, !isActive);
      await loadData();
    } catch (err) {
      console.error("Errore toggle modello:", err);
      setError("Errore durante l'aggiornamento");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
        ⏳ Caricamento modelli globali...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ color: "#fff", fontSize: "28px", fontWeight: 700, margin: 0 }}>
          🌍 Modelli Veicolo - Globali
        </h1>
        <p style={{ color: "#9ca3af", marginTop: "8px" }}>
          Gestisci i modelli che verranno ereditati da tutti i tenant
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#ef4444", color: "#fff", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          ❌ {error}
        </div>
      )}

      {/* Barra di ricerca */}
      <div style={{ marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="🔍 Cerca marca o modello..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0d1117",
            color: "#fff",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Tabella */}
      {filteredModels.length === 0 ? (
        <div style={{ background: "#111418", padding: "40px", textAlign: "center", borderRadius: "12px", color: "#9ca3af" }}>
          {searchTerm ? "Nessun modello trovato per la ricerca." : "Nessun modello globale trovato."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#111418", borderRadius: "12px", overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#1a1f25", color: "#9ca3af", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 16px" }}>Marca</th>
                <th style={{ padding: "12px 16px" }}>Modello</th>
                <th style={{ padding: "12px 16px" }}>Categoria Default</th>
                <th style={{ padding: "12px 16px" }}>Attivo</th>
                <th style={{ padding: "12px 16px" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{m.brand_name || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{m.name}</td>
                  <td style={{ padding: "12px 16px", color: m.category_name ? "#fff" : "#888" }}>
                    {m.category_name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{m.is_active ? "✅" : "❌"}</td>
                  <td style={{ padding: "12px 16px", display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleToggle(m.id, m.is_active)}
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

      {/* Modale modifica categoria */}
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
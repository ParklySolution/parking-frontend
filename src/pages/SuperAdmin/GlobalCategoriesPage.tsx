// src/pages/SuperAdmin/GlobalCategoriesPage.tsx
import { useEffect, useState } from "react";
import {
  fetchGlobalCategories,
  createGlobalCategory,
  updateGlobalCategory,
  deleteGlobalCategory
} from "@/services/globalCategoriesService";
import type { GlobalCategory } from "@/services/globalCategoriesService";

export default function GlobalCategoriesPage() {
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GlobalCategory | null>(null);
  const [formName, setFormName] = useState("");

  const BLUE = "#3B82F6";

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGlobalCategories();
      setCategories(data);
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
      setError("Errore durante il caricamento delle categorie");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("Inserisci un nome");
      return;
    }
    try {
      await createGlobalCategory(formName.trim());
      setIsModalOpen(false);
      setFormName("");
      loadCategories();
    } catch (err) {
      console.error("Errore creazione:", err);
      setError("Errore durante la creazione");
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !formName.trim()) return;
    try {
      await updateGlobalCategory(editingCategory.id, { name: formName.trim() });
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormName("");
      loadCategories();
    } catch (err) {
      console.error("Errore aggiornamento:", err);
      setError("Errore durante l'aggiornamento");
    }
  };

  const handleDelete = async (category: GlobalCategory) => {
    if (!confirm(`Sei sicuro di eliminare la categoria "${category.name}"?`)) return;
    try {
      await deleteGlobalCategory(category.id);
      loadCategories();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      setError("Errore durante l'eliminazione");
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName("");
    setIsModalOpen(true);
  };

  const openEditModal = (category: GlobalCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setIsModalOpen(true);
  };

  if (loading && categories.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        Caricamento categorie globali...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "28px", fontWeight: 700, margin: 0 }}>
            📂 Categorie Veicolo - Globali
          </h1>
          <p style={{ color: "#9ca3af", marginTop: "8px" }}>
            Gestisci le categorie visibili da tutti i tenant
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            background: BLUE,
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          + Nuova categoria
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#ef4444", color: "#fff", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          ❌ {error}
        </div>
      )}

      {/* Table */}
      {categories.length === 0 ? (
        <div style={{ background: "#111418", padding: "60px", textAlign: "center", borderRadius: "12px", color: "#9ca3af" }}>
          Nessuna categoria globale trovata. Crea la prima categoria!
        </div>
      ) : (
        <div style={{ background: "#111418", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1a1f25", color: "#9ca3af", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "14px 16px" }}>Nome</th>
                <th style={{ padding: "14px 16px", width: "100px" }}>Attiva</th>
                <th style={{ padding: "14px 16px", width: "150px" }}>Azioni</th>
               </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{c.name}</td>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{c.is_active ? "✅" : "❌"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => openEditModal(c)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        color: BLUE,
                        cursor: "pointer",
                        marginRight: "8px"
                      }}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        color: "#ef4444",
                        cursor: "pointer"
                      }}
                    >
                      🗑️ Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: "#1a1f25",
              borderRadius: "16px",
              padding: "28px",
              width: "450px",
              maxWidth: "90%"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "#fff", marginBottom: "20px", fontSize: "22px" }}>
              {editingCategory ? "✏️ Modifica categoria" : "➕ Nuova categoria globale"}
            </h2>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "#9ca3af", display: "block", marginBottom: "8px" }}>Nome categoria</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Es. Utilitaria, SUV, Berlina"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "#0d1117",
                  color: "#fff",
                  fontSize: "14px"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Annulla
              </button>
              <button
                onClick={editingCategory ? handleUpdate : handleCreate}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: BLUE,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {editingCategory ? "Salva modifiche" : "Crea categoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
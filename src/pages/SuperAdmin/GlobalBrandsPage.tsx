// src/pages/SuperAdmin/GlobalBrandsPage.tsx
import { useEffect, useState } from "react";
import {
  fetchGlobalBrands,
  createGlobalBrand,
  updateGlobalBrand,
  deleteGlobalBrand
} from "@/services/globalBrandsService";
import type { GlobalBrand } from "@/services/globalBrandsService";

export default function GlobalBrandsPage() {
  const [brands, setBrands] = useState<GlobalBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<GlobalBrand | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState(0);

  const BLUE = "#3B82F6";

  const loadBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGlobalBrands();
      setBrands(data);
    } catch (err) {
      console.error("Errore caricamento marche:", err);
      setError("Errore durante il caricamento delle marche");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("Inserisci un nome");
      return;
    }
    try {
      await createGlobalBrand(formName.trim(), formOrder);
      setIsModalOpen(false);
      setFormName("");
      setFormOrder(0);
      loadBrands();
    } catch (err) {
      console.error("Errore creazione:", err);
      setError("Errore durante la creazione");
    }
  };

  const handleUpdate = async () => {
    if (!editingBrand || !formName.trim()) return;
    try {
      await updateGlobalBrand(editingBrand.id, {
        name: formName.trim(),
        order: formOrder
      });
      setIsModalOpen(false);
      setEditingBrand(null);
      setFormName("");
      setFormOrder(0);
      loadBrands();
    } catch (err) {
      console.error("Errore aggiornamento:", err);
      setError("Errore durante l'aggiornamento");
    }
  };

  const handleDelete = async (brand: GlobalBrand) => {
    if (!confirm(`Sei sicuro di eliminare "${brand.name}"?`)) return;
    try {
      await deleteGlobalBrand(brand.id);
      loadBrands();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      setError("Errore durante l'eliminazione");
    }
  };

  const openCreateModal = () => {
    setEditingBrand(null);
    setFormName("");
    setFormOrder(0);
    setIsModalOpen(true);
  };

  const openEditModal = (brand: GlobalBrand) => {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormOrder(brand.order);
    setIsModalOpen(true);
  };

  if (loading && brands.length === 0) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        Caricamento marche globali...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: "28px", fontWeight: 700, margin: 0 }}>
            🌍 Marche Veicolo - Globali
          </h1>
          <p style={{ color: "#9ca3af", marginTop: "8px" }}>
            Gestisci le marche visibili da tutti i tenant
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
          + Nuova marca
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#ef4444", color: "#fff", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          ❌ {error}
        </div>
      )}

      {/* Table */}
      {brands.length === 0 ? (
        <div style={{ background: "#111418", padding: "60px", textAlign: "center", borderRadius: "12px", color: "#9ca3af" }}>
          Nessuna marca globale trovata. Crea la prima marca!
        </div>
      ) : (
        <div style={{ background: "#111418", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#1a1f25", color: "#9ca3af", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "14px 16px", width: "80px" }}>Ordine</th>
                <th style={{ padding: "14px 16px" }}>Nome</th>
                <th style={{ padding: "14px 16px", width: "100px" }}>Attiva</th>
                <th style={{ padding: "14px 16px", width: "150px" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{b.order}</td>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{b.name}</td>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>{b.is_active ? "✅" : "❌"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => openEditModal(b)}
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
                      onClick={() => handleDelete(b)}
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
              {editingBrand ? "✏️ Modifica marca" : "➕ Nuova marca globale"}
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "#9ca3af", display: "block", marginBottom: "8px" }}>Nome marca</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Es. Ferrari, Lamborghini"
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

            <div style={{ marginBottom: "24px" }}>
              <label style={{ color: "#9ca3af", display: "block", marginBottom: "8px" }}>Ordine di visualizzazione</label>
              <input
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
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
                onClick={editingBrand ? handleUpdate : handleCreate}
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
                {editingBrand ? "Salva modifiche" : "Crea marca"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
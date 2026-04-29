import { useState } from "react";

interface ModelModalProps {
  open: boolean;
  onClose: () => void;
  brands: any[];
  categories: any[];  // 🔥 AGGIUNTO
  onSave: (brandId: string, categoryId: string, name: string) => Promise<void>;  // 🔥 MODIFICATO
}

export default function ModelModal({ open, onClose, brands, categories, onSave }: ModelModalProps) {
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  if (!open) return null;

  const handleSave = async () => {
    if (!brandId) {
      setError("Seleziona una marca");
      return;
    }
    if (!categoryId) {
      setError("Seleziona una categoria");
      return;
    }
    if (!name.trim()) {
      setError("Inserisci il nome del modello");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(brandId, categoryId, name.trim());
      setName("");
      setBrandId("");
      setCategoryId("");
      onClose();
    } catch (err) {
      setError("Errore durante la creazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "420px",
          background: "#111418",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, marginBottom: "16px", fontSize: "22px", fontWeight: 700, color: BLUE }}>
          ➕ Nuovo modello
        </h3>

        {/* Select Marca */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "14px" }}>
            Marca
          </label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          >
            <option value="">Seleziona una marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* 🔥 Select Categoria */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "14px" }}>
            Categoria
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          >
            <option value="">Seleziona una categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Input Modello */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "14px" }}>
            Modello
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Panda, Golf, Serie 3"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: "12px", color: "#ef4444", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#1a1f25",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Annulla
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: BLUE,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
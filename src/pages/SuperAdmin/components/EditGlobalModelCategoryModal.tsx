import { useState } from "react";

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  model: any;
  categories: any[];
  onSave: (modelId: string, categoryId: string) => Promise<void>;
}

export default function EditCategoryModal({ open, onClose, model, categories, onSave }: EditCategoryModalProps) {
  const [categoryId, setCategoryId] = useState(model?.default_category_id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  if (!open || !model) return null;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSave(model.id, categoryId);
      onClose();
    } catch (err) {
      setError("Errore durante l'aggiornamento");
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
          ✏️ Modifica categoria predefinita
        </h3>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "14px" }}>
            Modello
          </label>
          <div style={{ padding: "10px 12px", background: "#0d1117", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <strong>{model.brand_name}</strong> - {model.name}
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "14px" }}>
            Categoria predefinita
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
            <option value="">Nessuna categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ marginBottom: "12px", color: "#ef4444", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
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
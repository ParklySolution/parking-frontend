import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function CategoryModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }

    try {
      setSaving(true);
      await onSave(name.trim());
      setName("");
      onClose();
    } catch (e) {
      setError("Errore durante il salvataggio");
    } finally {
      setSaving(false);
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
      >
        {/* TITLE */}
        <h3
          style={{
            margin: 0,
            marginBottom: "16px",
            fontSize: "22px",
            fontWeight: 700,
            color: BLUE,
          }}
        >
          ➕ Nuova categoria veicolo
        </h3>

        {/* INPUT */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            Nome categoria
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Auto, Moto, Furgone"
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

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: "12px",
              color: "#ef4444",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "8px",
          }}
        >
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
            disabled={saving}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: BLUE,
              color: "#000",
              cursor: "pointer",
              fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

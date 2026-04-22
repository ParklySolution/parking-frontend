import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function BrandModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    console.log("🏷️ BrandModal → nome inviato:", name.trim());

    try {
      await onSave(name.trim());
      setName("");
      onClose();
    } catch (err) {
      console.error("🏷️ BrandModal → errore in onSave:", err);
      setError("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        <div style={modalHeader}>
          <h3 style={modalTitle}>➕ Nuova marca veicolo</h3>
          <button onClick={handleClose} style={closeButton}>✕</button>
        </div>

        {error && (
          <div style={errorMessage}>
            {error}
          </div>
        )}

        <div style={formField}>
          <label style={label}>Nome marca</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Fiat, BMW, Audi"
            style={input}
            autoFocus
          />
        </div>

        <div style={modalActions}>
          <button
            style={secondaryButton}
            onClick={handleClose}
          >
            Annulla
          </button>
          <button
            style={primaryButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   STILI
   ====================================================== */
const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  zIndex: 1000,
};

const modalContent = {
  backgroundColor: "#1b263b",
  padding: "24px",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "500px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const modalHeader = {
  display: "flex" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  marginBottom: "20px",
};

const modalTitle = {
  margin: 0,
  color: "#3B82F6",
  fontSize: "20px",
  fontWeight: 600,
};

const closeButton = {
  background: "transparent",
  border: "none",
  color: "#9ca3af",
  fontSize: "20px",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "4px",
  ":hover": {
    color: "#fff",
  },
};

const errorMessage = {
  backgroundColor: "#ff4444",
  color: "white",
  padding: "10px",
  borderRadius: "6px",
  marginBottom: "16px",
  fontSize: "14px",
};

const formField = {
  marginBottom: "20px",
};

const label = {
  display: "block" as const,
  marginBottom: "8px",
  color: "#e6e6e6",
  fontSize: "14px",
  fontWeight: 500,
};

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "#0d1117",
  color: "#fff",
  fontSize: "14px",
  outline: "none",
  ":focus": {
    borderColor: "#3B82F6",
  },
};

const modalActions = {
  display: "flex" as const,
  justifyContent: "flex-end" as const,
  gap: "12px",
  marginTop: "24px",
};

const primaryButton = {
  backgroundColor: "#3B82F6",
  color: "white",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};

const secondaryButton = {
  backgroundColor: "transparent",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.2)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  ":hover": {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
};
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function BrandModal({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);

    // 🔥 LOG IMPORTANTISSIMO
    console.log("BrandModal → nome inviato:", name.trim());

    try {
      await onSave(name.trim());
    } catch (err) {
      console.error("BrandModal → errore in onSave:", err);
    }

    setName("");
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>➕ Nuova marca veicolo</h3>

        <div className="form-field">
          <label>Nome marca</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Fiat, BMW, Audi"
          />
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn primary"
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

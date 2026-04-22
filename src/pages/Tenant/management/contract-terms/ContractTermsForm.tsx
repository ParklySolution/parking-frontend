import { useState } from "react";
import { supabase } from "@/services/supabase";

interface ContractTermsFormProps {
  tenantId: string;
  term: any | null;
  onClose: () => void;
}

export default function ContractTermsForm({ tenantId, term, onClose }: ContractTermsFormProps) {
  const [form, setForm] = useState({
    name: term?.name || "",
    type: term?.type || "subscription",
    content: term?.content || "",
    is_active: term?.is_active ?? true,
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.name || !form.content) {
      setError("Nome e contenuto sono obbligatori");
      setSaving(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name,
      type: form.type,
      content: form.content,
      is_active: form.is_active,
    };

    console.log("📦 PAYLOAD TERMINI:", payload);

    try {
      let result;
      
      if (term?.id) {
        result = await supabase
          .from("contract_terms")
          .update(payload)
          .eq("id", term.id);
      } else {
        result = await supabase
          .from("contract_terms")
          .insert(payload);
      }

      if (result.error) throw result.error;
      
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#1a1f25",
        padding: "30px",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "600px",
        maxHeight: "90vh",
        overflowY: "auto",
        color: "#fff"
      }}>
        <h2 style={{ color: BLUE, marginBottom: "20px" }}>
          {term ? "Modifica termini" : "Nuovi termini contrattuali"}
        </h2>

        {error && (
          <div style={{
            background: "#ff4444",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "20px",
            color: "#fff"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* NOME TERMINI */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Nome *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="es. Termini Abbonamento Mensile"
            />
          </div>

          {/* TIPO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Tipo *
            </label>
            <select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="subscription">Abbonamento</option>
              <option value="wash_fidelity">Fedeltà Lavaggio</option>
              <option value="convention">Convenzione</option>
              <option value="generic">Generico</option>
            </select>
          </div>

          {/* CONTENUTO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Contenuto *
            </label>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "8px" }}>
              Puoi utilizzare i placeholder: 
              <code style={{ background: "#0d1117", padding: "2px 4px", borderRadius: "4px", marginLeft: "4px" }}>
                {'{{company.name}}'}, {'{{company.address}}'}, ecc.
              </code>
            </p>
            <textarea
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
              required
              rows={12}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: "13px",
                resize: "vertical"
              }}
              placeholder="Inserisci qui il testo dei termini contrattuali..."
            />
          </div>

          {/* ATTIVA */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <span>Termini attivi</span>
            </label>
          </div>

          {/* BOTTONI */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "transparent",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              Annulla
            </button>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: "6px",
                border: "none",
                background: BLUE,
                color: "#fff",
                cursor: "pointer",
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? "Salvataggio..." : (term ? "Aggiorna" : "Crea")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
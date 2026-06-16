// src/pages/Tenant/management/fidelity-programs/FidelityProgramForm.tsx
import { useState } from "react";
import { supabase } from "@/services/supabase";
import { FaSave, FaTimes } from "react-icons/fa";

interface FidelityProgram {
  id?: string;
  name: string;
  required_actions: number;
  reward_description: string;
  service_id: string;
  is_active: boolean;
}

interface Props {
  tenantId: string;
  program: FidelityProgram | null;
  services: any[];
  onClose: () => void;
}

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";

export default function FidelityProgramForm({ tenantId, program, services, onClose }: Props) {
  const [form, setForm] = useState({
    name: program?.name || "",
    required_actions: program?.required_actions || 10,
    reward_description: program?.reward_description || "1 Lavaggio Gratuito",
    service_id: program?.service_id || "",
    is_active: program?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.name.trim()) {
      setError("Il nome è obbligatorio");
      setSaving(false);
      return;
    }

    if (!form.service_id) {
      setError("Seleziona un servizio");
      setSaving(false);
      return;
    }

    if (form.required_actions < 1) {
      setError("Il numero di lavaggi deve essere almeno 1");
      setSaving(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      required_actions: form.required_actions,
      reward_description: form.reward_description,
      service_id: form.service_id,
      is_active: form.is_active
    };

    try {
      let result;
      if (program?.id) {
        result = await supabase
          .from("fidelity_programs")
          .update(payload)
          .eq("id", program.id);
      } else {
        result = await supabase
          .from("fidelity_programs")
          .insert(payload);
      }

      if (result.error) throw result.error;
      onClose();
    } catch (err: any) {
      console.error("❌ Errore:", err);
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
        background: BG_DARK,
        padding: "30px",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "500px",
        color: "#fff"
      }}>
        <h2 style={{ color: BLUE, marginBottom: "20px" }}>
          {program ? "Modifica programma fedeltà" : "Nuovo programma fedeltà"}
        </h2>

        {error && (
          <div style={{
            background: "#ff4444",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "20px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Nome programma *
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
              placeholder="Es. Programma Fedeltà Standard"
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Servizio che fa maturare il bonus *
            </label>
            <select
              value={form.service_id}
              onChange={(e) => handleChange("service_id", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="">Seleziona servizio</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <small style={{ color: "#6b7280" }}>Il cliente accumula punti con QUESTO servizio</small>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Numero di lavaggi necessari *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.required_actions}
              onChange={(e) => handleChange("required_actions", parseInt(e.target.value))}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            />
            <small style={{ color: "#6b7280" }}>Es. 10 = ogni 10 lavaggi</small>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Descrizione premio *
            </label>
            <input
              type="text"
              value={form.reward_description}
              onChange={(e) => handleChange("reward_description", e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="Es. 1 Lavaggio Completo Gratuito"
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <span>Programma attivo</span>
            </label>
          </div>

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
              <FaTimes /> Annulla
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
                opacity: saving ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <FaSave /> {saving ? "Salvataggio..." : (program ? "Aggiorna" : "Crea")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
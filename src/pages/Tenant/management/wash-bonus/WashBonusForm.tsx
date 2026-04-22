import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";

interface WashBonusFormProps {
  tenantId: string;
  rule: any | null;
  services: any[];
  categories: any[];
  onClose: () => void;
}

export default function WashBonusForm({ tenantId, rule, services, categories, onClose }: WashBonusFormProps) {
  const [form, setForm] = useState({
    wash_service_id: rule?.wash_service_id || "",
    bonus_type: rule?.bonus_type || "free_hours",
    bonus_value: rule?.bonus_value || 0,
    min_wash_amount: rule?.min_wash_amount || "",
    applicable_categories: rule?.applicable_categories || [],
    max_uses_per_day: rule?.max_uses_per_day || "",
    valid_days_of_week: rule?.valid_days_of_week || [],
    is_active: rule?.is_active ?? true,
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";
  const DAYS = [
    { value: 0, label: "Domenica" },
    { value: 1, label: "Lunedì" },
    { value: 2, label: "Martedì" },
    { value: 3, label: "Mercoledì" },
    { value: 4, label: "Giovedì" },
    { value: 5, label: "Venerdì" },
    { value: 6, label: "Sabato" },
  ];

  function handleChange(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleCategoryToggle(categoryId: string) {
    const current = form.applicable_categories || [];
    const newCategories = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    
    setForm(prev => ({ ...prev, applicable_categories: newCategories }));
  }

  function handleDayToggle(day: number) {
    const current = form.valid_days_of_week || [];
    const newDays = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    
    setForm(prev => ({ ...prev, valid_days_of_week: newDays }));
  }

  function handleSelectAllDays() {
    if (form.valid_days_of_week.length === 7) {
      setForm(prev => ({ ...prev, valid_days_of_week: [] }));
    } else {
      setForm(prev => ({ ...prev, valid_days_of_week: [0,1,2,3,4,5,6] }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSaving(true);
  setError(null);

  if (!form.wash_service_id) {
    setError("Seleziona un servizio lavaggio");
    setSaving(false);
    return;
  }

  const payload = {
    tenant_id: tenantId,
    wash_service_id: form.wash_service_id,
    bonus_type: form.bonus_type,
    bonus_value: Number(form.bonus_value),
    min_wash_amount: form.min_wash_amount ? Number(form.min_wash_amount) : null,
    applicable_categories: form.applicable_categories.length ? form.applicable_categories : null,
    max_uses_per_day: form.max_uses_per_day ? Number(form.max_uses_per_day) : null,
    valid_days_of_week: form.valid_days_of_week.length ? form.valid_days_of_week : null,
    is_active: form.is_active,
  };

  console.log("📦 PAYLOAD BONUS:", payload);

  try {
    let result;
    
    if (rule?.id) {
      // Se stiamo modificando una regola esistente, usa UPDATE
      result = await supabase
        .from("wash_parking_bonus_rules")
        .update(payload)
        .eq("id", rule.id);
    } else {
      // Per una nuova regola, usa UPSERT con il vincolo di unicità
      // Supabase userà automaticamente il vincolo UNIQUE che abbiamo creato
      result = await supabase
        .from("wash_parking_bonus_rules")
        .upsert(payload, { 
          onConflict: 'tenant_id, wash_service_id, bonus_type',
          ignoreDuplicates: false 
        });
    }

    if (result.error) {
      console.error("❌ Errore DB:", result.error);
      throw result.error;
    }
    
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
          {rule ? "Modifica regola bonus" : "Nuova regola bonus"}
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
          {/* SERVIZIO LAVAGGIO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Servizio lavaggio *
            </label>
            <select
              value={form.wash_service_id}
              onChange={(e) => handleChange("wash_service_id", e.target.value)}
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
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* TIPO BONUS */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Tipo bonus *
            </label>
            <select
              value={form.bonus_type}
              onChange={(e) => handleChange("bonus_type", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="free_hours">Ore parcheggio gratuite</option>
              <option value="free_parking">Parcheggio gratuito (24h)</option>
              <option value="discount_percentage">Sconto percentuale (%)</option>
              <option value="fixed_discount">Sconto fisso (€)</option>
            </select>
          </div>

          {/* VALORE BONUS */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              {form.bonus_type === 'free_hours' && 'Ore gratuite *'}
              {form.bonus_type === 'free_parking' && 'Valore (fisso 24h)'}
              {form.bonus_type === 'discount_percentage' && 'Percentuale sconto (%) *'}
              {form.bonus_type === 'fixed_discount' && 'Importo sconto (€) *'}
            </label>
            <input
              type="number"
              step={form.bonus_type === 'discount_percentage' ? '1' : '0.5'}
              min="0"
              value={form.bonus_value}
              onChange={(e) => handleChange("bonus_value", e.target.value)}
              required
              disabled={form.bonus_type === 'free_parking'}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: form.bonus_type === 'free_parking' ? "#2d2d3a" : "#0d1117",
                color: "#fff"
              }}
            />
          </div>

          {/* MINIMO LAVAGGI */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Numero minimo lavaggi (opzionale)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.min_wash_amount}
              onChange={(e) => handleChange("min_wash_amount", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="Lascia vuoto per nessun minimo"
            />
          </div>

          {/* MAX UTILIZZI GIORNALIERI */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Max utilizzi al giorno (opzionale)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.max_uses_per_day}
              onChange={(e) => handleChange("max_uses_per_day", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="Lascia vuoto per nessun limite"
            />
          </div>

          {/* GIORNI VALIDI */}
          <div style={{ marginBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ color: "#9ca3af" }}>
                Giorni validi
              </label>
              <button
                type="button"
                onClick={handleSelectAllDays}
                style={{
                  padding: "4px 8px",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: BLUE,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {form.valid_days_of_week.length === 7 ? "Deseleziona tutti" : "Seleziona tutti"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {DAYS.map(day => (
                <label key={day.value} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <input
                    type="checkbox"
                    checked={form.valid_days_of_week.includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Se non selezioni giorni, il bonus vale tutti i giorni.
            </small>
          </div>

          {/* CATEGORIE APPLICABILI */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "10px", color: "#9ca3af" }}>
              Categorie veicolo (opzionale)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {categories.map(cat => (
                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <input
                    type="checkbox"
                    checked={form.applicable_categories.includes(cat.id)}
                    onChange={() => handleCategoryToggle(cat.id)}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Se non selezioni categorie, il bonus vale per tutte.
            </small>
          </div>

          {/* ATTIVA */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
              />
              <span>Regola attiva</span>
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
              {saving ? "Salvataggio..." : (rule ? "Aggiorna" : "Crea")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
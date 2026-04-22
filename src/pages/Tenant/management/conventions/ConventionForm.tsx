import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";

interface ConventionFormProps {
  tenantId: string;
  convention: any | null;
  categories: any[];
  onClose: () => void;
}

export default function ConventionForm({ tenantId, convention, categories, onClose }: ConventionFormProps) {
  const [form, setForm] = useState({
    code: convention?.code || "",
    name: convention?.name || "",
    description: convention?.description || "",
    discount_type: convention?.discount_type || "percentage",
    discount_value: convention?.discount_value || 0,
    max_discount: convention?.max_discount || "",
    applicable_categories: convention?.applicable_categories || [],
    min_hours: convention?.min_hours || "",
    valid_from: convention?.valid_from?.split('T')[0] || "",
    valid_to: convention?.valid_to?.split('T')[0] || "",
    is_active: convention?.is_active ?? true,
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultCustomerId, setDefaultCustomerId] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  useEffect(() => {
    async function loadDefaultCustomer() {
      if (!tenantId) return;
      
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', 'Convenzioni Generiche')
        .maybeSingle();
      
      if (error) {
        console.error("❌ Errore caricamento cliente generico:", error);
      } else if (data) {
        setDefaultCustomerId(data.id);
        console.log("✅ Cliente generico caricato:", data.id);
      } else {
        console.warn("⚠️ Cliente 'Convenzioni Generiche' non trovato per tenant:", tenantId);
      }
    }
    
    loadDefaultCustomer();
  }, [tenantId]);

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

  function handleSelectAllCategories() {
    if (form.applicable_categories.length === categories.length) {
      setForm(prev => ({ ...prev, applicable_categories: [] }));
    } else {
      setForm(prev => ({ ...prev, applicable_categories: categories.map(c => c.id) }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!defaultCustomerId) {
      setError("Cliente di default non trovato. Contatta l'amministratore.");
      setSaving(false);
      return;
    }

    // Validazione per minuti gratuiti (devono essere interi)
    if (form.discount_type === 'free_minutes' && !Number.isInteger(Number(form.discount_value))) {
      setError("I minuti gratuiti devono essere un numero intero");
      setSaving(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      customer_id: defaultCustomerId,
      name: form.name,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      is_active: form.is_active,
    };

    console.log("📦 PAYLOAD CORRETTO:", JSON.stringify(payload, null, 2));

    try {
      let result;
      
      if (convention?.id) {
        result = await supabase
          .from("conventions")
          .update(payload)
          .eq("id", convention.id);
      } else {
        result = await supabase
          .from("conventions")
          .insert(payload);
      }

      console.log("📦 RISPOSTA DB:", result);

      if (result.error) {
        console.error("❌ ERRORE DB DETTAGLIATO COMPLETO:", result.error);
        console.error("❌ MESSAGGIO:", result.error.message);
        console.error("❌ DETTAGLI:", result.error.details);
        console.error("❌ HINT:", result.error.hint);
        console.error("❌ CODICE:", result.error.code);
        throw result.error;
      }
      
      onClose();
    } catch (err: any) {
      console.error("❌ ECCEZIONE CATCH:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(err.message || "Errore durante il salvataggio");
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
          {convention ? "Modifica convenzione" : "Nuova convenzione"}
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
          {/* CODICE */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Codice *
            </label>
            <input
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
              placeholder="es. HOTEL-ROMA"
            />
          </div>

          {/* NOME */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Nome *
            </label>
            <input
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
              placeholder="es. Convenzione Hotel Roma"
            />
          </div>

          {/* DESCRIZIONE */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Descrizione
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff",
                minHeight: "80px"
              }}
              placeholder="Descrizione della convenzione"
            />
          </div>

          {/* TIPO SCONTO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Tipo sconto *
            </label>
            <select
              value={form.discount_type}
              onChange={(e) => handleChange("discount_type", e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            >
              <option value="percentage">Percentuale (%)</option>
              <option value="fixed">Importo fisso (€)</option>
              <option value="free_minutes">Minuti gratuiti</option> {/* ← MODIFICATO */}
            </select>
          </div>

          {/* VALORE SCONTO */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              {form.discount_type === 'percentage' && 'Percentuale sconto (%) *'}
              {form.discount_type === 'fixed' && 'Importo sconto (€) *'}
              {form.discount_type === 'free_minutes' && 'Minuti gratuiti *'} {/* ← MODIFICATO */}
            </label>
            <input
              type="number"
              step={form.discount_type === 'percentage' ? '1' : (form.discount_type === 'free_minutes' ? '1' : '0.01')}
              min="0"
              value={form.discount_value}
              onChange={(e) => handleChange("discount_value", e.target.value)}
              required
              placeholder={
                form.discount_type === 'free_minutes' 
                  ? 'es. 30' 
                  : (form.discount_type === 'percentage' ? 'es. 20' : 'es. 5.00')
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #333",
                background: "#0d1117",
                color: "#fff"
              }}
            />
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              {form.discount_type === 'free_minutes' 
                ? 'Numero di minuti di sosta gratuiti (numero intero).'
                : (form.discount_type === 'percentage' 
                    ? 'Valore percentuale dello sconto (es. 20 = 20%).' 
                    : 'Importo in euro da detrarre dal totale.')}
            </small>
          </div>

          {/* MASSIMO SCONTO (solo per percentuale e fisso) */}
          {(form.discount_type === 'percentage' || form.discount_type === 'fixed') && (
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Massimo sconto (€) - opzionale
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.max_discount}
                onChange={(e) => handleChange("max_discount", e.target.value)}
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
              <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
                Importo massimo dello sconto applicabile in euro.
              </small>
            </div>
          )}

          {/* MINIMO ORE */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Ore minime per sconto
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.min_hours}
              onChange={(e) => handleChange("min_hours", e.target.value)}
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
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Ore minime di sosta per poter applicare la convenzione.
            </small>
          </div>

          {/* CATEGORIE APPLICABILI */}
          <div style={{ marginBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <label style={{ color: "#9ca3af" }}>
                Categorie applicabili
              </label>
              <button
                type="button"
                onClick={handleSelectAllCategories}
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
                {form.applicable_categories.length === categories.length ? "Deseleziona tutte" : "Seleziona tutte"}
              </button>
            </div>
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
              Seleziona le categorie a cui si applica la convenzione. Nessuna selezione = applicabile a tutte.
            </small>
          </div>

          {/* VALIDITÀ */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
              Periodo di validità (opzionale)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af", fontSize: "12px" }}>
                  Dal
                </label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => handleChange("valid_from", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #333",
                    background: "#0d1117",
                    color: "#fff"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af", fontSize: "12px" }}>
                  Al
                </label>
                <input
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => handleChange("valid_to", e.target.value)}
                  min={form.valid_from}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #333",
                    background: "#0d1117",
                    color: "#fff"
                  }}
                />
              </div>
            </div>
            <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
              Lascia vuoto per validità illimitata.
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
              <span>Convenzione attiva</span>
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
              {saving ? "Salvataggio..." : (convention ? "Aggiorna" : "Crea")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
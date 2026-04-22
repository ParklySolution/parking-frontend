// src/pages/Tenant/management/components/PricingModal.tsx
import { useEffect, useState } from "react";
import { getTariffaBase, saveTariffaBase } from "@/services/pricingService";
import { getVehicleCategories } from "@/services/vehicleCategoryService";

// Costanti colori
const BLUE = "#3B82F6";
const GREEN = "#10b981";
const RED = "#ef4444";

interface PriceList {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  tenant_id: string;
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  tenant_id: string;
}

interface TariffaValues {
  // Tariffe orarie (si applicano a tutte le ore)
  first_hour?: number;      // Prima ora
  next_hours?: number;      // Ore successive
  
  // Tariffa notturna (opzionale, se diversa da quella diurna)
  night_hourly?: number;     // Tariffa oraria notturna
  
  // Massimo per la sola fascia diurna
  day_max?: number;         // Max per ore 8-20
  
  // Pernottamento 24h
  overnight_24h?: number;    // Tariffa fissa 24 ore
}

interface Props {
  list: PriceList;
  onClose: () => void;
}

export default function PricingModal({ list, onClose }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tariffe, setTariffe] = useState<Record<string, TariffaValues>>({});
  const [savedRows, setSavedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [list.id, list.tenant_id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Carica categorie
      const cats = await getVehicleCategories(list.tenant_id);
      setCategories(cats);

      // Carica tariffe per ogni categoria usando getTariffaBase
      const tariffeMap: Record<string, TariffaValues> = {};
      
      for (const cat of cats) {
        const tariffa = await getTariffaBase(list.tenant_id, cat.id);
        if (tariffa) {
          tariffeMap[cat.id] = {
            first_hour: tariffa.first_hour,
            next_hours: tariffa.next_hours,
            night_hourly: tariffa.night_hourly,
            day_max: tariffa.day_max,
            overnight_24h: tariffa.overnight_24h
          };
        }
      }
      
      setTariffe(tariffeMap);
    } catch (err) {
      console.error("❌ Errore caricamento tariffe:", err);
      setError("Errore durante il caricamento delle tariffe");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (categoryId: string, field: keyof TariffaValues, value: string) => {
    setTariffe((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value === "" ? undefined : Number(value),
      },
    }));

    if (savedRows[categoryId]) {
      setSavedRows((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleSave = async (categoryId: string) => {
    try {
      const values = tariffe[categoryId] || {};

      await saveTariffaBase(list.id, categoryId, values);
      
      setSavedRows((prev) => ({ ...prev, [categoryId]: true }));
      setError(null);
    } catch (err: any) {
      console.error("❌ Errore salvataggio tariffa:", err);
      setError(err.message || "Errore durante il salvataggio");
    }
  };

  const handleEdit = (categoryId: string) => {
    setSavedRows((prev) => ({ ...prev, [categoryId]: false }));
  };

  if (loading) {
    return (
      <div style={modalStyle}>
        <div style={modalContentStyle}>
          <p style={{ color: "#9ca3af", textAlign: "center" }}>
            Caricamento tariffe...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: BLUE, margin: 0 }}>
            ✏️ Tariffe base — {list.name}
          </h2>
          <button onClick={onClose} style={closeButton}>✕</button>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {/* Tabella tariffe */}
        {categories.length === 0 ? (
          <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
            Nessuna categoria disponibile
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle} rowSpan={2}>Categoria</th>
                  <th style={{ ...thStyle, background: "#2d4a8a" }} colSpan={2}>💰 TARIFFE BASE</th>
                  <th style={{ ...thStyle, background: "#4a2d8a" }}>🌙 NOTTE</th>
                  <th style={{ ...thStyle, background: "#f59e0b" }}>📅 MAX DIURNO</th>
                  <th style={{ ...thStyle, background: "#2d8a4a" }}>🏨 PERNOTTO</th>
                  <th style={thStyle} rowSpan={2}></th>
                </tr>
                <tr style={headerRowStyle}>
                  <th style={thSubStyle}>Prima ora (€)</th>
                  <th style={thSubStyle}>Ore succ. (€)</th>
                  <th style={thSubStyle}>Tariffa notte (€/h)</th>
                  <th style={thSubStyle}>Max 8-20 (€)</th>
                  <th style={thSubStyle}>24h fissa (€)</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((c) => {
                  const isSaved = savedRows[c.id] === true;
                  const t = tariffe[c.id] || {};

                  return (
                    <tr key={c.id} style={rowStyle}>
                      <td style={tdStyle}><strong>{c.name}</strong></td>
                      
                      {/* Prima ora */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSaved}
                          value={t.first_hour ?? ""}
                          onChange={(e) => handleInputChange(c.id, "first_hour", e.target.value)}
                          placeholder="€"
                          style={inputStyle}
                        />
                      </td>
                      
                      {/* Ore successive */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSaved}
                          value={t.next_hours ?? ""}
                          onChange={(e) => handleInputChange(c.id, "next_hours", e.target.value)}
                          placeholder="€"
                          style={inputStyle}
                        />
                      </td>
                      
                      {/* Tariffa notturna (opzionale) */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSaved}
                          value={t.night_hourly ?? ""}
                          onChange={(e) => handleInputChange(c.id, "night_hourly", e.target.value)}
                          placeholder="€/h"
                          style={inputStyle}
                        />
                      </td>
                      
                      {/* Massimo diurno (solo fascia 8-20) */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSaved}
                          value={t.day_max ?? ""}
                          onChange={(e) => handleInputChange(c.id, "day_max", e.target.value)}
                          placeholder="€"
                          style={inputStyle}
                        />
                      </td>
                      
                      {/* Pernottamento 24h */}
                      <td style={tdStyle}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSaved}
                          value={t.overnight_24h ?? ""}
                          onChange={(e) => handleInputChange(c.id, "overnight_24h", e.target.value)}
                          placeholder="€"
                          style={inputStyle}
                        />
                      </td>
                      
                      {/* Bottone Salva/Modifica */}
                      <td style={tdStyle}>
                        {isSaved ? (
                          <button onClick={() => handleEdit(c.id)} style={editButtonStyle}>
                            ✓ Modifica
                          </button>
                        ) : (
                          <button onClick={() => handleSave(c.id)} style={saveButtonStyle}>
                            💾 Salva
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div style={{ marginTop: "15px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
              <p>💰 <strong>Tariffe base:</strong> si applicano a tutte le ore (prima ora + ore successive)</p>
              <p>🌙 <strong>Tariffa notturna:</strong> se impostata, sostituisce la tariffa base nelle ore 20:00-08:00</p>
              <p>📅 <strong>Max diurno:</strong> limite massimo per le ore in fascia 08:00-20:00</p>
              <p>🏨 <strong>Pernottamento 24h:</strong> tariffa fissa per soste di 24+ ore (sostituisce il calcolo orario)</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button onClick={onClose} style={closeModalButton}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   STILI
   ====================================================== */
const modalStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalContentStyle = {
  background: "#0d1117",
  padding: "24px",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "1000px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  border: "1px solid rgba(255,255,255,0.1)",
};

const closeButton = {
  background: "transparent",
  border: "none",
  color: "#9ca3af",
  fontSize: "20px",
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "4px",
};

const errorStyle = {
  backgroundColor: RED,
  color: "white",
  padding: "12px",
  borderRadius: "6px",
  marginBottom: "20px",
};

const inputStyle = {
  width: "80px",
  padding: "6px 8px",
  borderRadius: "4px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d1117",
  color: "#fff",
  fontSize: "13px",
  textAlign: "center" as const,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#111418",
  borderRadius: "12px",
  overflow: "hidden",
  fontSize: "13px",
};

const headerRowStyle = {
  background: "#1a1f25",
  color: "#9ca3af",
};

const thStyle = {
  padding: "12px 8px",
  textAlign: "center" as const,
  borderBottom: "1px solid #333",
  fontWeight: "600",
};

const thSubStyle = {
  padding: "8px 4px",
  textAlign: "center" as const,
  background: "#1a1f25",
  color: "#9ca3af",
  fontSize: "11px",
  borderBottom: "1px solid #333",
};

const tdStyle = {
  padding: "8px 4px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  textAlign: "center" as const,
};

const rowStyle = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const saveButtonStyle = {
  padding: "6px 10px",
  borderRadius: "4px",
  border: "none",
  background: BLUE,
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "11px",
  whiteSpace: "nowrap" as const,
};

const editButtonStyle = {
  padding: "6px 10px",
  borderRadius: "4px",
  border: "none",
  background: GREEN,
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "11px",
  whiteSpace: "nowrap" as const,
};

const closeModalButton = {
  padding: "10px 24px",
  borderRadius: "8px",
  border: "none",
  background: RED,
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "14px",
};
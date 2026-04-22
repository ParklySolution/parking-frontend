// src/pages/Admin/PricingModal.tsx
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
  first_hour?: number;
  next_hours?: number;
  hourly?: number;
  night_hourly?: number;
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
            hourly: tariffa.hourly,
            night_hourly: tariffa.night_hourly
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
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle} colSpan={2}>🌞 FASCIA DIURNA</th>
                  <th style={thStyle}>🌙 NOTTE (20-8)</th>
                  <th style={thStyle}></th>
                </tr>
                <tr style={headerRowStyle}>
                  <th style={thSubStyle}></th>
                  <th style={thSubStyle}>Prima ora (€)</th>
                  <th style={thSubStyle}>Ore succ. (€)</th>
                  <th style={thSubStyle}>Tariffa (€/h)</th>
                  <th style={thSubStyle}></th>
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
                      
                      {/* Tariffa notturna */}
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
            
            <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "10px", textAlign: "center" }}>
              ⏱️ Le tariffe notturne si applicano automaticamente dalle 20:00 alle 08:00
            </p>
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
  maxWidth: "800px",
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
import { useEffect, useState } from "react";
import { syncAllGlobalModels, syncBrandModels } from "@/services/globalModelsSyncService";
import { fetchGlobalBrands } from "@/services/globalBrandsService";

interface GlobalBrand {
  id: string;
  name: string;
  is_active: boolean;
  order: number;
}

export default function ModelsSyncPage() {
  const [brands, setBrands] = useState<GlobalBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingBrandId, setSyncingBrandId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ total?: number; brands?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(true);

  const BLUE = "#3B82F6";
  const GREEN = "#10b981";
  const RED = "#ef4444";

  // 🔥 CARICA MARCHE DAL BACKEND (NON DA SUPABASE DIRETTO)
  const loadBrands = async () => {
    setLoadingBrands(true);
    setError(null);
    try {
      const data = await fetchGlobalBrands();
      setBrands(data);
    } catch (err) {
      console.error("Errore caricamento marche:", err);
      setError("Errore durante il caricamento delle marche");
    } finally {
      setLoadingBrands(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleSyncAll = async () => {
    setLoading(true);
    setError(null);
    setSyncResult(null);
    
    try {
      const result = await syncAllGlobalModels();
      if (result.success) {
        setSyncResult({
          total: result.data?.new_models_added,
          brands: result.data?.brands_processed
        });
        await loadBrands();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || "Errore durante la sincronizzazione");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncBrand = async (brandId: string, brandName: string) => {
    setSyncingBrandId(brandId);
    setError(null);
    
    try {
      const result = await syncBrandModels(brandId);
      if (result.success) {
        alert(`✅ Sincronizzazione completata per ${brandName}!\nNuovi modelli aggiunti: ${result.data?.new_models_added || 0}`);
        await loadBrands();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || `Errore durante la sincronizzazione di ${brandName}`);
    } finally {
      setSyncingBrandId(null);
    }
  };

  if (loadingBrands) {
    return (
      <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af" }}>
        ⏳ Caricamento marche...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ color: "#fff", fontSize: "28px", fontWeight: 700, margin: 0 }}>
          🔄 Sincronizzazione Modelli Veicolo
        </h1>
        <p style={{ color: "#9ca3af", marginTop: "8px" }}>
          Sincronizza i modelli veicolo con l'API ufficiale NHTSA
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: RED, color: "#fff", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          ❌ {error}
        </div>
      )}

      {/* Sync All Button */}
      <div style={{ 
        background: "#111418", 
        borderRadius: "12px", 
        padding: "24px", 
        marginBottom: "24px", 
        border: "1px solid rgba(255,255,255,0.08)" 
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 style={{ color: "#fff", marginBottom: "8px" }}>Sincronizzazione completa</h3>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "14px" }}>
              Aggiorna i modelli per TUTTE le marche contemporaneamente
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={loading}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: BLUE,
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "⏳ Sincronizzazione in corso..." : "🔄 Sincronizza tutti i modelli"}
          </button>
        </div>

        {syncResult && (
          <div style={{ marginTop: "20px", padding: "16px", background: "#1a1f25", borderRadius: "8px" }}>
            <p style={{ color: GREEN, margin: 0 }}>
              ✅ Sincronizzazione completata!
            </p>
            <p style={{ color: "#9ca3af", marginTop: "8px", fontSize: "14px" }}>
              Marche processate: {syncResult.brands} | Nuovi modelli aggiunti: {syncResult.total}
            </p>
          </div>
        )}
      </div>

      {/* Marche list */}
      <h3 style={{ color: "#fff", marginBottom: "16px" }}>Sincronizzazione per marca</h3>
      
      <div style={{ 
        background: "#111418", 
        borderRadius: "12px", 
        overflow: "hidden", 
        border: "1px solid rgba(255,255,255,0.08)" 
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1f25", color: "#9ca3af", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={{ padding: "14px 16px" }}>Ordine</th>
              <th style={{ padding: "14px 16px" }}>Marca</th>
              <th style={{ padding: "14px 16px", width: "180px" }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {brands.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  Nessuna marca trovata
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "12px 16px", color: "#9ca3af" }}>{b.order}</td>
                  <td style={{ padding: "12px 16px", color: "#fff" }}>
                    {b.name}
                    {!b.is_active && <span style={{ color: RED, marginLeft: "8px", fontSize: "12px" }}>(inattiva)</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => handleSyncBrand(b.id, b.name)}
                      disabled={syncingBrandId === b.id}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        color: BLUE,
                        cursor: syncingBrandId === b.id ? "not-allowed" : "pointer",
                        opacity: syncingBrandId === b.id ? 0.6 : 1
                      }}
                    >
                      {syncingBrandId === b.id ? "⏳ Sincronizzo..." : "🔄 Sincronizza modelli"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ 
        marginTop: "24px", 
        padding: "16px", 
        background: "#1a1f25", 
        borderRadius: "8px", 
        borderLeft: `4px solid ${BLUE}` 
      }}>
        <p style={{ color: "#9ca3af", margin: 0, fontSize: "13px" }}>
          ℹ️ I dati provengono dall'API ufficiale NHTSA (National Highway Traffic Safety Administration).<br />
          La sincronizzazione aggiunge solo modelli mancanti, non rimuove quelli esistenti.
        </p>
      </div>
    </div>
  );
}
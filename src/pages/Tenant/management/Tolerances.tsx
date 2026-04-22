import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";

export default function TenantTolerances() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [freeFirst, setFreeFirst] = useState(0);
  const [afterFirst, setAfterFirst] = useState(0);
  const [firstHourTolerance, setFirstHourTolerance] = useState(0);
  const [firstHourTolerancePrice, setFirstHourTolerancePrice] = useState(0);
  const [tolerancePaid, setTolerancePaid] = useState(false);

  const BLUE = "#3B82F6";

  /* ======================================================
     LOAD TOLERANCES
     ====================================================== */
  useEffect(() => {
    if (!tenantId) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("parking_tolerances")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (error) {
          console.error("❌ Errore caricamento tolleranze:", error);
          setError("Errore durante il caricamento delle tolleranze");
        }

        if (data) {
          setFreeFirst(data.initial_free_minutes ?? 0);
          setAfterFirst(data.post_hour_tolerance_minutes ?? 0);
          setFirstHourTolerance(data.first_hour_tolerance_minutes ?? 0);
          setFirstHourTolerancePrice(data.first_hour_tolerance_price ?? 0);
          setTolerancePaid((data.first_hour_tolerance_price ?? 0) > 0);
        }
      } catch (err) {
        console.error("❌ Errore fetch tolleranze:", err);
        setError("Errore durante il caricamento delle tolleranze");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tenantId]);

  /* ======================================================
     SAVE (UPSERT)
     ====================================================== */
  const save = async () => {
    if (!tenantId) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("parking_tolerances")
        .upsert(
          {
            tenant_id: tenantId,
            initial_free_minutes: freeFirst,
            post_hour_tolerance_minutes: afterFirst,
            first_hour_tolerance_minutes: firstHourTolerance,
            first_hour_tolerance_price: tolerancePaid ? firstHourTolerancePrice : 0,
          },
          { onConflict: "tenant_id" }
        );

      if (error) {
        console.error("❌ Errore salvataggio tolleranze:", error);
        setError("Errore nel salvataggio delle tolleranze");
      } else {
        alert("Tolleranze salvate con successo");
      }
    } catch (err) {
      console.error("❌ Errore upsert tolleranze:", err);
      setError("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  /* ======================================================
     UI STATES
     ====================================================== */
  if (!tenantId) {
    return (
      <div style={{ color: "#ff4444", padding: "24px" }}>
        Errore: Tenant ID non presente nell'URL
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        Caricamento tolleranze...
      </div>
    );
  }

  /* ======================================================
     UI
     ====================================================== */
  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      <h2 style={{ fontSize: "28px", fontWeight: 700, color: BLUE, marginBottom: "8px" }}>
        ⏱️ Tolleranze di sosta
      </h2>

      <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
        Valide per <strong>tutte le categorie</strong>
      </p>

      {error && (
        <div
          style={{
            background: "#ff4444",
            color: "white",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
            maxWidth: "420px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          background: "#111418",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          maxWidth: "420px",
        }}
      >
        {/* CAMPO 1 */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>🕒 Minuti gratuiti prima ora</label>
          <input
            type="number"
            min={0}
            value={freeFirst}
            onChange={(e) => setFreeFirst(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* CAMPO 2 */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>➕ Tolleranza dopo la prima ora (min)</label>
          <input
            type="number"
            min={0}
            value={afterFirst}
            onChange={(e) => setAfterFirst(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* CAMPO 3 */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>⏳ Tolleranza prima ora (min)</label>
          <input
            type="number"
            min={0}
            value={firstHourTolerance}
            onChange={(e) => setFirstHourTolerance(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* CHECKBOX */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={tolerancePaid}
              onChange={(e) => setTolerancePaid(e.target.checked)}
            />
            💰 Applica tariffa alla tolleranza
          </label>
        </div>

        {/* PREZZO */}
        {tolerancePaid && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>💵 Prezzo tolleranza prima ora (€)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={firstHourTolerancePrice}
              onChange={(e) => setFirstHourTolerancePrice(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{
            marginTop: "8px",
            background: BLUE,
            color: "#000",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          💾 Salva tolleranze
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#9ca3af",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d1117",
  color: "#fff",
};
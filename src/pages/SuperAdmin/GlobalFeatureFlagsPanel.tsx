// src/pages/SuperAdmin/GlobalFeatureFlagsPanel.tsx

import { useEffect, useState } from "react";
import {
  getGlobalFeatureFlags,
  updateGlobalFeatureFlag,
} from "@/services/superAdminService";
import { logAudit } from "@/services/auditLog";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  category: string | null;
  icon: string | null;
};

export default function GlobalFeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  /* ============================================================
     LOAD GLOBAL FLAGS
  ============================================================ */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      await logAudit({
        action: "view_global_feature_flags",
        entity: "feature_flag",
        entity_id: null,
        details: {},
      });

      const data = await getGlobalFeatureFlags();
      setFlags(data);
    } catch (err) {
      console.error("Errore caricamento feature flags globali:", err);
    }
    setLoading(false);
  }

  /* ============================================================
     TOGGLE FLAG
  ============================================================ */
  async function toggleFlag(key: string, enabled: boolean) {
    setSavingKey(key);

    try {
      await updateGlobalFeatureFlag(key, enabled);

      await logAudit({
        action: "toggle_global_feature_flag",
        entity: "feature_flag",
        entity_id: key,
        details: {
          feature: key,
          new_value: enabled,
        },
      });

      await load();
    } catch (err) {
      console.error("Errore aggiornamento flag:", err);
      alert("Errore durante l'aggiornamento della feature flag");
    }

    setSavingKey(null);
  }

  /* ============================================================
     GROUP FLAGS BY CATEGORY
  ============================================================ */
  const grouped = flags.reduce((acc: Record<string, FeatureFlag[]>, f) => {
    const cat = f.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    core: "Core",
    monetization: "Monetizzazione",
    services: "Servizi",
    automation: "Automazioni",
    security: "Sicurezza",
    other: "Altro",
  };

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) {
    return (
      <div
        style={{
          padding: "24px",
          background: "#0d1117",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2 style={{ color: "#fff", fontSize: "22px", marginBottom: "12px" }}>
          Feature Flags Globali
        </h2>
        <p style={{ color: "#aaa" }}>Caricamento…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        background: "#0d1117",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "20px" }}>
        <h2
          style={{
            color: "#4ea8ff",
            fontSize: "28px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Feature Flags Globali
        </h2>
        <p
          style={{
            color: "#9ca3af",
            marginTop: "6px",
            fontSize: "15px",
          }}
        >
          Gestisci i moduli e le funzionalità disponibili per tutti i tenant.
        </p>
      </div>

      {/* CATEGORIE */}
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {Object.keys(grouped).map((cat) => (
          <div key={cat}>
            {/* CATEGORY TITLE */}
            <h3
              style={{
                color: "#fff",
                fontSize: "20px",
                marginBottom: "12px",
                textTransform: "capitalize",
                borderLeft: "4px solid #4ea8ff",
                paddingLeft: "10px",
              }}
            >
              {categoryLabels[cat] || cat}
            </h3>

            {/* FLAGS LIST */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {grouped[cat].map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "16px",
                    background: "#111418",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ fontSize: "22px" }}>{f.icon || "⚙️"}</div>

                    <div>
                      <div
                        style={{
                          color: "#fff",
                          fontSize: "16px",
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >
                        {f.key.replace(/_/g, " ")}
                      </div>
                      <div
                        style={{
                          color: "#9ca3af",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {f.description || "Nessuna descrizione"}
                      </div>
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      disabled={savingKey === f.key}
                      onChange={(e) => toggleFlag(f.key, e.target.checked)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    {savingKey === f.key && (
                      <span style={{ color: "#aaa", fontSize: "12px" }}>
                        Salvataggio…
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

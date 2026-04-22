// src/pages/SuperAdmin/TenantFeatureFlagsPanel.tsx

import { useEffect, useState } from "react";
import {
  getGlobalFeatureFlags,
  getTenantFeatures,
  updateTenantFeatures,
} from "@/services/superAdminService";
import { logAudit } from "@/services/auditLog";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
};

export default function TenantFeatureFlagsPanel({ tenantId }: { tenantId: string }) {
  const [globalFlags, setGlobalFlags] = useState<FeatureFlag[]>([]);
  const [mergedFlags, setMergedFlags] = useState<any>({});
  const [overrides, setOverrides] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  /* ============================================================
     LOAD FLAGS (NUOVO SCHEMA)
  ============================================================ */
  useEffect(() => {
    load();
  }, [tenantId]);

  async function load() {
    setLoading(true);
    try {
      await logAudit({
        action: "view_tenant_feature_flags",
        entity: "tenant",
        entity_id: tenantId,
        details: {},
      });

      const globals = await getGlobalFeatureFlags();
      const merged = await getTenantFeatures(tenantId);

      setGlobalFlags(globals);
      setMergedFlags(merged);

      // estrai override reali
      const overrideKeys = Object.keys(merged).filter(
        (key) => merged[key] !== globals.find((g) => g.key === key)?.enabled
      );

      const overrideObj: any = {};
      overrideKeys.forEach((key) => {
        overrideObj[key] = merged[key];
      });

      setOverrides(overrideObj);
    } catch (err) {
      console.error("Errore caricamento feature flags tenant:", err);
    }
    setLoading(false);
  }

  /* ============================================================
     TOGGLE FLAG (NUOVO SCHEMA)
  ============================================================ */
  async function toggleFlag(key: string, enabled: boolean) {
    setSavingKey(key);

    const newOverrides = {
      ...overrides,
      [key]: enabled,
    };

    setOverrides(newOverrides);

    try {
      await updateTenantFeatures(tenantId, newOverrides);

      await logAudit({
        action: "toggle_tenant_feature_flag",
        entity: "tenant",
        entity_id: tenantId,
        details: {
          feature: key,
          new_value: enabled,
        },
      });

      const merged = await getTenantFeatures(tenantId);
      setMergedFlags(merged);
    } catch (err) {
      console.error("Errore aggiornamento flag tenant:", err);
      alert("Errore durante l'aggiornamento della feature flag");
    }

    setSavingKey(null);
  }

  /* ============================================================
     RESET OVERRIDES
  ============================================================ */
  async function resetOverrides() {
    setSavingKey("reset");

    try {
      await updateTenantFeatures(tenantId, {});

      await logAudit({
        action: "reset_tenant_feature_overrides",
        entity: "tenant",
        entity_id: tenantId,
        details: {},
      });

      await load();
    } catch (err) {
      console.error("Errore reset override:", err);
      alert("Errore durante il reset delle feature");
    }

    setSavingKey(null);
  }

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
          Feature Flags Tenant
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            color: "#4ea8ff",
            fontSize: "26px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Feature Flags Tenant
        </h2>

        <button
          onClick={resetOverrides}
          disabled={savingKey === "reset"}
          style={{
            padding: "8px 14px",
            background: "#111418",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            cursor: "pointer",
            opacity: savingKey === "reset" ? 0.6 : 1,
          }}
        >
          {savingKey === "reset" ? "Reset…" : "Reset override"}
        </button>
      </div>

      {/* LISTA FLAG */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {globalFlags.map((f) => {
          const effectiveValue = mergedFlags[f.key] ?? f.enabled;
          const isOverride = overrides.hasOwnProperty(f.key);

          return (
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
              <div>
                <div
                  style={{
                    color: "#fff",
                    fontSize: "16px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {f.key}
                </div>

                <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "4px" }}>
                  {f.description || "Nessuna descrizione"}
                </div>

                {isOverride && (
                  <div style={{ color: "#4ea8ff", fontSize: "12px", marginTop: "4px" }}>
                    override attivo
                  </div>
                )}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={effectiveValue}
                  disabled={savingKey === f.key}
                  onChange={(e) => toggleFlag(f.key, e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                {savingKey === f.key && (
                  <span style={{ color: "#aaa", fontSize: "12px" }}>Salvataggio…</span>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

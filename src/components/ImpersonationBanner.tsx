// src/components/ImpersonationBanner.tsx

import { useEffect, useState } from "react";
import { exitImpersonation } from "@/services/exitImpersonationService";
import { useNavigate } from "react-router-dom";
import { logAudit } from "@/services/auditLog";

export default function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const navigate = useNavigate();

  /* ============================================================
     CHECK IMPERSONATION STATUS (LOCALSTORAGE-BASED)
  ============================================================ */
  useEffect(() => {
    const flag = localStorage.getItem("is_impersonating") === "true";
    const name = localStorage.getItem("impersonated_tenant_name");

    if (flag) {
      setIsImpersonating(true);
      setTenantName(name ?? "Tenant");

      // ⭐ AUDIT LOG: impersonation attiva
      logAudit({
        action: "impersonation_active",
        entity: "tenant",
        entity_id: null,
        details: { tenant_name: name },
      });
    }
  }, []);

  if (!isImpersonating) return null;

  /* ============================================================
     EXIT IMPERSONATION
  ============================================================ */
  async function handleExit() {
    // ⭐ AUDIT LOG: intento di uscita
    await logAudit({
      action: "impersonation_exit_intent",
      entity: "tenant",
      entity_id: null,
      details: {},
    });

    const ok = await exitImpersonation();

    if (ok) {
      // ⭐ AUDIT LOG: uscita completata
      await logAudit({
        action: "impersonation_exit",
        entity: "tenant",
        entity_id: null,
        details: {},
      });

      // Rimuovi flag
      localStorage.removeItem("is_impersonating");
      localStorage.removeItem("impersonated_tenant_name");
      localStorage.removeItem("superadmin_original_session");

      navigate("/super/tenants");
    }
  }

  /* ============================================================
     RENDER BANNER
  ============================================================ */
  return (
    <div
      style={{
        width: "100%",
        background: "#facc15",
        padding: "12px 20px",
        textAlign: "center",
        fontWeight: 600,
        fontSize: "16px",
        color: "#000",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      }}
    >
      <span>
        Stai impersonando il tenant: <strong>{tenantName}</strong>
      </span>

      <button
        onClick={handleExit}
        style={{
          background: "#000",
          color: "#fff",
          padding: "8px 14px",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Torna come Super Admin
      </button>
    </div>
  );
}

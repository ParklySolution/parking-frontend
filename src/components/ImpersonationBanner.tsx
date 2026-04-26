// src/components/ImpersonationBanner.tsx

import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { exitImpersonation } from "@/services/exitImpersonationService";
import { useNavigate } from "react-router-dom";
import { logAudit } from "@/services/auditLog";

export default function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkImpersonation() {
      const flag = localStorage.getItem("is_impersonating") === "true";
      const tenantId = localStorage.getItem("impersonated_tenant_id");
      
      if (flag && tenantId) {
        setIsImpersonating(true);
        
        // 🔥 RECUPERA IL NOME DEL TENANT DAL DATABASE
        const { data, error } = await supabase
          .from("admin_tenants")
          .select("name")
          .eq("id", tenantId)
          .maybeSingle();
        
        if (!error && data) {
          setTenantName(data.name);
          // Aggiorna anche il localStorage per uso futuro
          localStorage.setItem("impersonated_tenant_name", data.name);
        } else {
          setTenantName("Caricamento...");
        }

        logAudit({
          action: "impersonation_active",
          entity: "tenant",
          entity_id: tenantId,
          details: {},
        });
      }
    }
    
    checkImpersonation();
  }, []);

  if (!isImpersonating) return null;

  async function handleExit() {
    await logAudit({
      action: "impersonation_exit_intent",
      entity: "tenant",
      entity_id: null,
      details: {},
    });

    const ok = await exitImpersonation();

    if (ok) {
      await logAudit({
        action: "impersonation_exit",
        entity: "tenant",
        entity_id: null,
        details: {},
      });

      localStorage.removeItem("is_impersonating");
      localStorage.removeItem("impersonated_tenant_name");
      localStorage.removeItem("impersonated_tenant_id");
      localStorage.removeItem("superadmin_original_session");

      navigate("/super/tenants");
    }
  }

  return (
    <div
      style={{
        width: "100%",
        background: "#3B82F6",
        padding: "12px 20px",
        textAlign: "center",
        fontWeight: 600,
        fontSize: "16px",
        color: "#fff",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 10000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      }}
    >
      <span>
        🔓 Stai impersonando il tenant: <strong>{tenantName || "Caricamento..."}</strong>
      </span>

      <button
        onClick={handleExit}
        style={{
          background: "#fff",
          color: "#3B82F6",
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

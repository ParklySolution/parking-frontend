import { useEffect, useState, useRef } from "react";
import { supabase } from "@/services/supabase";
import { exitImpersonation } from "@/services/exitImpersonationService";
import { useNavigate } from "react-router-dom";

interface TenantHeaderProps {
  tenantId?: string;
}

export default function TenantHeader({ tenantId }: TenantHeaderProps) {
  const [tenantName, setTenantName] = useState<string>("Caricamento...");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function load() {
      try {
        const impersonating =
          localStorage.getItem("is_impersonating") === "true";
        if (isMountedRef.current) setIsImpersonating(impersonating);

        if (!tenantId) {
          if (isMountedRef.current) setTenantName("Nessun ID");
          return;
        }

        console.log("📡 [TenantHeader] Query su admin_tenants per ID:", tenantId);

        const { data, error } = await supabase
          .from("admin_tenants")
          .select("name")
          .eq("id", tenantId)
          .maybeSingle();

        if (!isMountedRef.current) return;

        if (error) {
          console.error("❌ Errore tenant:", error);
          setTenantName("Errore");
          return;
        }

        if (!data) {
          setTenantName("Tenant non trovato");
          return;
        }

        console.log("✅ Tenant trovato:", data.name);
        setTenantName(data.name);
      } catch (err) {
        if (isMountedRef.current) setTenantName("Errore");
      }
    }

    load();

    return () => {
      isMountedRef.current = false;
    };
  }, [tenantId]);

  async function handleExit() {
    const ok = await exitImpersonation();
    if (ok) navigate("/super/tenants");
  }

  return (
    <header
      style={{
        height: "64px",
        background: "#3B82F6",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <span style={{ fontSize: "18px", color: "#FFFFFF" }}>🏢</span>
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            {tenantName}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "rgba(255,255,255,0.8)",
              marginTop: "2px",
            }}
          >
            {isImpersonating
              ? `Accesso come ${tenantName}`
              : "Dashboard tenant"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {isImpersonating && (
          <button
            onClick={handleExit}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              padding: "8px 16px",
              borderRadius: "8px",
              color: "#FFFFFF",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>↩️</span>
            Esci impersonation
          </button>
        )}

        <div
          style={{
            width: "36px",
            height: "36px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "18px", color: "#FFFFFF" }}>👤</span>
        </div>
      </div>
    </header>
  );
} // ⬅️ QUESTA MANCAVA

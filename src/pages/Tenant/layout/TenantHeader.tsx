import { useEffect, useState } from "react";
import { exitImpersonation } from "@/services/exitImpersonationService";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { api } from "@/services/api.service";

export default function TenantHeader() {
  const [tenantName, setTenantName] = useState<string>("");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const navigate = useNavigate();
  const { tenantId } = useParams();

  const BLUE = "#3B82F6";
  const DARK_BG = "#111418";
  const LIGHTER_BG = "#1a1f25";
  const BORDER_COLOR = "rgba(255,255,255,0.05)";
  const TEXT_PRIMARY = "#fff";
  const TEXT_SECONDARY = "#9ca3af";

  useEffect(() => {
    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        
        const isImpersonatingSession = session?.user?.app_metadata?.impersonated === true;
        setIsImpersonating(isImpersonatingSession);

        // 🔥 PRIORITÀ 1: Nome dalla sessione (impersonation)
        const sessionName = session?.user?.user_metadata?.tenant_name;
        if (sessionName) {
          setTenantName(sessionName);
          return;
        }

        // 🔥 PRIORITÀ 2: Ottieni tenantId dal profilo via backend
        if (session?.user?.id) {
          const { profile } = await api.getProfile(session.user.id);
          
          if (profile?.company_id) {
            // 🔥 CERCA IN admin_tenants (NON tenants)
            const { data: tenant, error } = await supabase
              .from("admin_tenants")
              .select("name")
              .eq("company_id", profile.company_id)
              .maybeSingle();

            if (error) {
              console.error('❌ Errore caricamento tenant name:', error);
              setTenantName("Tenant");
            } else if (tenant) {
              setTenantName(tenant.name);
            } else {
              setTenantName("Tenant");
            }
          } else {
            setTenantName("Tenant");
          }
        } else {
          setTenantName("Tenant");
        }
      } catch (err) {
        console.error('❌ Eccezione in TenantHeader:', err);
        setTenantName("Tenant");
      }
    }
    load();
  }, [tenantId]);

  async function handleExit() {
    const ok = await exitImpersonation();
    if (ok) navigate("/super/tenants");
  }

  return (
    <header
      style={{
        height: "64px",
        background: DARK_BG,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky" as const,
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Left side - Tenant info */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            background: LIGHTER_BG,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <span style={{ fontSize: "18px" }}>🏢</span>
        </div>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 600,
              color: TEXT_PRIMARY,
              letterSpacing: "-0.01em",
            }}
          >
            {tenantName}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: TEXT_SECONDARY,
              marginTop: "2px",
            }}
          >
            {isImpersonating ? "Accesso come tenant" : "Dashboard tenant"}
          </p>
        </div>
      </div>

      {/* Right side - Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {isImpersonating && (
          <button
            onClick={handleExit}
            style={{
              background: "transparent",
              border: `1px solid ${BORDER_COLOR}`,
              padding: "8px 16px",
              borderRadius: "8px",
              color: TEXT_PRIMARY,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = LIGHTER_BG;
              e.currentTarget.style.borderColor = BLUE;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = BORDER_COLOR;
            }}
          >
            <span style={{ fontSize: "16px" }}>↩️</span>
            Esci impersonation
          </button>
        )}

        <div
          style={{
            width: "36px",
            height: "36px",
            background: LIGHTER_BG,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${BORDER_COLOR}`,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = BLUE;
            e.currentTarget.style.borderColor = BLUE;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = LIGHTER_BG;
            e.currentTarget.style.borderColor = BORDER_COLOR;
          }}
        >
          <span style={{ fontSize: "18px", color: TEXT_SECONDARY }}>👤</span>
        </div>
      </div>
    </header>
  );
}
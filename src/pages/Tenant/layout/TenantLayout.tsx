import { Outlet, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import TenantSidebar from "./TenantSidebar";
import TenantHeader from "./TenantHeader";

export default function TenantLayout() {
  const { tenantId: urlTenantId } = useParams();
  const [realTenantId, setRealTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveTenantId() {
      try {
        console.log("🏢 [TenantLayout] URL tenantId:", urlTenantId);

        if (!urlTenantId) {
          setLoading(false);
          return;
        }

        // 🔥 1. Verifica se l'ID dalla URL è un tenant valido
        const { data: tenant, error: tenantError } = await supabase
          .from("admin_tenants")
          .select("id, name")
          .eq("id", urlTenantId)
          .maybeSingle();

        if (tenant) {
          console.log("✅ [TenantLayout] ID valido come tenant:", tenant.name);
          setRealTenantId(urlTenantId);
          setLoading(false);
          return;
        }

        // 🔥 2. Se non è un tenant, cerca il tenant tramite company_id
        const { data: companyTenant, error: companyError } = await supabase
          .from("admin_tenants")
          .select("id, name")
          .eq("company_id", urlTenantId)
          .maybeSingle();

        if (companyTenant) {
          console.log("✅ [TenantLayout] Trovato tenant tramite company_id:", companyTenant.name);
          setRealTenantId(companyTenant.id);
          setLoading(false);
          return;
        }

        // 🔥 3. Se ancora non trovato, prova a cercare tramite il profilo dell'utente
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("admin_profiles")
            .select("company_id")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

          if (profile?.company_id) {
            const { data: userTenant } = await supabase
              .from("admin_tenants")
              .select("id")
              .eq("company_id", profile.company_id)
              .maybeSingle();

            if (userTenant) {
              console.log("✅ [TenantLayout] Trovato tenant tramite profilo utente:", userTenant.id);
              setRealTenantId(userTenant.id);
              setLoading(false);
              return;
            }
          }
        }

        console.error("❌ [TenantLayout] Nessun tenant trovato per ID:", urlTenantId);
        setRealTenantId(null);
      } catch (err) {
        console.error("❌ [TenantLayout] Errore:", err);
        setRealTenantId(null);
      } finally {
        setLoading(false);
      }
    }

    resolveTenantId();
  }, [urlTenantId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0f12" }}>
        <div style={{ textAlign: "center" }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p style={{ color: "#9ca3af", marginTop: "16px" }}>Caricamento tenant...</p>
        </div>
      </div>
    );
  }

  if (!realTenantId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0f12" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontSize: "18px", marginBottom: "16px" }}>❌ Tenant non trovato</p>
          <button
            onClick={() => window.location.href = '/admin/login'}
            style={{
              padding: "10px 20px",
              background: "#3B82F6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  console.log("🏢 [TenantLayout] tenantId finale:", realTenantId);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0d0f12" }}>
      
      {/* Sidebar */}
      <TenantSidebar />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* 🔥 Passa il tenantId corretto al Header */}
        <TenantHeader tenantId={realTenantId} />

        {/* Page content */}
        <div style={{ padding: "30px", overflowY: "auto" }}>
          <Outlet context={{ tenantId: realTenantId }} />
        </div>

      </div>
    </div>
  );
}
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";

export default function RequireTenantSession({ children }: { children: JSX.Element }) {
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Recupera la sessione
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        
        console.log('🛡️ [RequireTenantSession] Utente:', user?.id, user?.email);

        if (!user) {
          console.log('🛡️ [RequireTenantSession] Nessun utente loggato');
          setRole(null);
          setLoading(false);
          return;
        }

        // Recupera il profilo dalla tabella profiles
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', user.id)
          .single();

        if (error) {
          console.log('🛡️ [RequireTenantSession] Errore recupero profilo:', error);
          setRole(null);
        } else {
          console.log('🛡️ [RequireTenantSession] Profilo recuperato:', profileData);
          setRole(profileData?.role || null);
          setProfile(profileData);
        }
      } catch (err) {
        console.error('🛡️ [RequireTenantSession] Errore:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ⏳ Evita flash di redirect
  if (loading) return null;

  // Se non c'è ruolo, manda al login
  if (!role) {
    console.log('🛡️ [RequireTenantSession] Nessun ruolo, redirect a /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  // ✅ FIX DEFINITIVO: permetti anche super_admin
  if (!["super_admin", "tenant_admin", "operator"].includes(role)) {
    console.log(`🛡️ [RequireTenantSession] Ruolo non autorizzato: ${role}, redirect a /super/tenants`);
    return <Navigate to="/super/tenants" replace />;
  }

  // ✔️ Accesso consentito
  console.log('🛡️ [RequireTenantSession] Accesso consentito per', role);
  return children;
}

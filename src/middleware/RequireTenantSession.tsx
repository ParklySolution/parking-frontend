// frontend/src/middleware/RequireTenantSession.tsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { api } from "@/services/api.service";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface UserProfile {
  role: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
}

export default function RequireTenantSession({ children }: { children: JSX.Element }) {
  const [role, setRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        
        // 1. Recupera la sessione corrente
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        
        console.log('🛡️ [RequireTenantSession] Utente:', user?.id, user?.email);

        if (sessionError || !user) {
          console.log('🛡️ [RequireTenantSession] Nessuna sessione valida');
          setRole(null);
          setLoading(false);
          return;
        }

        // 2. 🔥 CHIAMA IL BACKEND usando api.service
        const { profile } = await api.getProfile(user.id);
        console.log('🛡️ [RequireTenantSession] Profilo dal backend:', profile);

        // 3. Determina il ruolo (priorità: admin_profiles > user_metadata)
        const userRole = profile?.role || user.user_metadata?.role;
        const userTenantId = profile?.company_id || user.user_metadata?.tenant_id;

        setRole(userRole);
        setTenantId(userTenantId);

      } catch (err) {
        console.error('🛡️ [RequireTenantSession] Errore:', err);
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ⏳ Caricamento
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifica sessione in corso...</p>
        </div>
      </div>
    );
  }

  // ❌ Errore
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-lg">
          <h2 className="text-red-800 font-semibold mb-2">Errore di autenticazione</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Vai al login
          </button>
        </div>
      </div>
    );
  }

  // 🔒 Nessun ruolo → redirect al login
  if (!role) {
    console.log('🛡️ [RequireTenantSession] Nessun ruolo valido, redirect a /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  // ✅ Ruoli consentiti per tenant panel
  const allowedRoles = ["super_admin", "tenant_admin", "operator"];
  
  if (!allowedRoles.includes(role)) {
    console.log(`🛡️ [RequireTenantSession] Ruolo non autorizzato: ${role}`);
    
    // Redirect specifici per ruolo
    if (role === "admin" || role === "manager") {
      return <Navigate to={`/admin/${tenantId}`} replace />;
    }
    
    return <Navigate to="/super/tenants" replace />;
  }

  // Per tenant_admin e operator, assicuriamoci che tenantId esista
  if ((role === "tenant_admin" || role === "operator") && !tenantId) {
    console.log('🛡️ [RequireTenantSession] Tenant ID mancante per ruolo:', role);
    return <Navigate to="/admin/login" replace />;
  }

  // ✔️ Accesso consentito
  console.log('🛡️ [RequireTenantSession] Accesso consentito per', role);
  
  return <>{children}</>;
}

// Hook per accedere al tenantId nei componenti figli
export function useTenantSession() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { profile } = await api.getProfile(session.user.id);
        setTenantId(profile?.company_id || null);
        setRole(profile?.role || null);
      } catch (err) {
        console.error('useTenantSession error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { tenantId, role, loading };
}
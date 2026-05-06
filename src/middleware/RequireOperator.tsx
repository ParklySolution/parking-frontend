// src/middleware/RequireOperator.tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/services/supabase";

export default function RequireOperator() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Prendi il ruolo dai metadata
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      setRole(userRole);
      setLoading(false);
    };

    checkRole();
  }, []);

  if (loading) {
    return <div>Verifica permessi...</div>;
  }

  // Solo operatori possono accedere
  if (role === "operator") {
    return <Outlet />;
  }

  // Tenant admin va al suo dashboard
  if (role === "tenant_admin") {
    return <Navigate to={`/tenant/${localStorage.getItem('tenant_id')}/dashboard`} replace />;
  }

  // Super admin va al suo dashboard
  if (role === "super_admin") {
    return <Navigate to="/super/dashboard" replace />;
  }

  // Nessun ruolo valido → login
  return <Navigate to="/admin/login" replace />;
}
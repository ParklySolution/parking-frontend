import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function ImpersonateCallback() {
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get("tenant_id");

  useEffect(() => {
    if (tenantId) {
      // Reindirizza direttamente al dashboard del tenant
      window.location.href = `/tenant/${tenantId}/dashboard`;
    }
  }, [tenantId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Accesso come tenant in corso...</p>
      </div>
    </div>
  );
}
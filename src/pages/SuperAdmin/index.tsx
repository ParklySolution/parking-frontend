import { useEffect, useState } from "react";
import { getTenants } from "@/services/superAdminService";
import type { TenantOverview } from "@/types/superadmin";

export default function SuperAdminHome() {
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTenants();
        setTenants(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const total = tenants.length;
  const active = tenants.filter(t => t.is_active).length;

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Super Admin Dashboard</h1>

      {loading ? (
        <p className="sa-loading">Caricamento...</p>
      ) : (
        <div className="sa-cards">
          <div className="sa-card">
            <h2>{total}</h2>
            <p>Tenants totali</p>
          </div>

          <div className="sa-card">
            <h2>{active}</h2>
            <p>Tenants attivi</p>
          </div>

          <div className="sa-card">
            <h2>—</h2>
            <p>Feature Flags</p>
          </div>
        </div>
      )}
    </div>
  );
}


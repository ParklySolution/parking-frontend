import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import WashServicesAdminForTenant from "./WashServicesAdminForTenant";

export default function WashServicesAdmin() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchTenants() {
    const { data, error } = await supabase.from("tenants").select("id, name");

    if (!error) setTenants(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  if (loading) {
    return <div style={{ color: "#fff", padding: 24 }}>Caricamento tenant...</div>;
  }

  return (
    <div style={{ padding: 32, color: "#fff" }}>
      <h1 style={{ marginBottom: 20 }}>🧼 Gestione Lavaggi (Admin)</h1>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Seleziona Tenant</label>
        <select
          style={{ padding: 10, borderRadius: 6 }}
          value={selectedTenant || ""}
          onChange={(e) => setSelectedTenant(e.target.value)}
        >
          <option value="">-- Seleziona --</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTenant && (
        <WashServicesAdminForTenant tenantId={selectedTenant} />
      )}
    </div>
  );
}

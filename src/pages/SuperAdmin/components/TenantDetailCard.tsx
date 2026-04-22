import React from "react";
import type { TenantDetail } from "@/types/superadmin";

interface Props {
  tenant: TenantDetail;
}

export const TenantDetailCard: React.FC<Props> = ({ tenant }) => {
  return (
    <div className="card tenant-detail-card">
      <h2>{tenant.tenant_name}</h2>

      <p>
        <strong>Company:</strong> {tenant.company_name}
      </p>

      <p>
        <strong>Piano attivo:</strong> {tenant.plan_name ?? "Nessun piano"}
      </p>

      <p>
        <strong>Creato il:</strong>{" "}
        {tenant.created_at
          ? new Date(tenant.created_at).toLocaleDateString()
          : "—"}
      </p>

      <p>
        <strong>Moduli attivi:</strong>{" "}
        {tenant.feature_flags
          ? Object.entries(tenant.feature_flags)
              .filter(([_, v]) => v)
              .map(([k]) => k)
              .join(", ") || "Nessuno"
          : "Nessuno"}
      </p>
    </div>
  );
};

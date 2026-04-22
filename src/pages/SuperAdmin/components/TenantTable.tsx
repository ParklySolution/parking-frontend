import React from "react";
import type { TenantOverview, PlanOverview } from "@/types/superadmin";
import { useNavigate } from "react-router-dom";
import "./TenantTable.css";

interface Props {
  tenants: TenantOverview[];
  plans: PlanOverview[];
}

export default function TenantTable({ tenants }: Props) {
  const navigate = useNavigate();

  const StatusBadge = ({ active }: { active: boolean }) => {
    const cls = active ? "badge-green" : "badge-red";
    return (
      <span className={`badge ${cls}`}>
        {active ? "Attivo" : "Disattivo"}
      </span>
    );
  };

  return (
    <div className="tenant-table-container">
      <table className="tenant-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Tenant</th>
            <th>Piano</th>
            <th>Stato</th>
            <th>Creato il</th>
            <th className="text-right">Azioni</th>
          </tr>
        </thead>

        <tbody>
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center">
                Nessun tenant trovato.
              </td>
            </tr>
          ) : (
            tenants.map((t) => (
              <tr key={t.tenant_id}>
                <td>{t.company_name}</td>
                <td>{t.tenant_name}</td>
                <td>{t.plan_name ?? "—"}</td>
                <td>
                  <StatusBadge active={t.is_active} />
                </td>
                <td>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="text-right">
                  <button
                    className="sa-btn sa-btn-secondary"
                    onClick={() => navigate(`/super/tenants/${t.tenant_id}`)}
                  >
                    Apri →
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

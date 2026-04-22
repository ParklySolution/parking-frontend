import { useNavigate } from "react-router-dom";

export default function RecentTenants({ tenants }: { tenants: any[] }) {
  const navigate = useNavigate();

  return (
    <div className="section-card">
      <h3>Ultimi Tenant Creati</h3>

      {tenants.length === 0 ? (
        <p>Nessun tenant recente.</p>
      ) : (
        <table className="sa-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Piano</th>
              <th>Creato il</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.plan_name || "—"}</td>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="sa-btn sa-btn-small"
                    onClick={() => navigate(`/super/tenants/${t.id}`)}
                  >
                    Apri →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

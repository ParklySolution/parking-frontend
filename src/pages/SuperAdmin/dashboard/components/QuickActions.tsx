import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="section-card">
      <h3>Azioni Rapide</h3>

      <div className="quick-actions">
        <button
          className="sa-btn sa-btn-primary"
          onClick={() => navigate("/super/tenants/create")}
        >
          + Crea Tenant
        </button>

        <button
          className="sa-btn"
          onClick={() => navigate("/super/tenants")}
        >
          Vai alla lista tenant →
        </button>

        <button
          className="sa-btn"
          onClick={() => navigate("/super/plans")}
        >
          Gestisci Piani →
        </button>

        <button
          className="sa-btn"
          onClick={() => navigate("/super/logs")}
        >
          Eventi Recenti →
        </button>
      </div>
    </div>
  );
}

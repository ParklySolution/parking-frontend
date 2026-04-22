// src/pages/SuperAdmin/PlansList.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlans } from "@/services/superAdminService";
import type { PlanOverview } from "@/types/superadmin";
import { logAudit } from "@/services/auditLog";
import "@/styles/superadmin.css";

export default function PlansList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // ⭐ AUDIT LOG: apertura pagina
        await logAudit({
          action: "view_plans_list",
          entity: "plan",
          entity_id: "overview",   // ← FIX
          details: {},
        });

        const data = await getPlans();
        setPlans(data);
      } catch (err) {
        console.error("Errore caricamento piani:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handleCreatePlan = async () => {
    // ⭐ AUDIT LOG: intento creazione piano
    await logAudit({
      action: "intent_create_plan",
      entity: "plan",
      entity_id: "new",   // ← FIX
      details: {},
    });

    navigate("/super/plans/create");
  };

  if (loading) return <p className="sa-loading">Caricamento piani...</p>;

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Piani disponibili</h1>

      <div style={{ marginBottom: "20px" }}>
        <button className="sa-btn sa-btn-primary" onClick={handleCreatePlan}>
          + Crea nuovo piano
        </button>
      </div>

      <div className="sa-cards">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="sa-card"
            onClick={() => navigate(`/super/plans/${plan.id}`)}
            style={{ cursor: "pointer" }}
          >
            <h2>{plan.name}</h2>
            <p>{plan.description || "Nessuna descrizione"}</p>
            <p>Prezzo: {plan.price} € / mese</p>
          </div>
        ))}
      </div>
    </div>
  );
}

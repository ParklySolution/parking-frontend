// src/pages/SuperAdmin/PlansManagementPage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlans, deletePlan, duplicatePlan } from "@/services/superAdminService";
import type { PlanOverview } from "@/types/superadmin";
import { logAudit } from "@/services/auditLog";
import "@/styles/superadmin.css";

export default function PlansManagementPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ============================================================
     LOAD PLANS
  ============================================================ */
  useEffect(() => {
    async function load() {
      try {
        // ⭐ AUDIT LOG: apertura pagina
        await logAudit({
          action: "view_plans_management",
          entity: "plan",
          entity_id: null,
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

  /* ============================================================
     DELETE PLAN
  ============================================================ */
  async function handleDelete() {
    if (!deleteId) return;

    try {
      await deletePlan(deleteId);

      // ⭐ AUDIT LOG
      await logAudit({
        action: "delete_plan",
        entity: "plan",
        entity_id: deleteId,
        details: {},
      });

      setPlans((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      console.error("Errore eliminazione piano:", err);

      if (err.message?.includes("Impossibile eliminare il piano")) {
        alert(err.message);
      } else {
        alert("Errore durante l'eliminazione del piano");
      }

      setDeleteId(null);
    }
  }

  /* ============================================================
     DUPLICATE PLAN
  ============================================================ */
  async function handleDuplicate(planId: string) {
    try {
      await duplicatePlan(planId);

      // ⭐ AUDIT LOG
      await logAudit({
        action: "duplicate_plan",
        entity: "plan",
        entity_id: planId,
        details: {},
      });

      const updated = await getPlans();
      setPlans(updated);
    } catch (err) {
      console.error("Errore duplicazione piano:", err);
      alert("Errore durante la duplicazione del piano");
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <p className="sa-loading">Caricamento piani...</p>;

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Gestione Piani</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          className="sa-btn sa-btn-primary"
          onClick={async () => {
            await logAudit({
              action: "intent_create_plan",
              entity: "plan",
              entity_id: null,
              details: {},
            });
            navigate("/super/plans/create");
          }}
        >
          + Crea nuovo piano
        </button>
      </div>

      <table className="sa-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Prezzo</th>
            <th>Moduli</th>
            <th>Limiti</th>
            <th>Tenant attivi</th>
            <th>Azioni</th>
          </tr>
        </thead>

        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>
              <td>{plan.name}</td>
              <td>{plan.price} €</td>

              {/* MODULI */}
              <td>
                <div className="sa-tooltip">
                  {plan.features?.wash_module && (
                    <span className="sa-badge">Wash</span>
                  )}
                  {plan.features?.analytics && (
                    <span className="sa-badge">Analytics</span>
                  )}
                  {plan.features?.multi_location && (
                    <span className="sa-badge">Multi-sede</span>
                  )}
                  {plan.features?.fidelity_program && (
                    <span className="sa-badge">Fidelity</span>
                  )}

                  <div className="sa-tooltip-text">
                    <strong>Moduli attivi:</strong><br />
                    Lavaggi: {plan.features?.wash_module ? "Sì" : "No"}<br />
                    Analytics: {plan.features?.analytics ? "Sì" : "No"}<br />
                    Multi-sede: {plan.features?.multi_location ? "Sì" : "No"}<br />
                    Fidelity: {plan.features?.fidelity_program ? "Sì" : "No"}
                  </div>
                </div>
              </td>

              {/* LIMITI */}
              <td>
                <div className="sa-tooltip">
                  <span className="sa-badge">
                    Utenti: {plan.limits?.max_users ?? "—"}
                  </span>

                  <span className="sa-badge">
                    Sessioni/mese: {plan.limits?.max_parking_sessions_per_month ?? "—"}
                  </span>

                  <div className="sa-tooltip-text">
                    <strong>Limiti del piano:</strong><br />
                    Utenti massimi: {plan.limits?.max_users ?? "—"}<br />
                    Sessioni/mese: {plan.limits?.max_parking_sessions_per_month ?? "—"}<br />
                    Clienti massimi: {plan.limits?.max_customers ?? "—"}<br />
                    Lavaggi: {plan.limits?.max_wash_services ?? "—"}
                  </div>
                </div>
              </td>

              {/* TENANT ATTIVI */}
              <td>
                <div className="sa-tooltip">
                  <span className="sa-badge">
                    {plan.tenant_count}
                  </span>

                  <div className="sa-tooltip-text">
                    <strong>Tenant che usano questo piano:</strong><br />
                    {plan.tenant_count === 0
                      ? "Nessun tenant usa questo piano"
                      : `${plan.tenant_count} tenant attivi`}
                  </div>
                </div>
              </td>

              {/* AZIONI */}
              <td>
                <button
                  className="sa-btn sa-btn-small"
                  onClick={async () => {
                    await logAudit({
                      action: "intent_edit_plan",
                      entity: "plan",
                      entity_id: plan.id,
                      details: {},
                    });
                    navigate(`/super/plans/${plan.id}/edit`);
                  }}
                >
                  Modifica
                </button>

                <button
                  className="sa-btn sa-btn-small"
                  onClick={() => handleDuplicate(plan.id)}
                >
                  Duplica
                </button>

                <button
                  className="sa-btn sa-btn-danger sa-btn-small"
                  disabled={plan.tenant_count > 0}
                  onClick={() => setDeleteId(plan.id)}
                >
                  Elimina
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODALE ELIMINAZIONE */}
      {deleteId && (
        <div className="sa-modal">
          <div className="sa-modal-content">
            <h3>Confermi l'eliminazione?</h3>
            <p>Questa azione non può essere annullata.</p>

            <div className="sa-modal-actions">
              <button
                className="sa-btn sa-btn-danger"
                onClick={handleDelete}
              >
                Elimina
              </button>

              <button
                className="sa-btn"
                onClick={() => setDeleteId(null)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

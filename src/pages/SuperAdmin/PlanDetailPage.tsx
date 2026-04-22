// src/pages/SuperAdmin/PlanDetailPage.tsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlanById, deletePlan, duplicatePlan } from "@/services/superAdminService";
import type { PlanDetail } from "@/types/superadmin";
import { logAudit } from "@/services/auditLog";
import "@/styles/superadmin.css";
import "./PlanDetail.css";

export default function PlanDetailPage() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  /* ============================================================
     LOAD PLAN DATA
  ============================================================ */
  useEffect(() => {
    async function load() {
      if (!planId) return;

      try {
        // ⭐ AUDIT LOG: apertura pagina
        await logAudit({
          action: "view_plan_detail",
          entity: "plan",
          entity_id: planId,
          details: {},
        });

        const data = await getPlanById(planId);
        setPlan(data);
      } catch (err) {
        console.error("Errore caricamento piano:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [planId]);

  /* ============================================================
     DELETE PLAN
  ============================================================ */
  async function handleDelete() {
    if (!planId || !plan) return;

    if (!window.confirm("Sei sicuro di voler eliminare questo piano?")) return;

    setDeleting(true);

    try {
      await deletePlan(planId);

      // ⭐ AUDIT LOG
      await logAudit({
        action: "delete_plan",
        entity: "plan",
        entity_id: planId,
        details: {
          name: plan.name,
          price: plan.price,
        },
      });

      navigate("/super/plans/manage");
    } catch (err: any) {
      console.error("Errore eliminazione piano:", err);

      if (err.message?.includes("Impossibile eliminare il piano")) {
        alert(err.message);
      } else {
        alert("Errore durante l'eliminazione del piano");
      }
    }

    setDeleting(false);
  }

  /* ============================================================
     DUPLICATE PLAN
  ============================================================ */
  async function handleDuplicate() {
    if (!planId || !plan) return;

    try {
      await duplicatePlan(planId);

      // ⭐ AUDIT LOG
      await logAudit({
        action: "duplicate_plan",
        entity: "plan",
        entity_id: planId,
        details: {
          name: plan.name,
        },
      });

      alert("Piano duplicato con successo");
      navigate("/super/plans/manage");
    } catch (err) {
      console.error("Errore duplicazione piano:", err);
      alert("Errore durante la duplicazione del piano");
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <p className="sa-loading">Caricamento...</p>;
  if (!plan) return <p className="sa-error">Piano non trovato.</p>;

  return (
    <div className="sa-dashboard">
      {/* HEADER */}
      <div className="sa-header-row">
        <h1 className="sa-title">{plan.name}</h1>

        <div className="sa-header-actions">
          <button
            className="sa-btn sa-btn-small"
            onClick={async () => {
              await logAudit({
                action: "intent_edit_plan",
                entity: "plan",
                entity_id: planId,
                details: {},
              });
              navigate(`/super/plans/${plan.id}/edit`);
            }}
          >
            Modifica
          </button>

          <button className="sa-btn sa-btn-small" onClick={handleDuplicate}>
            Duplica
          </button>

          <button
            className="sa-btn sa-btn-danger sa-btn-small"
            disabled={plan.tenant_count > 0 || deleting}
            onClick={handleDelete}
          >
            Elimina
          </button>
        </div>
      </div>

      {/* ⭐ GRIGLIA PREMIUM */}
      <div className="plan-grid">

        {/* DESCRIZIONE */}
        <div className="plan-card">
          <h2>Descrizione</h2>
          <p>{plan.description || "—"}</p>

          <h2>Prezzo</h2>
          <p className="plan-price">{plan.price} € / mese</p>
        </div>

        {/* ⭐ MODULI DEL PIANO */}
        <div className="plan-card">
          <h2>Moduli del piano</h2>

          <div className="feature-grid">
            {Object.entries(plan.features || {}).map(([key, value]) => (
              <div key={key} className="feature-row">
                <span className="feature-name">{key}</span>
                <span className={value ? "badge-active" : "badge-inactive"}>
                  {value ? "Attivo" : "Non attivo"}
                </span>
              </div>
            ))}
          </div>

          <pre className="sa-json">{JSON.stringify(plan.features, null, 2)}</pre>
        </div>

        {/* LIMITI */}
        <div className="plan-card">
          <h2>Limiti del piano</h2>

          <div className="feature-grid">
            <div className="feature-row">
              <span className="feature-name">Utenti</span>
              <span className="badge-active">{plan.limits?.max_users ?? "—"}</span>
            </div>

            <div className="feature-row">
              <span className="feature-name">Sessioni/mese</span>
              <span className="badge-active">{plan.limits?.max_parking_sessions_per_month ?? "—"}</span>
            </div>

            <div className="feature-row">
              <span className="feature-name">Clienti</span>
              <span className="badge-active">{plan.limits?.max_customers ?? "—"}</span>
            </div>

            <div className="feature-row">
              <span className="feature-name">Lavaggi</span>
              <span className="badge-active">{plan.limits?.max_wash_services ?? "—"}</span>
            </div>
          </div>

          <pre className="sa-json">{JSON.stringify(plan.limits, null, 2)}</pre>
        </div>

        {/* TENANT ATTIVI */}
        <div className="plan-card">
          <h2>Tenant che usano questo piano</h2>

          {plan.tenant_count === 0 ? (
            <p>Nessun tenant usa questo piano.</p>
          ) : (
            <>
              <p>
                <strong>{plan.tenant_count}</strong> tenant attivi
              </p>

              <ul className="sa-list">
                {plan.tenants?.map((t) => (
                  <li key={t.id}>
                    <a href={`/super/tenants/${t.id}`} className="sa-link">
                      {t.name} — {t.city}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

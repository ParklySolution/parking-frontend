// src/pages/SuperAdmin/PlanEditPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlanById, updatePlan } from "@/services/superAdminService";
import type { PlanDetail } from "@/types/superadmin";
import { logAudit } from "@/services/auditLog";
import "@/styles/superadmin.css";

export default function PlanEditPage() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [limits, setLimits] = useState("{}");
  const [features, setFeatures] = useState("{}");

  /* ============================================================
     LOAD PLAN DATA
  ============================================================ */
  useEffect(() => {
    async function load() {
      if (!planId) return;

      try {
        // ⭐ AUDIT LOG: apertura pagina
        await logAudit({
          action: "view_plan_edit",
          entity: "plan",
          entity_id: planId,
          details: {},
        });

        const data = await getPlanById(planId);

        if (data) {
          setPlan(data);
          setName(data.name);
          setDescription(data.description || "");
          setPrice(String(data.price));
          setLimits(JSON.stringify(data.limits, null, 2));
          setFeatures(JSON.stringify(data.features, null, 2));
        }
      } catch (err) {
        console.error("Errore caricamento piano:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [planId]);

  /* ============================================================
     SAVE CHANGES
  ============================================================ */
  async function handleSave() {
    if (!planId) return;

    let parsedLimits = null;
    let parsedFeatures = null;

    try {
      parsedLimits = JSON.parse(limits);
    } catch {
      alert("Errore: il campo 'Limiti' non contiene un JSON valido.");
      return;
    }

    try {
      parsedFeatures = JSON.parse(features);
    } catch {
      alert("Errore: il campo 'Feature incluse' non contiene un JSON valido.");
      return;
    }

    try {
      await updatePlan(
        planId,
        name,
        description,
        Number(price),
        parsedLimits,
        parsedFeatures
      );

      // ⭐ AUDIT LOG
      await logAudit({
        action: "update_plan",
        entity: "plan",
        entity_id: planId,
        details: {
          name,
          description,
          price,
          limits: parsedLimits,
          features: parsedFeatures,
        },
      });

      alert("Piano aggiornato con successo");
      navigate(`/super/plans/${planId}`);
    } catch (err) {
      console.error("Errore aggiornamento piano:", err);
      alert("Errore durante il salvataggio");
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <p className="sa-loading">Caricamento...</p>;
  if (!plan) return <p className="sa-error">Piano non trovato.</p>;

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Modifica piano</h1>

      <div className="sa-card" style={{ maxWidth: "600px" }}>
        <label>Nome</label>
        <input
          className="sa-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Descrizione</label>
        <textarea
          className="sa-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label>Prezzo (€/mese)</label>
        <input
          className="sa-input"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <label>Limiti (JSON)</label>
        <textarea
          className="sa-input"
          value={limits}
          onChange={(e) => setLimits(e.target.value)}
        />

        <label>Feature incluse (JSON)</label>
        <textarea
          className="sa-input"
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
        />

        <button className="sa-btn sa-btn-primary" onClick={handleSave}>
          Salva modifiche
        </button>
      </div>
    </div>
  );
}

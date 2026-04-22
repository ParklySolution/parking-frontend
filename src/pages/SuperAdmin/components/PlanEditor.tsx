// src/pages/SuperAdmin/components/PlanEditor.tsx

import React, { useEffect, useState } from "react";
import { getPlans, updateTenantPlan_new } from "@/services/superAdminService";

interface Props {
  tenantId: string;
  currentPlanId: string | null;
  onSaved: () => void;
}

export const PlanEditor: React.FC<Props> = ({ tenantId, currentPlanId, onSaved }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlanId ?? "");
  const [saving, setSaving] = useState(false);

  /* ============================================================
     LOAD PLANS
  ============================================================ */
  useEffect(() => {
    async function load() {
      const data = await getPlans();
      setPlans(data);
    }
    load();
  }, []);

  /* ============================================================
     SAVE PLAN
  ============================================================ */
  async function handleSave() {
    if (!selectedPlan) {
      alert("Seleziona un piano");
      return;
    }

    setSaving(true);

    try {
      await updateTenantPlan_new(tenantId, selectedPlan);
      onSaved();
    } catch (err) {
      console.error("Errore aggiornamento piano:", err);
      alert("Errore durante l'aggiornamento del piano");
    }

    setSaving(false);
  }

  return (
    <div className="card tenant-detail-card">
      <h3>Cambia Piano</h3>

      <select
        value={selectedPlan}
        onChange={(e) => setSelectedPlan(e.target.value)}
        className="sa-input"
      >
        <option value="">Seleziona un piano</option>

        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.price}€/mese
          </option>
        ))}
      </select>

      <button
        type="button"
        className="sa-btn sa-btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: "12px" }}
      >
        {saving ? "Salvataggio…" : "Aggiorna Piano"}
      </button>
    </div>
  );
};

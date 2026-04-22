import { useState } from "react";
import { createTenantForCompany } from "@/services/superAdminService";
import { useNavigate } from "react-router-dom";

export default function CreateTenantFromCompany({ company, plans = [], onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    plan_id: "",
  });

  async function handleCreateTenant(e?: any) {
    // 🔥 Protezione contro doppi click e doppi render
    if (loading) return;

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!form.name.trim()) {
      alert("Il nome del tenant è obbligatorio.");
      return;
    }

    if (!form.plan_id) {
      alert("Seleziona un piano.");
      return;
    }

    try {
      setLoading(true);

      const result = await createTenantForCompany({
        company_id: company.id,
        name: form.name,
        plan_id: form.plan_id,
      });

      const tenantId = result?.[0]?.tenant_id;

      if (!tenantId) {
        console.error("❌ tenant_id non trovato nella risposta RPC:", result);
        alert("Errore interno: tenant_id mancante.");
        return;
      }

      navigate(`/super-admin/tenants/${tenantId}`);
      onClose();
    } catch (err) {
      console.error("❌ Errore creazione tenant:", err);
      alert("Errore durante la creazione del tenant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sa-drawer">
      <div className="sa-drawer-content">
        <h2 style={{ marginBottom: "20px" }}>
          Crea Tenant per {company?.name}
        </h2>

        <label className="sa-label">Nome Tenant</label>
        <input
          className="sa-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <label className="sa-label">Piano</label>
        <select
          className="sa-input"
          value={form.plan_id}
          onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
        >
          <option value="">Nessun piano</option>

          {plans.length > 0 &&
            plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>

        <div className="sa-drawer-actions">
          <button
            onClick={(e) => handleCreateTenant(e)}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              background: loading ? "#1e3a8a" : "#2563eb",
              border: "none",
              color: "#ffffff",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "0.2s ease",
            }}
          >
            {loading ? "Creazione…" : "Crea Tenant"}
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              background: "#111418",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer",
              transition: "0.2s ease",
            }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
}

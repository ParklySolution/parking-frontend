import { useState } from "react";
import { createCompanyProfile_new } from "@/services/superAdminService";

export default function CreateCompanyDrawer({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    type: "company", // "company" | "individual"
    name: "",
    vat_number: "",
    first_name: "",
    last_name: "",
    fiscal_code: "",
    address_street: "",
    address_city: "",
  });

  function validate() {
    if (form.type === "company") {
      if (!form.name.trim()) return "La ragione sociale è obbligatoria.";
    }

    if (form.type === "individual") {
      if (!form.first_name.trim()) return "Il nome è obbligatorio.";
      if (!form.last_name.trim()) return "Il cognome è obbligatorio.";
    }

    if (!form.address_street.trim()) return "L'indirizzo è obbligatorio.";
    if (!form.address_city.trim()) return "La città è obbligatoria.";

    return null;
  }

  async function handleCreate() {
    const errorMsg = validate();
    if (errorMsg) {
      alert(errorMsg);
      return;
    }

    try {
      setLoading(true);

      const payload =
        form.type === "company"
          ? {
              type: "company",
              name: form.name,
              vat_number: form.vat_number || null,
              address_street: form.address_street || null,
              address_city: form.address_city || null,
            }
          : {
              type: "individual",
              name: `${form.first_name} ${form.last_name}`,
              first_name: form.first_name,
              last_name: form.last_name,
              fiscal_code: form.fiscal_code || null,
              address_street: form.address_street || null,
              address_city: form.address_city || null,
            };

      await createCompanyProfile_new(payload);

      onCreated();
      onClose();
    } catch (err) {
      console.error("Errore creazione company:", err);
      alert("Errore durante la creazione della company.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="sa-drawer">
      <div className="sa-drawer-content">
        <h2 style={{ marginBottom: "20px" }}>Crea Company</h2>

        {/* TIPO */}
        <label className="sa-label">Tipo intestatario</label>
        <select
          className="sa-input"
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value === "company" ? "company" : "individual" })
          }
        >
          <option value="company">Azienda</option>
          <option value="individual">Persona fisica</option>
        </select>

        {/* FORM AZIENDA */}
        {form.type === "company" && (
          <>
            <label className="sa-label">Ragione sociale</label>
            <input
              className="sa-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <label className="sa-label">Partita IVA</label>
            <input
              className="sa-input"
              value={form.vat_number}
              onChange={(e) =>
                setForm({ ...form, vat_number: e.target.value })
              }
            />
          </>
        )}

        {/* FORM PERSONA FISICA */}
        {form.type === "individual" && (
          <>
            <label className="sa-label">Nome</label>
            <input
              className="sa-input"
              value={form.first_name}
              onChange={(e) =>
                setForm({ ...form, first_name: e.target.value })
              }
            />

            <label className="sa-label">Cognome</label>
            <input
              className="sa-input"
              value={form.last_name}
              onChange={(e) =>
                setForm({ ...form, last_name: e.target.value })
              }
            />

            <label className="sa-label">Codice fiscale</label>
            <input
              className="sa-input"
              value={form.fiscal_code}
              onChange={(e) =>
                setForm({ ...form, fiscal_code: e.target.value })
              }
            />
          </>
        )}

        {/* CAMPI COMUNI */}
        <label className="sa-label">Indirizzo</label>
        <input
          className="sa-input"
          value={form.address_street}
          onChange={(e) => setForm({ ...form, address_street: e.target.value })}
        />

        <label className="sa-label">Città</label>
        <input
          className="sa-input"
          value={form.address_city}
          onChange={(e) => setForm({ ...form, address_city: e.target.value })}
        />

        {/* ACTIONS */}
        <div className="sa-drawer-actions">
          <button
            onClick={handleCreate}
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
            {loading ? "Creazione…" : "Crea Company"}
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

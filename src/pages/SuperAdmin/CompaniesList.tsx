// src/pages/SuperAdmin/CompaniesList.tsx

import { useEffect, useState } from "react";
import { getCompanies } from "@/services/superAdminService";
import CreateCompanyDrawer from "@/components/super-admin/CreateCompanyDrawer";
import { Link } from "react-router-dom";

export default function CompaniesList() {
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Errore caricamento companies:", err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="sa-page">
      {/* HEADER */}
      <div className="sa-header">
        <h1>Companies</h1>
        <button
          style={{
            padding: "8px 16px",
            borderRadius: "10px",
            background: "#2563eb",
            border: "none",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => setOpen(true)}
        >
          + Crea Company
        </button>
      </div>

      {/* TABLE WRAPPER */}
      <div className="sa-table-wrapper">
        <table className="sa-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>P.IVA / CF</th>
              <th>Città</th>
              <th>Indirizzo</th>
              <th>Creato il</th>
              <th>Dettagli</th>
            </tr>
          </thead>

          <tbody>
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "20px", textAlign: "center" }}>
                  Nessuna company presente.
                </td>
              </tr>
            )}

            {companies.map((c) => (
              <tr key={c.id}>
                {/* Nome */}
                <td>{c.name}</td>

                {/* P.IVA o Codice Fiscale */}
                <td>
                  {c.type === "company"
                    ? c.vat_number || "-"
                    : c.fiscal_code || "-"}
                </td>

                {/* Città */}
                <td>{c.address_city || "-"}</td>

                {/* Indirizzo */}
                <td>{c.address_street || "-"}</td>

                {/* Data creazione */}
                <td>
                  {c.created_at
                    ? new Date(c.created_at).toLocaleDateString()
                    : "-"}
                </td>

                {/* Link dettagli */}
                <td>
                  <Link
  to={`/super/companies/${c.id}`}
  className="sa-link-detail"
>
  Apri →
</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DRAWER */}
      <CreateCompanyDrawer
        open={open}
        onClose={() => setOpen(false)}
        onCreated={load}
      />
    </div>
  );
}

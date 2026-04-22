// src/pages/SuperAdmin/CompanyDetail.tsx

import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import CreateTenantFromCompany from "./CreateTenantFromCompany";

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);

  async function loadCompany() {
    try {
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (err) {
      console.error("❌ Errore caricamento company:", err);
    }
  }

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .rpc("get_plans_overview_new");

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error("❌ Errore caricamento piani:", err);
    }
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadCompany(), loadPlans()]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  if (loading) {
    return <p className="sa-loading">Caricamento dettagli...</p>;
  }

  if (!company) {
    return (
      <div className="sa-page">
        <h1>Company non trovata</h1>
        <Link to="/superadmin/companies" className="sa-link-detail">
          ← Torna alla lista
        </Link>
      </div>
    );
  }

  const isCompany = company.type === "company";
  const isPerson = company.type === "individual";

  return (
    <div className="sa-page">
      <div className="sa-header">
        <h1>Dettagli Company</h1>

        <Link to="/superadmin/companies" className="sa-link-detail">
          ← Torna alla lista
        </Link>
      </div>

      <div className="sa-card" style={{ padding: "20px", marginTop: "20px" }}>
        <h2 style={{ marginBottom: "20px" }}>{company.name}</h2>

        <p><strong>Tipo:</strong> {isCompany ? "Azienda" : "Persona fisica"}</p>

        {isCompany && (
          <p><strong>Partita IVA:</strong> {company.vat_number || "-"}</p>
        )}

        {isPerson && (
          <>
            <p><strong>Nome:</strong> {company.first_name}</p>
            <p><strong>Cognome:</strong> {company.last_name}</p>
            <p><strong>Codice Fiscale:</strong> {company.fiscal_code || "-"}</p>
          </>
        )}

        <p><strong>Indirizzo:</strong> {company.address_street || "-"}</p>
        <p><strong>Città:</strong> {company.address_city || "-"}</p>

        <p>
          <strong>Creato il:</strong>{" "}
          {company.created_at
            ? new Date(company.created_at).toLocaleDateString()
            : "-"}
        </p>
      </div>

      {/* SEZIONE AZIONI */}
      <div className="sa-card" style={{ padding: "20px", marginTop: "20px" }}>
        <h3>Azioni</h3>

        <button
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            background: "#2563eb",
            border: "none",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "10px",
          }}
          onClick={() => setDrawerOpen(true)}
        >
          Crea Tenant da questa Company
        </button>

        <button
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            background: "#111418",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "10px",
          }}
          onClick={() => alert("Funzione in arrivo")}
        >
          Visualizza Audit Log
        </button>
      </div>

      {/* DRAWER CREA TENANT */}
      {drawerOpen && (
        <CreateTenantFromCompany
          company={company}
          plans={plans}   // 🔥 PASSIAMO I PIANI QUI
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import CompanyInfoForm from "./CompanyInfoForm";

interface CompanyInfo {
  id: string;
  tenant_id: string;
  company_name: string;
  legal_address: string | null;
  vat_number: string | null;
  tax_code: string | null;
  email: string | null;
  pec: string | null;
  phone: string | null;
  website: string | null;
  registration_number: string | null;
  share_capital: string | null;
  unique_code: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function CompanyInfo() {
  const { tenantId } = useParams();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const BLUE = "#3B82F6";

  useEffect(() => {
    fetchCompanyInfo();
  }, [tenantId]);

  async function fetchCompanyInfo() {
    if (!tenantId) return;
    
    setLoading(true);
    
    const { data } = await supabase
      .from("tenant_company_info")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    setCompanyInfo(data || null);
    setLoading(false);
  }

  async function handleSave(data: Partial<CompanyInfo>) {
    if (!tenantId) return;

    const payload = {
      tenant_id: tenantId,
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (companyInfo?.id) {
      // Update
      await supabase
        .from("tenant_company_info")
        .update(payload)
        .eq("id", companyInfo.id);
    } else {
      // Insert
      await supabase
        .from("tenant_company_info")
        .insert(payload);
    }

    setShowForm(false);
    fetchCompanyInfo();
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento dati aziendali...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px"
      }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: BLUE }}>
          🏢 Dati Aziendali
        </h1>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: BLUE,
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {companyInfo ? "Modifica dati" : "Inserisci dati"}
          </button>
        )}
      </div>

      {!showForm ? (
        companyInfo ? (
          <div style={{
            background: "#1a1f25",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #333"
          }}>
            {/* Logo */}
            {companyInfo.logo_url && (
              <div style={{ marginBottom: "20px", textAlign: "center" }}>
                <img 
                  src={companyInfo.logo_url} 
                  alt="Logo azienda" 
                  style={{ maxHeight: "80px", maxWidth: "200px" }}
                />
              </div>
            )}

            {/* Griglia informazioni */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              <InfoField label="Ragione Sociale" value={companyInfo.company_name} />
              <InfoField label="Indirizzo Sede Legale" value={companyInfo.legal_address} />
              <InfoField label="Partita IVA" value={companyInfo.vat_number} />
              <InfoField label="Codice Fiscale" value={companyInfo.tax_code} />
              <InfoField label="Email" value={companyInfo.email} />
              <InfoField label="PEC" value={companyInfo.pec} />
              <InfoField label="Telefono" value={companyInfo.phone} />
              <InfoField label="Sito Web" value={companyInfo.website} />
              <InfoField label="Numero REA" value={companyInfo.registration_number} />
              <InfoField label="Capitale Sociale" value={companyInfo.share_capital} />
              <InfoField label="Codice Univoco" value={companyInfo.unique_code} />
            </div>
          </div>
        ) : (
          <div style={{
            background: "#1a1f25",
            padding: "40px",
            borderRadius: "12px",
            textAlign: "center",
            color: "#9ca3af"
          }}>
            Nessun dato aziendale configurato. Clicca su "Inserisci dati" per iniziare.
          </div>
        )
      ) : (
        <CompanyInfoForm
          initialData={companyInfo}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
      <div style={{ color: "#fff", fontSize: "14px" }}>{value || "—"}</div>
    </div>
  );
}
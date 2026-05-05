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
  first_name: string | null;
  last_name: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  created_at: string;
  updated_at: string;
}

export default function CompanyInfo() {
  const { tenantId } = useParams();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState("");

  const BLUE = "#3B82F6";

  // Carica i dati aziendali
  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Prima carica il nome del tenant da admin_tenants
        const { data: tenant } = await supabase
          .from("admin_tenants")
          .select("name")
          .eq("id", tenantId)
          .maybeSingle();
        
        if (tenant) {
          setTenantName(tenant.name);
        }
        
        // Poi carica i dati aziendali
        const { data, error } = await supabase
          .from("tenant_company_info")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (error) {
          console.error("Errore fetch:", error);
          setError(error.message);
        } else {
          setCompanyInfo(data || null);
        }
      } catch (err: any) {
        console.error("Errore:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [tenantId]);

  async function handleSave(data: Partial<CompanyInfo>) {
    if (!tenantId) return;
    
    setSaving(true);
    setError(null);

    const payload = {
      tenant_id: tenantId,
      company_name: data.company_name,
      legal_address: data.legal_address || null,
      vat_number: data.vat_number || null,
      tax_code: data.tax_code || null,
      email: data.email || null,
      pec: data.pec || null,
      phone: data.phone || null,
      website: data.website || null,
      registration_number: data.registration_number || null,
      share_capital: data.share_capital || null,
      unique_code: data.unique_code || null,
      logo_url: data.logo_url || null,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      personal_email: data.personal_email || null,
      personal_phone: data.personal_phone || null,
      updated_at: new Date().toISOString(),
    };

    try {
      let result;
      
      if (companyInfo?.id) {
        // Update
        result = await supabase
          .from("tenant_company_info")
          .update(payload)
          .eq("id", companyInfo.id);
      } else {
        // Insert
        result = await supabase
          .from("tenant_company_info")
          .insert(payload);
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log("✅ Salvataggio completato");
      setShowForm(false);
      
      // Ricarica i dati
      const { data: refreshed } = await supabase
        .from("tenant_company_info")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      setCompanyInfo(refreshed || null);
      
    } catch (err: any) {
      console.error("❌ Errore:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        Caricamento dati aziendali...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: BLUE, margin: 0 }}>
            🏢 Dati Aziendali
          </h1>
          <p style={{ color: "#9ca3af", marginTop: "4px" }}>
            Gestisci le informazioni della tua azienda - {tenantName}
          </p>
        </div>
        
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
            {companyInfo ? "✏️ Modifica dati" : "➕ Inserisci dati"}
          </button>
        )}
      </div>

      {error && (
        <div style={{
          background: "#ef4444",
          color: "#fff",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          ❌ {error}
        </div>
      )}

      {!showForm ? (
        companyInfo ? (
          <div style={{
            background: "#1a1f25",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)"
          }}>
            {companyInfo.logo_url && (
              <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <img 
                  src={companyInfo.logo_url} 
                  alt="Logo azienda" 
                  style={{ maxHeight: "80px", maxWidth: "200px", objectFit: "contain" }}
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
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

            {(companyInfo.first_name || companyInfo.last_name || companyInfo.personal_email || companyInfo.personal_phone) && (
              <>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "20px 0 16px 0", paddingTop: "16px" }}>
                  <h3 style={{ color: BLUE, fontSize: "16px", margin: 0 }}>👤 Contatto di riferimento</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  <InfoField label="Nome" value={companyInfo.first_name} />
                  <InfoField label="Cognome" value={companyInfo.last_name} />
                  <InfoField label="Email personale" value={companyInfo.personal_email} />
                  <InfoField label="Telefono personale" value={companyInfo.personal_phone} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{
            background: "#1a1f25",
            padding: "60px 40px",
            borderRadius: "12px",
            textAlign: "center",
            color: "#9ca3af",
            border: "1px dashed rgba(255,255,255,0.1)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏢</div>
            <h3 style={{ color: "#fff", marginBottom: "8px" }}>Nessun dato aziendale configurato</h3>
            <p>Clicca su "Inserisci dati" per aggiungere le informazioni della tua azienda.</p>
          </div>
        )
      ) : (
        <CompanyInfoForm
          initialData={companyInfo}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
      <div style={{ color: "#fff", fontSize: "14px", wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );
}
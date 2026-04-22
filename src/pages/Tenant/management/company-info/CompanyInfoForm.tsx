import { useState } from "react";
import { supabase } from "@/services/supabase";

interface CompanyInfoFormProps {
  initialData: any | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function CompanyInfoForm({ initialData, onSave, onCancel }: CompanyInfoFormProps) {
  const [form, setForm] = useState({
    company_name: initialData?.company_name || "",
    legal_address: initialData?.legal_address || "",
    vat_number: initialData?.vat_number || "",
    tax_code: initialData?.tax_code || "",
    email: initialData?.email || "",
    pec: initialData?.pec || "",
    phone: initialData?.phone || "",
    website: initialData?.website || "",
    registration_number: initialData?.registration_number || "",
    share_capital: initialData?.share_capital || "",
    unique_code: initialData?.unique_code || "",
  });
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData?.logo_url || null);

  const BLUE = "#3B82F6";

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Upload su Supabase Storage (da configurare)
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `company-logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public') // Assicurati che il bucket 'public' esista
      .upload(filePath, file);

    if (uploadError) {
      console.error("Errore upload logo:", uploadError);
    } else {
      const { data } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
      
      setLogoUrl(data.publicUrl);
    }
    
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    await onSave({
      ...form,
      logo_url: logoUrl,
    });

    setSaving(false);
  }

  return (
    <div style={{
      background: "#1a1f25",
      padding: "24px",
      borderRadius: "12px",
      border: "1px solid #333"
    }}>
      <h2 style={{ color: BLUE, marginBottom: "20px" }}>
        {initialData ? "Modifica dati aziendali" : "Nuovi dati aziendali"}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Logo */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
            Logo azienda
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #333",
              background: "#0d1117",
              color: "#fff"
            }}
          />
          {uploading && <div style={{ color: BLUE, marginTop: "5px" }}>Caricamento logo...</div>}
          {logoUrl && (
            <div style={{ marginTop: "10px" }}>
              <img src={logoUrl} alt="Logo" style={{ maxHeight: "60px" }} />
            </div>
          )}
        </div>

        {/* Campi del form in griglia */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
          <FormField
            label="Ragione Sociale *"
            value={form.company_name}
            onChange={(v) => setForm({ ...form, company_name: v })}
            required
          />
          <FormField
            label="Indirizzo Sede Legale"
            value={form.legal_address}
            onChange={(v) => setForm({ ...form, legal_address: v })}
          />
          <FormField
            label="Partita IVA"
            value={form.vat_number}
            onChange={(v) => setForm({ ...form, vat_number: v })}
          />
          <FormField
            label="Codice Fiscale"
            value={form.tax_code}
            onChange={(v) => setForm({ ...form, tax_code: v })}
          />
          <FormField
            label="Email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            type="email"
          />
          <FormField
            label="PEC"
            value={form.pec}
            onChange={(v) => setForm({ ...form, pec: v })}
            type="email"
          />
          <FormField
            label="Telefono"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <FormField
            label="Sito Web"
            value={form.website}
            onChange={(v) => setForm({ ...form, website: v })}
            type="url"
          />
          <FormField
            label="Numero REA"
            value={form.registration_number}
            onChange={(v) => setForm({ ...form, registration_number: v })}
          />
          <FormField
            label="Capitale Sociale"
            value={form.share_capital}
            onChange={(v) => setForm({ ...form, share_capital: v })}
            placeholder="es. € 10.000,00"
          />
          <FormField
            label="Codice Univoco"
            value={form.unique_code}
            onChange={(v) => setForm({ ...form, unique_code: v })}
          />
        </div>

        {/* Bottoni */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "1px solid #333",
              background: "transparent",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Annulla
          </button>
          
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: "6px",
              border: "none",
              background: BLUE,
              color: "#fff",
              cursor: "pointer",
              opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, value, onChange, required, type = "text", placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af", fontSize: "13px" }}>
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #333",
          background: "#0d1117",
          color: "#fff"
        }}
      />
    </div>
  );
}
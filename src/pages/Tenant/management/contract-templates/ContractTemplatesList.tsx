import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import ContractTemplateCard from "./ContractTemplateCard";
import ContractTemplateForm from "./ContractTemplateForm";

interface ContractTemplate {
  id: string;
  tenant_id: string;
  type: 'subscription' | 'wash_fidelity' | 'convention' | 'generic';
  name: string;
  title: string;
  content: string;
  terms_id: string | null;
  default_duration_months: number | null;
  default_price: number | null;
  is_active: boolean;
  created_at: string;
}

interface ContractTerm {
  id: string;
  name: string;
  type: string;
}

export default function ContractTemplatesList() {
  const { tenantId } = useParams();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [terms, setTerms] = useState<ContractTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);

  const BLUE = "#3B82F6";

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchTerms()]);
  }, [tenantId]);

  async function fetchTemplates() {
    if (!tenantId) return;
    
    const { data } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    setTemplates(data || []);
    setLoading(false);
  }

  async function fetchTerms() {
    if (!tenantId) return;
    
    const { data } = await supabase
      .from("contract_terms")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    setTerms(data || []);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("contract_templates")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (!error) {
      fetchTemplates();
    }
  }

  function handleEdit(template: ContractTemplate) {
    setEditingTemplate(template);
    setShowForm(true);
  }

  function handleNew() {
    setEditingTemplate(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingTemplate(null);
    fetchTemplates();
  }

  function getTypeLabel(type: string): string {
    switch (type) {
      case 'subscription': return 'Abbonamento';
      case 'wash_fidelity': return 'Fedeltà Lavaggio';
      case 'convention': return 'Convenzione';
      case 'generic': return 'Generico';
      default: return type;
    }
  }

  function getTermsName(termsId: string | null): string {
    if (!termsId) return "Nessuno";
    const term = terms.find(t => t.id === termsId);
    return term?.name || "N/D";
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento modelli contratto...
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
          📄 Modelli Contratto
        </h1>
        
        <button
          onClick={handleNew}
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
          + Nuovo modello
        </button>
      </div>

      {/* Lista modelli */}
      {templates.length === 0 ? (
        <div style={{
          background: "#1a1f25",
          padding: "40px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#9ca3af"
        }}>
          Nessun modello contratto trovato. Crea il primo modello!
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {templates.map((template) => (
            <ContractTemplateCard
              key={template.id}
              template={template}
              typeLabel={getTypeLabel(template.type)}
              termsName={getTermsName(template.terms_id)}
              onEdit={() => handleEdit(template)}
              onToggle={() => toggleActive(template.id, template.is_active)}
            />
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ContractTemplateForm
          tenantId={tenantId!}
          template={editingTemplate}
          terms={terms}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
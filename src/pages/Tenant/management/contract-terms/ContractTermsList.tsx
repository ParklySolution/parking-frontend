import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import ContractTermsCard from "./ContractTermsCard";
import ContractTermsForm from "./ContractTermsForm";

interface ContractTerm {
  id: string;
  tenant_id: string;
  name: string;
  type: 'subscription' | 'wash_fidelity' | 'convention' | 'generic';
  content: string;
  is_active: boolean;
  created_at: string;
}

export default function ContractTermsList() {
  const { tenantId } = useParams();
  const [terms, setTerms] = useState<ContractTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ContractTerm | null>(null);

  const BLUE = "#3B82F6";

  useEffect(() => {
    fetchTerms();
  }, [tenantId]);

  async function fetchTerms() {
    if (!tenantId) return;
    
    setLoading(true);
    
    const { data } = await supabase
      .from("contract_terms")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    setTerms(data || []);
    setLoading(false);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("contract_terms")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (!error) {
      fetchTerms();
    }
  }

  function handleEdit(term: ContractTerm) {
    setEditingTerm(term);
    setShowForm(true);
  }

  function handleNew() {
    setEditingTerm(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingTerm(null);
    fetchTerms();
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

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento termini contrattuali...
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
          📋 Termini Contrattuali
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
          + Nuovi termini
        </button>
      </div>

      {/* Lista termini */}
      {terms.length === 0 ? (
        <div style={{
          background: "#1a1f25",
          padding: "40px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#9ca3af"
        }}>
          Nessun termine contrattuale trovato. Crea i primi termini!
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {terms.map((term) => (
            <ContractTermsCard
              key={term.id}
              term={term}
              typeLabel={getTypeLabel(term.type)}
              onEdit={() => handleEdit(term)}
              onToggle={() => toggleActive(term.id, term.is_active)}
            />
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ContractTermsForm
          tenantId={tenantId!}
          term={editingTerm}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
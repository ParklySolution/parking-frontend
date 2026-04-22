import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";

interface Convention {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'free_hours';
  discount_value: number;
  max_discount: number | null;
  applicable_categories: string[] | null;
  min_hours: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

export default function ConventionsList() {
  const { tenantId } = useParams();
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConvention, setEditingConvention] = useState<Convention | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const BLUE = "#3B82F6";

  useEffect(() => {
    fetchConventions();
    fetchCategories();
  }, [tenantId]);

  async function fetchConventions() {
  if (!tenantId) {
    console.log("❌ fetchConventions: tenantId mancante");
    return;
  }
  
  console.log("🔍 fetchConventions: tenantId =", tenantId);
  setLoading(true);
  
  const { data, error } = await supabase
    .from("conventions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  console.log("📊 fetchConventions: data =", data);
  console.log("❌ fetchConventions: error =", error);

  if (!error && data) {
    setConventions(data);
  }
  setLoading(false);
}

  async function fetchCategories() {
    if (!tenantId) return;
    
    const { data } = await supabase
      .from("vehicle_categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (data) setCategories(data);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("conventions")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (!error) {
      fetchConventions();
    }
  }

  function handleEdit(convention: Convention) {
    setEditingConvention(convention);
    setShowForm(true);
  }

  function handleNew() {
    setEditingConvention(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingConvention(null);
    fetchConventions();
  }

  function getDiscountLabel(conv: Convention): string {
    switch (conv.discount_type) {
      case 'percentage':
        return `${conv.discount_value}% di sconto`;
      case 'fixed':
        return `€ ${conv.discount_value} fissi`;
      case 'free_hours':
        return `${conv.discount_value} ore gratis`;
      default:
        return '';
    }
  }

  function getCategoriesLabel(conv: Convention): string {
    if (!conv.applicable_categories || conv.applicable_categories.length === 0) {
      return "Tutte le categorie";
    }
    
    const catNames = categories
      .filter(c => conv.applicable_categories?.includes(c.id))
      .map(c => c.name)
      .join(", ");
    
    return catNames || "Nessuna categoria";
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento convenzioni...
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
          📋 Convenzioni
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
          + Nuova convenzione
        </button>
      </div>

      {/* Lista convenzioni */}
      {conventions.length === 0 ? (
        <div style={{
          background: "#1a1f25",
          padding: "40px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#9ca3af"
        }}>
          Nessuna convenzione trovata. Crea la prima convenzione!
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {conventions.map((conv) => (
            <div
              key={conv.id}
              style={{
                background: "#1a1f25",
                borderRadius: "12px",
                padding: "20px",
                border: `1px solid ${conv.is_active ? BLUE : "rgba(255,255,255,0.1)"}`,
                opacity: conv.is_active ? 1 : 0.6
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px"
              }}>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "18px" }}>
                    {conv.name}
                  </h3>
                  <p style={{ margin: "4px 0 0 0", color: BLUE, fontSize: "14px" }}>
                    {conv.code}
                  </p>
                </div>
                <span style={{
                  background: conv.is_active ? "#10b981" : "#6b7280",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#fff"
                }}>
                  {conv.is_active ? "ATTIVA" : "DISATTIVA"}
                </span>
              </div>

              {conv.description && (
                <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "12px" }}>
                  {conv.description}
                </p>
              )}

              <div style={{
                background: "#0d1117",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#9ca3af" }}>Sconto:</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{getDiscountLabel(conv)}</span>
                </div>
                
                {conv.max_discount && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "#9ca3af" }}>Max sconto:</span>
                    <span style={{ color: "#fff" }}>€ {conv.max_discount}</span>
                  </div>
                )}
                
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#9ca3af" }}>Categorie:</span>
                  <span style={{ color: "#fff" }}>{getCategoriesLabel(conv)}</span>
                </div>
                
                {conv.min_hours && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#9ca3af" }}>Min ore:</span>
                    <span style={{ color: "#fff" }}>{conv.min_hours} ore</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => toggleActive(conv.id, conv.is_active)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  {conv.is_active ? "Disattiva" : "Attiva"}
                </button>
                
                <button
                  onClick={() => handleEdit(conv)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: BLUE,
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Modifica
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <ConventionForm
          tenantId={tenantId!}
          convention={editingConvention}
          categories={categories}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

// Componente form (da creare separatamente)
import ConventionForm from './ConventionForm';
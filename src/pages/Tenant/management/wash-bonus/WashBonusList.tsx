import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import WashBonusCard from "./WashBonusCard";
import WashBonusForm from "./WashBonusForm";

interface BonusRule {
  id: string;
  tenant_id: string;
  wash_service_id: string;
  bonus_type: 'free_hours' | 'free_parking' | 'discount_percentage' | 'fixed_discount';
  bonus_value: number;
  min_wash_amount: number | null;
  applicable_categories: string[] | null;
  max_uses_per_day: number | null;
  valid_days_of_week: number[] | null;
  is_active: boolean;
  created_at: string;
}

export default function WashBonusList() {
  const { tenantId } = useParams();
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<BonusRule | null>(null);

  const BLUE = "#3B82F6";

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  async function fetchData() {
    if (!tenantId) return;
    
    setLoading(true);
    
    // Carica regole bonus
    const { data: rules } = await supabase
      .from("wash_parking_bonus_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    // Carica servizi lavaggio
    const { data: svc } = await supabase
      .from("wash_service_catalog")
      .select("id, name, code")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // Carica categorie veicoli
    const { data: cats } = await supabase
      .from("vehicle_categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    setBonusRules(rules || []);
    setServices(svc || []);
    setCategories(cats || []);
    setLoading(false);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    const { error } = await supabase
      .from("wash_parking_bonus_rules")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (!error) {
      fetchData();
    }
  }

  function handleEdit(rule: BonusRule) {
    setEditingRule(rule);
    setShowForm(true);
  }

  function handleNew() {
    setEditingRule(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingRule(null);
    fetchData();
  }

  function getServiceName(serviceId: string): string {
    return services.find(s => s.id === serviceId)?.name || "Servizio sconosciuto";
  }

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#fff" }}>
        Caricamento regole bonus...
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
          🎁 Bonus Lavaggio
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
          + Nuova regola bonus
        </button>
      </div>

      {/* Lista regole */}
      {bonusRules.length === 0 ? (
        <div style={{
          background: "#1a1f25",
          padding: "40px",
          borderRadius: "12px",
          textAlign: "center",
          color: "#9ca3af"
        }}>
          Nessuna regola bonus trovata. Crea la prima regola!
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px"
        }}>
          {bonusRules.map((rule) => (
            <WashBonusCard
              key={rule.id}
              rule={rule}
              serviceName={getServiceName(rule.wash_service_id)}
              categories={categories}
              onEdit={() => handleEdit(rule)}
              onToggle={() => toggleActive(rule.id, rule.is_active)}
            />
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <WashBonusForm
          tenantId={tenantId!}
          rule={editingRule}
          services={services}
          categories={categories}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
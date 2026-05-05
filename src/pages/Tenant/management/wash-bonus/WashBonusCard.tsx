import { useState } from "react";

interface BonusRule {
  id: string;
  tenant_id: string;
  wash_service_id: string;
  bonus_type: 'free_hours' | 'free_parking' | 'discount_percentage' | 'fixed_discount' | 'recurring_wash';
  bonus_value: number;
  min_wash_amount: number | null;
  applicable_categories: string[] | null;
  max_uses_per_day: number | null;
  valid_days_of_week: number[] | null;
  is_active: boolean;
  created_at: string;
  // 🔥 NUOVI CAMPI PER REGOLE RICORRENTI
  is_recurring?: boolean;
  recurring_threshold?: number;
  recurring_reward_type?: string;
  recurring_reward_value?: number;
  trigger_service_id?: string;
  reward_service_id?: string;
}

interface WashBonusCardProps {
  rule: BonusRule;
  serviceName: string;
  triggerServiceName?: string;
  rewardServiceName?: string;
  categories: Array<{ id: string; name: string }>;
  onEdit: () => void;
  onToggle: () => void;
}

export default function WashBonusCard({ rule, serviceName, triggerServiceName, rewardServiceName, categories, onEdit, onToggle }: WashBonusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const BLUE = "#3B82F6";
  const GREEN = "#10b981";
  const RED = "#ef4444";
  const GRAY = "#6b7280";
  const ORANGE = "#f59e0b";

  function getBonusTypeLabel(): string {
    if (rule.is_recurring) {
      return 'Regola ricorrente';
    }
    switch (rule.bonus_type) {
      case 'free_hours':
        return 'Ore gratuite';
      case 'free_parking':
        return 'Parcheggio gratuito';
      case 'discount_percentage':
        return 'Sconto percentuale';
      case 'fixed_discount':
        return 'Sconto fisso';
      default:
        return '';
    }
  }

  function getBonusValueLabel(): string {
    if (rule.is_recurring) {
      return getRecurringRewardLabel();
    }
    switch (rule.bonus_type) {
      case 'free_hours':
        return `${rule.bonus_value} ore`;
      case 'free_parking':
        return '24 ore gratuite';
      case 'discount_percentage':
        return `${rule.bonus_value}%`;
      case 'fixed_discount':
        return `€ ${rule.bonus_value}`;
      default:
        return '';
    }
  }

  function getRecurringThresholdLabel(): string {
    if (!rule.is_recurring || !rule.recurring_threshold) return '';
    return `Ogni ${rule.recurring_threshold} lavaggi`;
  }

  function getRecurringRewardLabel(): string {
    if (!rule.is_recurring) return '';
    switch (rule.recurring_reward_type) {
      case 'free_wash':
        return `${rule.recurring_reward_value} lavaggio${rule.recurring_reward_value !== 1 ? 'ggi' : ''} gratis`;
      case 'discount_percentage':
        return `${rule.recurring_reward_value}% sconto`;
      case 'fixed_discount':
        return `€ ${rule.recurring_reward_value} sconto`;
      default:
        return '';
    }
  }

  function getCategoriesLabel(): string {
    if (!rule.applicable_categories || rule.applicable_categories.length === 0) {
      return "Tutte le categorie";
    }
    
    const catNames = categories
      .filter(c => rule.applicable_categories?.includes(c.id))
      .map(c => c.name)
      .join(", ");
    
    return catNames || "Nessuna categoria";
  }

  function getDaysLabel(): string {
    if (!rule.valid_days_of_week || rule.valid_days_of_week.length === 0) {
      return "Tutti i giorni";
    }
    
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return rule.valid_days_of_week.map(d => days[d]).join(", ");
  }

  return (
    <div
      style={{
        background: "#1a1f25",
        borderRadius: "12px",
        padding: "20px",
        border: `1px solid ${rule.is_active ? (rule.is_recurring ? ORANGE : BLUE) : "rgba(255,255,255,0.1)"}`,
        opacity: rule.is_active ? 1 : 0.6,
        transition: "all 0.2s ease"
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "12px",
        cursor: "pointer"
      }}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: 600 }}>
            {serviceName}
          </h3>
          <p style={{ margin: "4px 0 0 0", color: rule.is_recurring ? ORANGE : BLUE, fontSize: "13px" }}>
            {getBonusTypeLabel()}
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: rule.is_active ? (rule.is_recurring ? ORANGE : GREEN) : GRAY,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#fff",
            fontWeight: 600
          }}>
            {rule.is_active ? "ATTIVO" : "DISATTIVO"}
          </span>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* 🔥 Se è una regola ricorrente, mostra info specifiche in primo piano */}
      {rule.is_recurring && (
        <div style={{
          background: "rgba(245, 158, 11, 0.1)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          border: `1px solid ${ORANGE}40`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#9ca3af" }}>🎯 Regola:</span>
            <span style={{ color: ORANGE, fontWeight: 600 }}>
              {getRecurringThresholdLabel()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#9ca3af" }}>🎁 Premio:</span>
            <span style={{ color: GREEN, fontWeight: 600 }}>
              {getRecurringRewardLabel()}
            </span>
          </div>
          {triggerServiceName && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#9ca3af" }}>🔥 Accumula con:</span>
              <span style={{ color: "#fff" }}>{triggerServiceName}</span>
            </div>
          )}
          {rewardServiceName && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#9ca3af" }}>🎁 Omaggia:</span>
              <span style={{ color: "#fff" }}>{rewardServiceName}</span>
            </div>
          )}
        </div>
      )}

      {/* Info compatte (solo per regole non ricorrenti) */}
      {!rule.is_recurring && (
        <div style={{
          background: "#0d1117",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#9ca3af" }}>Bonus:</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>{getBonusValueLabel()}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Categorie:</span>
            <span style={{ color: "#fff" }}>{getCategoriesLabel()}</span>
          </div>
        </div>
      )}

      {/* Dettagli espandibili */}
      {isExpanded && (
        <div style={{
          background: "#0d1117",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          {rule.min_wash_amount && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Min. lavaggi:</span>
              <span style={{ color: "#fff" }}>{rule.min_wash_amount}</span>
            </div>
          )}
          
          {rule.max_uses_per_day && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Max utilizzi/giorno:</span>
              <span style={{ color: "#fff" }}>{rule.max_uses_per_day}</span>
            </div>
          )}
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Giorni validi:</span>
            <span style={{ color: "#fff" }}>{getDaysLabel()}</span>
          </div>
        </div>
      )}

      {/* Bottoni azioni */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={onToggle}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = rule.is_active ? RED : GREEN;
            e.currentTarget.style.borderColor = rule.is_active ? RED : GREEN;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          {rule.is_active ? "Disattiva" : "Attiva"}
        </button>
        
        <button
          onClick={onEdit}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: rule.is_recurring ? ORANGE : BLUE,
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600
          }}
        >
          Modifica
        </button>
      </div>
    </div>
  );
}
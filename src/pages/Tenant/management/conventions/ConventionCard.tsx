import { useState } from "react";
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

interface ConventionCardProps {
  convention: Convention;
  categories: Array<{ id: string; name: string }>;
  onEdit: () => void;
  onToggle: () => void;
}

export default function ConventionCard({ convention, categories, onEdit, onToggle }: ConventionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const BLUE = "#3B82F6";
  const GREEN = "#10b981";
  const RED = "#ef4444";
  const GRAY = "#6b7280";

  function getDiscountLabel(): string {
    switch (convention.discount_type) {
      case 'percentage':
        return `${convention.discount_value}% di sconto`;
      case 'fixed':
        return `€ ${convention.discount_value.toFixed(2)} fissi`;
      case 'free_hours':
        return `${convention.discount_value} ore gratuite`;
      default:
        return '';
    }
  }

  function getCategoriesLabel(): string {
    if (!convention.applicable_categories || convention.applicable_categories.length === 0) {
      return "Tutte le categorie";
    }
    
    const catNames = categories
      .filter(c => convention.applicable_categories?.includes(c.id))
      .map(c => c.name)
      .join(", ");
    
    return catNames || "Nessuna categoria";
  }

  function getValidityDates(): string {
    if (!convention.valid_from && !convention.valid_to) return "Sempre valida";
    
    const from = convention.valid_from 
      ? new Date(convention.valid_from).toLocaleDateString("it-IT") 
      : "sempre";
    const to = convention.valid_to 
      ? new Date(convention.valid_to).toLocaleDateString("it-IT") 
      : "sempre";
    
    return `Dal ${from} al ${to}`;
  }

  return (
    <div
      style={{
        background: "#1a1f25",
        borderRadius: "12px",
        padding: "20px",
        border: `1px solid ${convention.is_active ? BLUE : "rgba(255,255,255,0.1)"}`,
        opacity: convention.is_active ? 1 : 0.6,
        transition: "all 0.2s ease"
      }}
    >
      {/* Header con nome e stato */}
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
          <h3 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: 600 }}>
            {convention.name}
          </h3>
          <p style={{ margin: "4px 0 0 0", color: BLUE, fontSize: "14px", fontFamily: "monospace" }}>
            {convention.code}
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: convention.is_active ? GREEN : GRAY,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#fff",
            fontWeight: 600
          }}>
            {convention.is_active ? "ATTIVA" : "DISATTIVA"}
          </span>
          <span style={{ color: "#9ca3af", fontSize: "16px" }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Descrizione (se presente) */}
      {convention.description && (
        <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "12px" }}>
          {convention.description}
        </p>
      )}

      {/* Info compatte sempre visibili */}
      <div style={{
        background: "#0d1117",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "#9ca3af" }}>Sconto:</span>
          <span style={{ color: "#fff", fontWeight: 600 }}>{getDiscountLabel()}</span>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#9ca3af" }}>Categorie:</span>
          <span style={{ color: "#fff" }}>{getCategoriesLabel()}</span>
        </div>
      </div>

      {/* Dettagli espandibili */}
      {isExpanded && (
        <div style={{
          background: "#0d1117",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}>
          {convention.max_discount && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Massimo sconto:</span>
              <span style={{ color: "#fff" }}>€ {convention.max_discount.toFixed(2)}</span>
            </div>
          )}
          
          {convention.min_hours && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#9ca3af" }}>Ore minime:</span>
              <span style={{ color: "#fff" }}>{convention.min_hours} ore</span>
            </div>
          )}
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#9ca3af" }}>Validità:</span>
            <span style={{ color: "#fff" }}>{getValidityDates()}</span>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af" }}>Creato il:</span>
            <span style={{ color: "#fff" }}>
              {new Date(convention.created_at).toLocaleDateString("it-IT")}
            </span>
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
            fontSize: "13px",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = convention.is_active ? RED : GREEN;
            e.currentTarget.style.borderColor = convention.is_active ? RED : GREEN;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          {convention.is_active ? "Disattiva" : "Attiva"}
        </button>
        
        <button
          onClick={onEdit}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: BLUE,
            color: "#fff",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#2563eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = BLUE;
          }}
        >
          Modifica
        </button>
      </div>
    </div>
  );
}
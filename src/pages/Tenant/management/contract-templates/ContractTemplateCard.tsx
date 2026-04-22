import { useState } from "react";

interface ContractTemplate {
  id: string;
  type: string;
  name: string;
  title: string;
  content: string;
  terms_id: string | null;
  default_duration_months: number | null;
  default_price: number | null;
  is_active: boolean;
  created_at: string;
}

interface ContractTemplateCardProps {
  template: ContractTemplate;
  typeLabel: string;
  termsName: string;
  onEdit: () => void;
  onToggle: () => void;
}

export default function ContractTemplateCard({ template, typeLabel, termsName, onEdit, onToggle }: ContractTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const BLUE = "#3B82F6";
  const GREEN = "#10b981";
  const RED = "#ef4444";
  const GRAY = "#6b7280";

  return (
    <div
      style={{
        background: "#1a1f25",
        borderRadius: "12px",
        padding: "20px",
        border: `1px solid ${template.is_active ? BLUE : "rgba(255,255,255,0.1)"}`,
        opacity: template.is_active ? 1 : 0.6,
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
            {template.name}
          </h3>
          <p style={{ margin: "4px 0 0 0", color: BLUE, fontSize: "13px" }}>
            {typeLabel}
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: template.is_active ? GREEN : GRAY,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#fff",
            fontWeight: 600
          }}>
            {template.is_active ? "ATTIVO" : "DISATTIVO"}
          </span>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Info compatte */}
      <div style={{
        background: "#0d1117",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px"
      }}>
        <div style={{ marginBottom: "4px" }}>
          <span style={{ color: "#9ca3af", fontSize: "12px" }}>Titolo:</span>
          <span style={{ color: "#fff", fontSize: "12px", marginLeft: "8px" }}>{template.title}</span>
        </div>
        <div style={{ marginBottom: "4px" }}>
          <span style={{ color: "#9ca3af", fontSize: "12px" }}>Termini:</span>
          <span style={{ color: "#fff", fontSize: "12px", marginLeft: "8px" }}>{termsName}</span>
        </div>
        {template.default_duration_months && (
          <div style={{ marginBottom: "4px" }}>
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>Durata:</span>
            <span style={{ color: "#fff", fontSize: "12px", marginLeft: "8px" }}>{template.default_duration_months} mesi</span>
          </div>
        )}
        {template.default_price && (
          <div>
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>Prezzo base:</span>
            <span style={{ color: "#fff", fontSize: "12px", marginLeft: "8px" }}>€ {template.default_price}</span>
          </div>
        )}
      </div>

      {/* Dettagli espandibili (anteprima contenuto) */}
      {isExpanded && (
        <div style={{
          background: "#0d1117",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          border: "1px solid rgba(255,255,255,0.05)",
          maxHeight: "200px",
          overflowY: "auto"
        }}>
          <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}>Anteprima contenuto:</div>
          <div style={{ color: "#fff", fontSize: "12px", whiteSpace: "pre-wrap" }}>
            {template.content.substring(0, 300)}
            {template.content.length > 300 && "..."}
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
            e.currentTarget.style.background = template.is_active ? RED : GREEN;
            e.currentTarget.style.borderColor = template.is_active ? RED : GREEN;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          {template.is_active ? "Disattiva" : "Attiva"}
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
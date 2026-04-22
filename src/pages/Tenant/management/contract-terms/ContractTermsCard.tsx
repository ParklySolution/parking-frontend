import { useState } from "react";

interface ContractTerm {
  id: string;
  name: string;
  type: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface ContractTermsCardProps {
  term: ContractTerm;
  typeLabel: string;
  onEdit: () => void;
  onToggle: () => void;
}

export default function ContractTermsCard({ term, typeLabel, onEdit, onToggle }: ContractTermsCardProps) {
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
        border: `1px solid ${term.is_active ? BLUE : "rgba(255,255,255,0.1)"}`,
        opacity: term.is_active ? 1 : 0.6,
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
            {term.name}
          </h3>
          <p style={{ margin: "4px 0 0 0", color: BLUE, fontSize: "13px" }}>
            {typeLabel}
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: term.is_active ? GREEN : GRAY,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "11px",
            color: "#fff",
            fontWeight: 600
          }}>
            {term.is_active ? "ATTIVO" : "DISATTIVO"}
          </span>
          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
            {isExpanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Anteprima contenuto */}
      <div style={{
        background: "#0d1117",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px"
      }}>
        <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>Anteprima:</div>
        <div style={{ color: "#fff", fontSize: "12px", maxHeight: "60px", overflow: "hidden" }}>
          {term.content.substring(0, 150)}...
        </div>
      </div>

      {/* Dettagli espandibili */}
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
          <div style={{ color: "#9ca3af", fontSize: "11px", marginBottom: "4px" }}>Testo completo:</div>
          <div style={{ color: "#fff", fontSize: "12px", whiteSpace: "pre-wrap" }}>
            {term.content}
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
            e.currentTarget.style.background = term.is_active ? RED : GREEN;
            e.currentTarget.style.borderColor = term.is_active ? RED : GREEN;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          {term.is_active ? "Disattiva" : "Attiva"}
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
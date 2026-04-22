import { useEffect } from "react";
import "./accessGate.css";

/**
 * Stati possibili della barriera
 * idle      → neutro
 * checking  → verifica in corso
 * allowed   → apertura
 * blocked   → accesso negato
 */
export type GateStatus = "idle" | "checking" | "allowed" | "blocked";

interface AccessGateProps {
  status: GateStatus;
  onReset?: () => void; // opzionale: reset automatico
}

export default function AccessGate({ status, onReset }: AccessGateProps) {
  // 🔄 reset automatico dopo esito
  useEffect(() => {
    if (status === "allowed" || status === "blocked") {
      const timer = setTimeout(() => {
        onReset?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, onReset]);

  const getLabel = () => {
    switch (status) {
      case "checking":
        return "Verifica in corso...";
      case "allowed":
        return "Accesso consentito";
      case "blocked":
        return "Accesso negato";
      default:
        return "Sistema pronto";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "checking":
        return "⏳";
      case "allowed":
        return "✅";
      case "blocked":
        return "⛔";
      default:
        return "🚧";
    }
  };

  return (
  <div className={`access-gate ${status}`}>
    <div className="gate-header">
      <span className="gate-icon">{getIcon()}</span>
      <span className="gate-label">{getLabel()}</span>
    </div>

    <div className="gate-visual">
      <div className="gate-arm" />
    </div>
  </div>
);
}

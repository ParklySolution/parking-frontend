// src/pages/operator/Contracts/components/tabs/ContrattoTab.tsx
import React from "react";
import { InputField } from "../ui/InputField";
import type { FormData } from "../../types";

interface ContrattoTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
  defaultDuration?: string;
  defaultPrice?: string;
  showDuration?: boolean;
  showPrice?: boolean;
}

export const ContrattoTab: React.FC<ContrattoTabProps> = ({ 
  formData, 
  onInputChange,
  defaultDuration,
  defaultPrice,
  showDuration = true,
  showPrice = true
}) => {
  // Se non deve mostrare né durata né prezzo, mostra solo le note e le opzioni
  if (!showDuration && !showPrice) {
    return (
      <div>
        <InputField 
          label="Note" 
          value={formData.notes || ''} 
          onChange={(v) => onInputChange("notes", v)} 
          textarea 
          style={{ marginBottom: "20px" }} 
        />
        
        <div style={{ marginTop: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <input 
              type="checkbox" 
              checked={formData.send_email} 
              onChange={(e) => onInputChange("send_email", e.target.checked)} 
            />
            <span style={{ color: "#9ca3af" }}>Invia copia via email al cliente</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input 
              type="checkbox" 
              checked={formData.print_copy} 
              onChange={(e) => onInputChange("print_copy", e.target.checked)} 
            />
            <span style={{ color: "#9ca3af" }}>Stampa copia fisica</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
      {showDuration && (
        <InputField 
          label="Durata (mesi)" 
          type="number" 
          min="1" 
          value={formData.duration_months || defaultDuration || ''} 
          onChange={(v) => onInputChange("duration_months", v)} 
        />
      )}
      
      {showPrice && (
        <InputField 
          label="Importo (€)" 
          type="number" 
          min="0" 
          step="0.01" 
          value={formData.price || defaultPrice || ''} 
          onChange={(v) => onInputChange("price", v)} 
        />
      )}
      
      <InputField 
        label="Note" 
        value={formData.notes || ''} 
        onChange={(v) => onInputChange("notes", v)} 
        textarea 
        style={{ gridColumn: "span 2" }} 
      />
      
      <div style={{ gridColumn: "span 2", marginTop: "10px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <input 
            type="checkbox" 
            checked={formData.send_email} 
            onChange={(e) => onInputChange("send_email", e.target.checked)} 
          />
          <span style={{ color: "#9ca3af" }}>Invia copia via email al cliente</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input 
            type="checkbox" 
            checked={formData.print_copy} 
            onChange={(e) => onInputChange("print_copy", e.target.checked)} 
          />
          <span style={{ color: "#9ca3af" }}>Stampa copia fisica</span>
        </label>
      </div>
    </div>
  );
};
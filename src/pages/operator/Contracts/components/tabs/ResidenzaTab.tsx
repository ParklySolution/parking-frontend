// src/pages/operator/Contracts/components/tabs/ResidenzaTab.tsx
import React from "react";
import { InputField } from "../ui/InputField";

// ✅ CORRETTO: importa SOLO il tipo
import type { FormData } from "../../types";

interface ResidenzaTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
  requiredFields?: string[];
}

export const ResidenzaTab: React.FC<ResidenzaTabProps> = ({ 
  formData, 
  onInputChange,
  requiredFields = []
}) => {
  // Determina quali campi mostrare
  const showAddress = requiredFields.includes('address');
  const showCity = requiredFields.includes('city');
  const showPostalCode = requiredFields.includes('postal_code');
  const showProvince = requiredFields.includes('province');

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
      <InputField 
        label="Indirizzo" 
        value={formData.address} 
        onChange={(v) => onInputChange("address", v)} 
        placeholder="Via Roma 1"
        required={showAddress}
      />
      <InputField 
        label="Città" 
        value={formData.city} 
        onChange={(v) => onInputChange("city", v)} 
        required={showCity}
      />
      <InputField 
        label="CAP" 
        value={formData.postal_code} 
        onChange={(v) => onInputChange("postal_code", v)} 
        placeholder="00100"
        required={showPostalCode}
      />
      <InputField 
        label="Provincia" 
        value={formData.province} 
        onChange={(v) => onInputChange("province", v)} 
        placeholder="RM"
        required={showProvince}
      />
    </div>
  );
};
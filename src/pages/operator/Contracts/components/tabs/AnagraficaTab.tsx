// src/pages/operator/Contracts/components/tabs/AnagraficaTab.tsx
import React from "react";
import { InputField } from "../ui/InputField";

// ✅ CORRETTO: importa SOLO il tipo
import type { FormData } from "../../types";

interface AnagraficaTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
  requiredFields?: string[];
  showAllFields?: boolean;
}

export const AnagraficaTab: React.FC<AnagraficaTabProps> = ({ 
  formData, 
  onInputChange,
  requiredFields = [],
  showAllFields = true
}) => {
  // Determina quali campi mostrare
  const showFiscalCode = showAllFields || requiredFields.includes('fiscal_code');
  const showBirthDate = showAllFields || requiredFields.includes('birth_date');
  const showBirthPlace = showAllFields || requiredFields.includes('birth_place');
  const showBirthProvince = showAllFields || requiredFields.includes('birth_province');
  const showEmail = showAllFields || requiredFields.includes('email');
  const showPhone = showAllFields || requiredFields.includes('phone');

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
      <InputField 
        label="Nome" 
        value={formData.first_name} 
        onChange={(v) => onInputChange("first_name", v)} 
        required={requiredFields.includes('first_name')}
      />
      <InputField 
        label="Cognome" 
        value={formData.last_name} 
        onChange={(v) => onInputChange("last_name", v)} 
        required={requiredFields.includes('last_name')}
      />
      
      {showFiscalCode && (
        <InputField 
          label="Codice Fiscale" 
          value={formData.fiscal_code} 
          onChange={(v) => onInputChange("fiscal_code", v)} 
          placeholder="RSSMRA80A01H501X"
          required={requiredFields.includes('fiscal_code')}
        />
      )}
      
      {showBirthDate && (
        <InputField 
          label="Data di Nascita" 
          type="date" 
          value={formData.birth_date} 
          onChange={(v) => onInputChange("birth_date", v)} 
          required={requiredFields.includes('birth_date')}
        />
      )}
      
      {showBirthPlace && (
        <InputField 
          label="Luogo di Nascita" 
          value={formData.birth_place} 
          onChange={(v) => onInputChange("birth_place", v)} 
          required={requiredFields.includes('birth_place')}
        />
      )}
      
      {showBirthProvince && (
        <InputField 
          label="Provincia di Nascita" 
          value={formData.birth_province || ''} 
          onChange={(v) => onInputChange("birth_province", v)} 
          placeholder="RM"
          required={requiredFields.includes('birth_province')}
        />
      )}
      
      {showEmail && (
        <InputField 
          label="Email" 
          type="email" 
          value={formData.email} 
          onChange={(v) => onInputChange("email", v)} 
          required={requiredFields.includes('email')}
        />
      )}
      
      {showPhone && (
        <InputField 
          label="Telefono" 
          type="tel" 
          value={formData.phone} 
          onChange={(v) => onInputChange("phone", v)} 
          required={requiredFields.includes('phone')}
        />
      )}
    </div>
  );
};
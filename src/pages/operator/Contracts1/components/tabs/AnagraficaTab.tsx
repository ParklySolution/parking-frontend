// src/pages/operator/Contracts/components/tabs/AnagraficaTab.tsx
import React from "react";
import { InputField } from "../ui/InputField";

// ✅ CORRETTO: importa SOLO il tipo
import type { FormData } from "../../types";

interface AnagraficaTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
}

export const AnagraficaTab: React.FC<AnagraficaTabProps> = ({ formData, onInputChange }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
      <InputField 
        label="Nome" 
        value={formData.first_name} 
        onChange={(v) => onInputChange("first_name", v)} 
        required 
      />
      <InputField 
        label="Cognome" 
        value={formData.last_name} 
        onChange={(v) => onInputChange("last_name", v)} 
        required 
      />
      <InputField 
        label="Codice Fiscale" 
        value={formData.fiscal_code} 
        onChange={(v) => onInputChange("fiscal_code", v)} 
        placeholder="RSSMRA80A01H501X"
      />
      <InputField 
        label="Data di Nascita" 
        type="date" 
        value={formData.birth_date} 
        onChange={(v) => onInputChange("birth_date", v)} 
      />
      <InputField 
        label="Luogo di Nascita" 
        value={formData.birth_place} 
        onChange={(v) => onInputChange("birth_place", v)} 
      />
      <InputField 
        label="Provincia di Nascita" 
        value={formData.birth_province || ''} 
        onChange={(v) => onInputChange("birth_province", v)} 
        placeholder="RM"
      />
      <InputField 
        label="Email" 
        type="email" 
        value={formData.email} 
        onChange={(v) => onInputChange("email", v)} 
      />
      <InputField 
        label="Telefono" 
        type="tel" 
        value={formData.phone} 
        onChange={(v) => onInputChange("phone", v)} 
      />
    </div>
  );
};
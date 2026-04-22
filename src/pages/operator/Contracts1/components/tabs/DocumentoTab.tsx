// src/pages/operator/Contracts/components/tabs/DocumentoTab.tsx
import React from "react";
import { InputField } from "../ui/InputField";
import type { FormData } from "../../types";

interface DocumentoTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
}

export const DocumentoTab: React.FC<DocumentoTabProps> = ({ formData, onInputChange }) => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px" }}>
      <InputField 
        label="Tipo Documento" 
        value={formData.document_type} 
        onChange={(v) => onInputChange("document_type", v)} 
        placeholder="CI, Passaporto, Patente"
      />
      <InputField 
        label="Numero Documento" 
        value={formData.document_number} 
        onChange={(v) => onInputChange("document_number", v)} 
      />
      <InputField 
        label="Data Rilascio" 
        type="date" 
        value={formData.document_issue_date} 
        onChange={(v) => onInputChange("document_issue_date", v)} 
      />
      <InputField 
        label="Data Scadenza" 
        type="date" 
        value={formData.document_expiry_date} 
        onChange={(v) => onInputChange("document_expiry_date", v)} 
      />
      <InputField 
        label="Ente Rilascio" 
        value={formData.document_issuing_authority} 
        onChange={(v) => onInputChange("document_issuing_authority", v)} 
        placeholder="Comune di Roma"
        style={{ gridColumn: "span 2" }}
      />
    </div>
  );
};
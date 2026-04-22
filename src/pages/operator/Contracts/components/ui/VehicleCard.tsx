// src/pages/operator/Contracts/components/ui/VehicleCard.tsx
import React from "react";
import { FaCar, FaPlus, FaTimes } from "react-icons/fa";
import { InputField } from "./InputField";
import { AutoCompleteField } from "./AutoCompleteField";
import { Vehicle } from "../../types";
import { BG_LIGHTER } from "../../constants";

interface VehicleCardProps {
  vehicle: Vehicle;
  onUpdate: (field: string, value: string) => void;
  onRemove: () => void;
  showRemove: boolean;
  brandSuggestions: string[];
  modelSuggestions: string[];
  colorSuggestions: string[];
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onUpdate,
  onRemove,
  showRemove,
  brandSuggestions,
  modelSuggestions,
  colorSuggestions
}) => {
  return (
    <div style={{
      background: BG_LIGHTER,
      padding: "20px",
      borderRadius: "10px",
      marginBottom: "20px",
      border: "1px solid #333",
      position: "relative"
    }}>
      {showRemove && (
        <button
          onClick={onRemove}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "16px",
            padding: "5px"
          }}
          title="Rimuovi veicolo"
        >
          <FaTimes />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px" }}>
        <FaCar style={{ color: "#4f8cff" }} />
        <h4 style={{ color: "#fff", margin: 0 }}>Veicolo {vehicle.id}</h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
        <InputField
          label="Targa"
          value={vehicle.plate}
          onChange={(v) => onUpdate("plate", v)}
          required
          placeholder="AA123BB"
        />

        <AutoCompleteField
          label="Marca"
          value={vehicle.make}
          onChange={(v) => onUpdate("make", v)}
          suggestions={brandSuggestions}
          placeholder="Seleziona marca"
        />

        <AutoCompleteField
          label="Modello"
          value={vehicle.model}
          onChange={(v) => onUpdate("model", v)}
          suggestions={modelSuggestions.filter(m => 
            m.make === vehicle.make || !vehicle.make
          )}
          suggestionKey="name"
          disabled={!vehicle.make}
          placeholder={!vehicle.make ? "Prima seleziona marca" : "Seleziona modello"}
        />

        <InputField
          label="Anno"
          type="number"
          min={1900}
          max={new Date().getFullYear() + 1}
          value={vehicle.year}
          onChange={(v) => onUpdate("year", v)}
          placeholder="2024"
        />

        <AutoCompleteField
          label="Colore"
          value={vehicle.color}
          onChange={(v) => onUpdate("color", v)}
          suggestions={colorSuggestions}
          placeholder="Seleziona colore"
        />
      </div>
    </div>
  );
};
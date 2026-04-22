// src/pages/operator/Contracts/components/tabs/VeicoliTab.tsx
import React from "react";
import { FaPlus, FaTrash, FaCar, FaEuroSign } from "react-icons/fa";
import { InputField } from "../ui/InputField";
import { AutoCompleteField } from "../ui/AutoCompleteField";
import type { FormData, Vehicle, Tariff } from "../../types";
import { BLUE, BG_LIGHTER, TARIFF_TYPES } from "../../constants";

interface VeicoliTabProps {
  formData: FormData;
  onInputChange: (field: string, value: any) => void;
  vehicles: Vehicle[];
  selectedVehicle: number;
  onSelectVehicle: (id: number) => void;
  onAddVehicle: () => void;
  onRemoveVehicle: (id: number) => void;
  onUpdateVehicle: (id: number, field: string, value: string) => void;
  onAddTariff: (vehicleId: number) => void;
  onRemoveTariff: (vehicleId: number, tariffId: number) => void;
  onUpdateTariff: (vehicleId: number, tariffId: number, field: string, value: string) => void;
  brands: Array<{ id: string; name: string }>;
  models: Array<{ id: string; name: string; brand_id: string }>;
  loadingBrands?: boolean;
  loadingModels?: boolean;
}

export const VeicoliTab: React.FC<VeicoliTabProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onAddVehicle,
  onRemoveVehicle,
  onUpdateVehicle,
  onAddTariff,
  onRemoveTariff,
  onUpdateTariff,
  brands,
  models,
  loadingBrands,
  loadingModels
}) => {
  // Trova il veicolo selezionato
  const currentVehicle = vehicles.find(v => v.id === selectedVehicle) || vehicles[0];

  // Filtra i modelli per la marca selezionata
  const filteredModels = currentVehicle?.brand_id
    ? models.filter(m => m.brand_id === currentVehicle.brand_id)
    : [];

  // Se non ci sono veicoli, non mostrare nulla
  if (!vehicles.length) return null;

  return (
    <div>
      {/* SELEZIONE VEICOLI MULTIPLI */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        {vehicles.map(vehicle => (
          <div
            key={vehicle.id}
            onClick={() => onSelectVehicle(vehicle.id)}
            style={{
              padding: "8px 16px",
              background: selectedVehicle === vehicle.id ? BLUE : BG_LIGHTER,
              color: selectedVehicle === vehicle.id ? "#fff" : "#9ca3af",
              border: "1px solid",
              borderColor: selectedVehicle === vehicle.id ? BLUE : "#333",
              borderRadius: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease"
            }}
          >
            <FaCar size={14} />
            <span>Veicolo {vehicle.id}</span>
            {vehicle.plate && <span style={{ fontSize: "12px", opacity: 0.8 }}>({vehicle.plate})</span>}
            
            {vehicles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveVehicle(vehicle.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  marginLeft: "5px",
                  padding: "2px 5px"
                }}
              >
                <FaTrash size={12} />
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={onAddVehicle}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: "1px dashed #4f8cff",
            color: BLUE,
            borderRadius: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <FaPlus /> Aggiungi veicolo
        </button>
      </div>

      {/* DETTAGLIO VEICOLO SELEZIONATO */}
      {currentVehicle && (
        <div style={{ background: BG_LIGHTER, padding: "20px", borderRadius: "10px" }}>
          <h4 style={{ color: "#fff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCar color={BLUE} /> Dettagli veicolo {currentVehicle.id}
          </h4>

          {/* DATI VEICOLO */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "20px" }}>
            <InputField
              label="Targa *"
              value={currentVehicle.plate}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "plate", v.toUpperCase())}
              required
              placeholder="AA123BB"
            />

            <AutoCompleteField
  label="Marca"
  value={currentVehicle.make}
  onChange={(v) => {
    console.log("🔤 Input marca cambiato:", v);
    // Aggiorna il valore visualizzato
    onUpdateVehicle(currentVehicle.id, "make", v || "");
    
    // Cerca la marca corrispondente nell'array di oggetti
    if (v && v.trim() !== "") {
      // brands è un array di oggetti con id e name
      const selectedBrand = brands.find(b => 
        b.name.toLowerCase() === v.toLowerCase()
      );
      console.log("🔤 Marca selezionata:", selectedBrand);
      
      if (selectedBrand) {
        onUpdateVehicle(currentVehicle.id, "brand_id", selectedBrand.id);
      } else {
        onUpdateVehicle(currentVehicle.id, "brand_id", "");
      }
    } else {
      onUpdateVehicle(currentVehicle.id, "brand_id", "");
    }
  }}
  onSelect={(selectedName) => {
    console.log("🔤 onSelect chiamato con:", selectedName);
    // Non fare nulla qui perché onChange già gestisce
  }}
  suggestions={brands.map(b => b.name)} // Array di stringhe per l'autocompletamento
  disabled={loadingBrands}
  placeholder={loadingBrands ? "Caricamento marche..." : "Seleziona marca"}
/>

            <AutoCompleteField
              label="Modello"
              value={currentVehicle.model}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "model", v)}
              onSelect={(selectedName) => {
                const selectedModel = models.find(m => m.name === selectedName && m.brand_id === currentVehicle.brand_id);
                if (selectedModel) {
                  onUpdateVehicle(currentVehicle.id, "model_id", selectedModel.id);
                }
              }}
              suggestions={filteredModels.map(m => m.name)}
              disabled={!currentVehicle.brand_id || loadingModels}
              placeholder={
                !currentVehicle.brand_id 
                  ? "Prima seleziona marca" 
                  : loadingModels 
                    ? "Caricamento modelli..." 
                    : "Seleziona modello"
              }
            />

            <InputField
              label="Anno"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={currentVehicle.year}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "year", v)}
              placeholder="2024"
            />

            <InputField
              label="Colore"
              value={currentVehicle.color}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "color", v)}
              placeholder="Es. Rosso, Nero, Bianco"
            />
          </div>

          {/* TARIFFE MULTIPLE */}
          <div style={{ marginTop: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h5 style={{ color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEuroSign color={BLUE} /> Tariffe per questo veicolo
              </h5>
              <button
                onClick={() => onAddTariff(currentVehicle.id)}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px dashed #10b981",
                  color: "#10b981",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px"
                }}
              >
                <FaPlus /> Aggiungi tariffa
              </button>
            </div>

            {currentVehicle.tariffs.map((tariff, index) => (
              <div
                key={tariff.id}
                style={{
                  background: "#1a1f25",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  border: "1px solid #333"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", alignItems: "center" }}>
                  <select
                    value={tariff.type}
                    onChange={(e) => onUpdateTariff(currentVehicle.id, tariff.id, "type", e.target.value)}
                    style={{
                      padding: "8px",
                      background: "#2d2d3a",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "13px"
                    }}
                  >
                    {TARIFF_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <InputField
                    label="Descrizione"
                    value={tariff.description}
                    onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "description", v)}
                    placeholder="Es. Sosta oraria"
                  />

                  <InputField
                    label="Prezzo (€)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tariff.price}
                    onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "price", v)}
                    placeholder="0.00"
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "5px", alignItems: "center" }}>
                    <InputField
                      label="Dal"
                      type="date"
                      value={tariff.valid_from}
                      onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "valid_from", v)}
                    />
                    <InputField
                      label="Al"
                      type="date"
                      value={tariff.valid_to}
                      onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "valid_to", v)}
                    />
                    
                    {currentVehicle.tariffs.length > 1 && (
                      <button
                        onClick={() => onRemoveTariff(currentVehicle.id, tariff.id)}
                        style={{
                          marginTop: "18px",
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "5px"
                        }}
                        title="Rimuovi tariffa"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
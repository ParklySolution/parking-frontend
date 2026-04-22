// src/pages/operator/Contracts/components/tabs/VeicoliTab.tsx
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaCar, FaEuroSign, FaTag, FaParking, FaGift } from "react-icons/fa";
import { InputField } from "../ui/InputField";
import { AutoCompleteField } from "../ui/AutoCompleteField";
import type { FormData, Vehicle } from "../../types";
import { BLUE, BG_LIGHTER, TARIFF_TYPES } from "../../constants";
import { supabase } from "@/services/supabase";

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
  showTariffs?: boolean;
  tenantId?: string;
  contractType?: string; // 'subscription', 'wash_fidelity', etc.
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
  loadingModels,
  showTariffs = true,
  tenantId,
  contractType
}) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [colors, setColors] = useState<Array<{ id: string; name: string; value: string }>>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  const [fidelityPrograms, setFidelityPrograms] = useState<Array<{ id: string; name: string; points_per_wash: number; washes_for_free: number }>>([]);

  // 🔍 LOG: Verifica cosa arriva al componente
  console.log("🚗 ===== VEICOLI TAB RENDER =====");
  console.log("🚗 brands ricevuti:", brands);
  console.log("🚗 brands count:", brands?.length || 0);
  console.log("🚗 loadingBrands:", loadingBrands);
  console.log("🚗 modelli ricevuti:", models?.length || 0);
  console.log("🚗 veicoli:", vehicles);
  console.log("🚗 selectedVehicle:", selectedVehicle);
  console.log("🚗 showTariffs:", showTariffs);
  console.log("🚗 tenantId:", tenantId);
  console.log("🚗 contractType:", contractType);

  // Carica le categorie veicolo
  useEffect(() => {
    const loadCategories = async () => {
      if (!tenantId) return;
      
      setLoadingCategories(true);
      try {
        const { data } = await supabase
          .from('vehicle_categories')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        
        console.log("🚗 Categorie caricate:", data);
        setCategories(data || []);
      } catch (error) {
        console.error("❌ Errore caricamento categorie:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, [tenantId]);

  // Carica i colori disponibili
  useEffect(() => {
    const loadColors = async () => {
      if (!tenantId) return;
      
      setLoadingColors(true);
      try {
        const { data } = await supabase
  .from('vehicle_colors')
  .select('id, name, hex')
  .eq('is_active', true)
  .order('name');
        
        console.log("🎨 Colori caricati:", data);
        setColors(data || []);
      } catch (error) {
        console.error("❌ Errore caricamento colori:", error);
      } finally {
        setLoadingColors(false);
      }
    };

    loadColors();
  }, [tenantId]);

  // Carica i programmi fedeltà disponibili (solo per contratti fedeltà)
  useEffect(() => {
    const loadFidelityPrograms = async () => {
      if (!tenantId || contractType !== 'wash_fidelity') return;
      
      try {
        // Prima verifica se la tabella esiste
        const { data: tableCheck } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'fidelity_programs')
          .maybeSingle();
        
        if (!tableCheck) {
          console.log("⚠️ Tabella fidelity_programs non trovata");
          return;
        }
        
        const { data } = await supabase
          .from('fidelity_programs')
          .select('id, name, points_per_wash, washes_for_free')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);
        
        console.log("🎁 Programmi fedeltà:", data);
        setFidelityPrograms(data || []);
      } catch (error) {
        console.error("❌ Errore caricamento programmi fedeltà:", error);
      }
    };

    loadFidelityPrograms();
  }, [tenantId, contractType]);

  // Trova il veicolo selezionato
  const currentVehicle = vehicles.find(v => v.id === selectedVehicle) || vehicles[0];
  
  if (currentVehicle) {
    console.log("🚗 currentVehicle brand_id:", currentVehicle.brand_id);
    console.log("🚗 currentVehicle make:", currentVehicle.make);
    console.log("🚗 currentVehicle category_id:", currentVehicle.category_id);
    console.log("🚗 currentVehicle color_id:", currentVehicle.color_id);
  }

  // Trova il nome della marca selezionata
  const selectedBrandName = currentVehicle?.brand_id
    ? brands.find(b => b.id === currentVehicle.brand_id)?.name || ""
    : currentVehicle?.make || "";

  console.log("🚗 selectedBrandName:", selectedBrandName);

  // Trova il nome della categoria selezionata
  const selectedCategoryName = currentVehicle?.category_id
    ? categories.find(c => c.id === currentVehicle.category_id)?.name || ""
    : currentVehicle?.category_name || "";

  // Trova il nome del colore selezionato
  const selectedColorName = currentVehicle?.color_id
    ? colors.find(c => c.id === currentVehicle.color_id)?.name || ""
    : "";

  // Filtra i modelli per la marca selezionata
  const filteredModels = currentVehicle?.brand_id
    ? models.filter(m => m.brand_id === currentVehicle.brand_id)
    : [];

  console.log("🚗 filteredModels count:", filteredModels.length);
  console.log("🚗 categorie disponibili:", categories.length);
  console.log("🎨 colori disponibili:", colors.length);

  // Se non ci sono veicoli, non mostrare nulla
  if (!vehicles.length) {
    console.log("🚗 Nessun veicolo disponibile");
    return null;
  }

  // Gestione cambio marca con reset modello
  const handleBrandChange = (value: string) => {
    console.log("🔤 Input marca cambiato:", value);
    onUpdateVehicle(currentVehicle.id, "make", value);
    // Resetta brand_id e model quando l'utente digita manualmente
    onUpdateVehicle(currentVehicle.id, "brand_id", "");
    onUpdateVehicle(currentVehicle.id, "model_id", "");
    onUpdateVehicle(currentVehicle.id, "model", "");
  };

  const handleBrandSelect = (selectedBrand: any) => {
    console.log("🔤 Marca selezionata (oggetto):", selectedBrand);
    if (selectedBrand && selectedBrand.id) {
      onUpdateVehicle(currentVehicle.id, "brand_id", selectedBrand.id);
      onUpdateVehicle(currentVehicle.id, "make", selectedBrand.name);
      // Resetta il modello quando cambia marca
      onUpdateVehicle(currentVehicle.id, "model_id", "");
      onUpdateVehicle(currentVehicle.id, "model", "");
    }
  };

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

            {/* CAMPO CATEGORIA - OBBLIGATORIO PER TUTTI */}
            <AutoCompleteField
              label="Categoria *"
              value={selectedCategoryName}
              onChange={(v) => {
                console.log("🔤 Input categoria cambiato:", v);
                onUpdateVehicle(currentVehicle.id, "category_name", v);
                // Resetta category_id quando l'utente digita manualmente
                onUpdateVehicle(currentVehicle.id, "category_id", "");
              }}
              onSelect={(selectedCategory) => {
                console.log("🔤 Categoria selezionata:", selectedCategory);
                if (selectedCategory && selectedCategory.id) {
                  onUpdateVehicle(currentVehicle.id, "category_id", selectedCategory.id);
                  onUpdateVehicle(currentVehicle.id, "category_name", selectedCategory.name);
                }
              }}
              suggestions={categories}
              suggestionKey="name"
              disabled={loadingCategories}
              placeholder={loadingCategories ? "Caricamento categorie..." : "Seleziona categoria"}
            />

            <AutoCompleteField
              label="Marca"
              value={currentVehicle.make || ""}
              onChange={handleBrandChange}
              onSelect={handleBrandSelect}
              suggestions={brands}
              suggestionKey="name"
              disabled={loadingBrands}
              placeholder={loadingBrands ? "Caricamento marche..." : "Seleziona o digita marca"}
              allowCustom={true}
            />

            <AutoCompleteField
              label="Modello"
              value={currentVehicle.model || ""}
              onChange={(v) => {
                console.log("🔤 Input modello cambiato:", v);
                onUpdateVehicle(currentVehicle.id, "model", v);
              }}
              onSelect={(selectedModel) => {
                console.log("🔤 Modello selezionato (oggetto):", selectedModel);
                if (selectedModel && selectedModel.id) {
                  onUpdateVehicle(currentVehicle.id, "model_id", selectedModel.id);
                  onUpdateVehicle(currentVehicle.id, "model", selectedModel.name);
                }
              }}
              suggestions={filteredModels}
              suggestionKey="name"
              disabled={loadingModels}
              placeholder={
                loadingModels 
                  ? "Caricamento modelli..." 
                  : "Seleziona o digita modello"
              }
              allowCustom={true}
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

            {/* CAMPO COLORE - ORA USA ID */}
            <div>
  <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
    Colore
  </label>

  <select
    value={currentVehicle.color_id || ""}
    onChange={(e) => {
      const colorId = e.target.value;
      console.log("🎨 Colore selezionato:", colorId);
      onUpdateVehicle(currentVehicle.id, "color_id", colorId);
    }}
    disabled={loadingColors}
    style={{
      width: "100%",
      padding: "8px",
      background: "#2d2d3a",
      border: "1px solid #333",
      borderRadius: "6px",
      color: "#fff",
      cursor: "pointer"
    }}
  >
    <option value="">Seleziona colore</option>

    {colors.map((color) => (
      <option key={color.id} value={color.id}>
        {color.name}
      </option>
    ))}
  </select>
</div>

          </div>

          {/* OPZIONI CONTRATTUALI */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2, 1fr)", 
            gap: "20px", 
            marginBottom: "20px",
            padding: "15px",
            background: "#1a1f25",
            borderRadius: "8px"
          }}>
            {/* Opzione Parcheggio Incluso (per abbonamenti) */}
            {contractType === 'subscription' && (
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={currentVehicle.has_parking_included || false}
                  onChange={(e) => onUpdateVehicle(currentVehicle.id, "has_parking_included", e.target.checked ? "true" : "false")}
                  style={{ width: "18px", height: "18px" }}
                />
                <span style={{ color: "#fff", display: "flex", alignItems: "center", gap: "5px" }}>
                  <FaParking color={BLUE} />
                  Parcheggio incluso nell'abbonamento
                </span>
              </label>
            )}

            {/* Programma Fedeltà (per wash_fidelity) */}
            {contractType === 'wash_fidelity' && fidelityPrograms.length > 0 && (
              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                  <FaGift color={BLUE} style={{ marginRight: "5px" }} />
                  Programma Fedeltà
                </label>
                <select
                  value={currentVehicle.fidelity_program?.program_id || ""}
                  onChange={(e) => {
                    const program = fidelityPrograms.find(p => p.id === e.target.value);
                    onUpdateVehicle(currentVehicle.id, "fidelity_program", JSON.stringify({
                      program_id: e.target.value,
                      points_per_wash: program?.points_per_wash || 1,
                      washes_for_free: program?.washes_for_free || 10,
                      current_points: 0,
                      free_washes_available: 0
                    }));
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#2d2d3a",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff"
                  }}
                >
                  <option value="">Nessun programma fedeltà</option>
                  {fidelityPrograms.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name} ({program.points_per_wash} punto/lavaggio, {program.washes_for_free} lavaggi = gratis)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* TARIFFE SERVIZI - SEMPRE VISIBILI PER TUTTI */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h5 style={{ color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEuroSign color={BLUE} /> Tariffe servizi (lavaggio, etc.)
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
                <FaPlus /> Aggiungi tariffa servizio
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
                    placeholder="Es. Lavaggio completo"
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

            {currentVehicle.tariffs.length === 0 && (
              <div style={{ 
                textAlign: "center", 
                padding: "20px", 
                background: "#1a1f25", 
                borderRadius: "8px",
                color: "#9ca3af" 
              }}>
                Nessuna tariffa servizio aggiunta. I prezzi verranno presi dal listino predefinito.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
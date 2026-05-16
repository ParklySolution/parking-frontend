// src/pages/operator/Contracts/components/tabs/VeicoliTab.tsx - VERSIONE COMPLETA CON SELECT SEMPLICI
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaCar, FaEuroSign, FaTag, FaParking, FaGift } from "react-icons/fa";
import { InputField } from "../ui/InputField";
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
  models: Array<{ id: string; name: string; brand_id: string; category_id?: string }>;
  loadingBrands?: boolean;
  loadingModels?: boolean;
  showTariffs?: boolean;
  tenantId?: string;
  contractType?: string;
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
        
        setColors(data || []);
      } catch (error) {
        console.error("❌ Errore caricamento colori:", error);
      } finally {
        setLoadingColors(false);
      }
    };

    loadColors();
  }, [tenantId]);

  // Carica i programmi fedeltà disponibili
  useEffect(() => {
    const loadFidelityPrograms = async () => {
      if (!tenantId || contractType !== 'wash_fidelity') return;
      
      try {
        const { data } = await supabase
          .from('fidelity_programs')
          .select('id, name, points_per_wash, washes_for_free')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);
        
        setFidelityPrograms(data || []);
      } catch (error) {
        console.error("❌ Errore caricamento programmi fedeltà:", error);
      }
    };

    loadFidelityPrograms();
  }, [tenantId, contractType]);

  const currentVehicle = vehicles.find(v => v.id === selectedVehicle) || vehicles[0];
  
  // Filtra i modelli per la marca selezionata
  const filteredModels = currentVehicle?.brand_id
    ? models.filter(m => m.brand_id === currentVehicle.brand_id)
    : [];

  if (!vehicles.length) return null;

  // Gestione cambio marca
  const handleBrandChange = (brandId: string) => {
    const selectedBrand = brands.find(b => b.id === brandId);
    console.log("🔤 Marca selezionata:", selectedBrand);
    
    if (selectedBrand) {
      onUpdateVehicle(currentVehicle.id, "brand_id", brandId);
      onUpdateVehicle(currentVehicle.id, "make", selectedBrand.name);
      // Resetta modello quando cambia marca
      onUpdateVehicle(currentVehicle.id, "model_id", "");
      onUpdateVehicle(currentVehicle.id, "model", "");
    } else {
      // Se viene selezionata l'opzione vuota
      onUpdateVehicle(currentVehicle.id, "brand_id", "");
      onUpdateVehicle(currentVehicle.id, "make", "");
      onUpdateVehicle(currentVehicle.id, "model_id", "");
      onUpdateVehicle(currentVehicle.id, "model", "");
    }
  };

  // Gestione cambio modello
  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find(m => m.id === modelId);
    console.log("🔤 Modello selezionato:", selectedModel);
    
    if (selectedModel) {
      onUpdateVehicle(currentVehicle.id, "model_id", modelId);
      onUpdateVehicle(currentVehicle.id, "model", selectedModel.name);
      
      // Se il modello ha una categoria associata, aggiornala automaticamente
      if (selectedModel.category_id) {
        const category = categories.find(c => c.id === selectedModel.category_id);
        if (category) {
          onUpdateVehicle(currentVehicle.id, "category_id", selectedModel.category_id);
          onUpdateVehicle(currentVehicle.id, "category_name", category.name);
          console.log(`✅ Categoria automatica: ${category.name}`);
        }
      }
    } else {
      onUpdateVehicle(currentVehicle.id, "model_id", "");
      onUpdateVehicle(currentVehicle.id, "model", "");
    }
  };

  // Gestione cambio categoria
  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = categories.find(c => c.id === categoryId);
    console.log("🔤 Categoria selezionata:", selectedCategory);
    
    if (selectedCategory) {
      onUpdateVehicle(currentVehicle.id, "category_id", categoryId);
      onUpdateVehicle(currentVehicle.id, "category_name", selectedCategory.name);
    } else {
      onUpdateVehicle(currentVehicle.id, "category_id", "");
      onUpdateVehicle(currentVehicle.id, "category_name", "");
    }
  };

  // Gestione cambio colore
  const handleColorChange = (colorId: string) => {
    const selectedColor = colors.find(c => c.id === colorId);
    console.log("🎨 Colore selezionato:", selectedColor);
    
    if (selectedColor) {
      onUpdateVehicle(currentVehicle.id, "color_id", colorId);
      onUpdateVehicle(currentVehicle.id, "color", selectedColor.name);
    } else {
      onUpdateVehicle(currentVehicle.id, "color_id", "");
      onUpdateVehicle(currentVehicle.id, "color", "");
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
              gap: "8px"
            }}
          >
            <FaCar size={14} />
            <span>Veicolo {vehicle.id}</span>
            {vehicle.plate && <span style={{ fontSize: "12px", opacity: 0.8 }}>({vehicle.plate})</span>}
            
            {/* VISUALIZZAZIONE PREZZO CANONE MENSILE */}
            {vehicle.monthly_price && vehicle.monthly_price !== "" && (
              <span style={{ 
                fontSize: "11px", 
                background: selectedVehicle === vehicle.id ? "rgba(255,255,255,0.2)" : "rgba(79,140,255,0.2)", 
                padding: "2px 8px", 
                borderRadius: "20px",
                marginLeft: "5px",
                fontWeight: 500
              }}>
                €{vehicle.monthly_price}/mese
              </span>
            )}
            
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "20px" }}>
            {/* TARGA */}
            <InputField
              label="Targa *"
              value={currentVehicle.plate}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "plate", v.toUpperCase())}
              required
              placeholder="AA123BB"
            />

            {/* CATEGORIA - SELECT */}
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Categoria *
              </label>
              <select
                value={currentVehicle.category_id || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={loadingCategories}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#2d2d3a",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <option value="">Seleziona categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {loadingCategories && <span style={{ fontSize: "11px", color: "#9ca3af" }}>Caricamento categorie...</span>}
            </div>

            {/* MARCA - SELECT */}
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Marca
              </label>
              <select
                value={currentVehicle.brand_id || ""}
                onChange={(e) => handleBrandChange(e.target.value)}
                disabled={loadingBrands}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#2d2d3a",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <option value="">Seleziona marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {loadingBrands && <span style={{ fontSize: "11px", color: "#9ca3af" }}>Caricamento marche...</span>}
            </div>

            {/* MODELLO - SELECT (dipende dalla marca) */}
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Modello
              </label>
              <select
                value={currentVehicle.model_id || ""}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!currentVehicle.brand_id || loadingModels}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: !currentVehicle.brand_id ? "#1a1f25" : "#2d2d3a",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: currentVehicle.brand_id ? "pointer" : "not-allowed",
                  opacity: currentVehicle.brand_id ? 1 : 0.6
                }}
              >
                <option value="">
                  {!currentVehicle.brand_id ? "Prima seleziona una marca" : "Seleziona modello"}
                </option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {loadingModels && <span style={{ fontSize: "11px", color: "#9ca3af" }}>Caricamento modelli...</span>}
            </div>

            {/* ANNO */}
            <InputField
              label="Anno"
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={currentVehicle.year}
              onChange={(v) => onUpdateVehicle(currentVehicle.id, "year", v)}
              placeholder="2024"
            />

            {/* COLORE - SELECT */}
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                Colore
              </label>
              <select
                value={currentVehicle.color_id || ""}
                onChange={(e) => handleColorChange(e.target.value)}
                disabled={loadingColors}
                style={{
                  width: "100%",
                  padding: "10px",
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
              {loadingColors && <span style={{ fontSize: "11px", color: "#9ca3af" }}>Caricamento colori...</span>}
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

            {/* PREZZO CANONE MENSILE */}
            {contractType === 'subscription' && (
              <div>
                <label style={{ display: "block", marginBottom: "5px", color: "#9ca3af" }}>
                  <FaEuroSign color={BLUE} style={{ marginRight: "5px" }} />
                  Prezzo Canone Mensile (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentVehicle.monthly_price || ""}
                  onChange={(e) => onUpdateVehicle(currentVehicle.id, "monthly_price", e.target.value)}
                  placeholder="Es. 50.00"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1a1f25",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
                <small style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  Importo mensile che il cliente pagherà per questo veicolo
                </small>
              </div>
            )}

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
                      {program.name} ({program.points_per_wash} pt/lavaggio, {program.washes_for_free} lavaggi = gratis)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* TARIFFE SERVIZI */}
          <div style={{ marginTop: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h5 style={{ color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <FaEuroSign color={BLUE} /> Tariffe servizi
              </h5>
              <button
                onClick={() => onAddTariff(currentVehicle.id)}
                style={{
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px dashed #10b981",
                  color: "#10b981",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                <FaPlus /> Aggiungi tariffa
              </button>
            </div>

            {currentVehicle.tariffs.map((tariff) => (
              <div key={tariff.id} style={{ background: "#1a1f25", padding: "15px", borderRadius: "8px", marginBottom: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", alignItems: "center" }}>
                  <select
                    value={tariff.type}
                    onChange={(e) => onUpdateTariff(currentVehicle.id, tariff.id, "type", e.target.value)}
                    style={{ padding: "8px", background: "#2d2d3a", border: "1px solid #333", borderRadius: "6px", color: "#fff" }}
                  >
                    {TARIFF_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <InputField
                    label="Descrizione"
                    value={tariff.description}
                    onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "description", v)}
                  />

                  <InputField
                    label="Prezzo (€)"
                    type="number"
                    value={tariff.price}
                    onChange={(v) => onUpdateTariff(currentVehicle.id, tariff.id, "price", v)}
                  />

                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
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
                      <button onClick={() => onRemoveTariff(currentVehicle.id, tariff.id)} style={{ marginTop: "18px", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
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
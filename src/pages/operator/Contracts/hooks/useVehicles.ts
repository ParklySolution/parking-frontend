// src/pages/operator/Contracts/hooks/useVehicles.ts
// FORCE REFRESH - 02/03/2026 - 16:30
import { useState, useEffect } from "react";
import type { Vehicle } from "../types";
import type { Tariff } from "../types";
import { fetchVehicleBrands } from "@/services/vehicleBrandService";
import type { VehicleBrand } from "@/services/vehicleBrandService";
import { fetchVehicleModels } from "@/services/vehicleModelService";
import type { VehicleModel } from "@/services/vehicleModelService";

console.log("Tariff type exists:", typeof Tariff); // Questo mostrerà se Tariff è definito

export function useVehicles(tenantId: string | undefined) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: 1,
      plate: "",
      make: "",
      model: "",
      model_id: "",
      brand_id: "",
      category_id: "",
      year: "",
      color: "",
      color_id: "",
      tariffs: [
        {
          id: 1,
          type: "sosta",
          description: "",
          price: "",
          valid_from: "",
          valid_to: ""
        }
      ]
    }
  ]);

  const [selectedVehicle, setSelectedVehicle] = useState(1);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Carica marche all'avvio
  useEffect(() => {
    if (tenantId) {
      loadBrands();
    }
  }, [tenantId]);

  const loadBrands = async () => {
    if (!tenantId) return;
    setLoadingBrands(true);
    try {
      const data = await fetchVehicleBrands(tenantId);
      console.log("📦 Marche ricevute in useVehicles:", data);  // <-- AGGIUNGI QUESTO
      setBrands(data);
    } catch (error) {
      console.error("Errore caricamento marche:", error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const loadModelsForBrand = async (brandId: string) => {
    if (!brandId || !tenantId) return;
    setLoadingModels(true);
    try {
      const allModels = await fetchVehicleModels(tenantId);
      const filtered = allModels.filter(m => m.brand_id === brandId);
      setModels(filtered);
    } catch (error) {
      console.error("Errore caricamento modelli:", error);
    } finally {
      setLoadingModels(false);
    }
  };

  const addVehicle = () => {
    setVehicles([
      ...vehicles,
      {
        id: vehicles.length + 1,
        plate: "",
        make: "",
        model: "",
        model_id: "",
        brand_id: "",
        category_id: "",
        year: "",
        color: "",
        color_id: "",
        tariffs: [
          {
            id: 1,
            type: "sosta",
            description: "",
            price: "",
            valid_from: "",
            valid_to: ""
          }
        ]
      }
    ]);
  };

  const removeVehicle = (vehicleId: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      if (selectedVehicle === vehicleId) {
        setSelectedVehicle(vehicles[0].id);
      }
    }
  };

  const updateVehicle = (vehicleId: number, field: string, value: string) => {
  setVehicles(prev =>
    prev.map(v => {
      if (v.id !== vehicleId) return v;

      const updated = { ...v, [field]: value };

      // Se cambia la marca
      if (field === "brand_id" && value) {
        updated.model = "";
        updated.model_id = "";
        updated.category_id = "";

        loadModelsForBrand(value);

        const selectedBrand = brands.find(b => b.id === value);
        updated.make = selectedBrand?.name || "";
      }

      // Se cambia il modello
      if (field === "model_id" && value) {
        const selectedModel = models.find(m => m.id === value);
        if (selectedModel) {
          updated.model = selectedModel.name;
          updated.category_id = selectedModel.category_id;
        }
      }

      return updated;
    })
  );
};


  const addTariff = (vehicleId: number) => {
    setVehicles(vehicles.map(v => 
      v.id === vehicleId 
        ? { 
            ...v, 
            tariffs: [
              ...v.tariffs,
              {
                id: v.tariffs.length + 1,
                type: "sosta",
                description: "",
                price: "",
                valid_from: "",
                valid_to: ""
              }
            ]
          }
        : v
    ));
  };

  const removeTariff = (vehicleId: number, tariffId: number) => {
    setVehicles(vehicles.map(v => 
      v.id === vehicleId && v.tariffs.length > 1
        ? { ...v, tariffs: v.tariffs.filter(t => t.id !== tariffId) }
        : v
    ));
  };

  const updateTariff = (vehicleId: number, tariffId: number, field: string, value: string) => {
    setVehicles(vehicles.map(v => 
      v.id === vehicleId 
        ? {
            ...v,
            tariffs: v.tariffs.map(t =>
              t.id === tariffId ? { ...t, [field]: value } : t
            )
          }
        : v
    ));
  };

  const resetVehicles = () => {
    setVehicles([
      {
        id: 1,
        plate: "",
        make: "",
        model: "",
        model_id: "",
        brand_id: "",
        category_id: "",
        year: "",
        color: "",
        color_id: "",
        tariffs: [
          {
            id: 1,
            type: "sosta",
            description: "",
            price: "",
            valid_from: "",
            valid_to: ""
          }
        ]
      }
    ]);
    setSelectedVehicle(1);
  };

  return {
    vehicles,
    selectedVehicle,
    setSelectedVehicle,
    brands,
    models,
    loadingBrands,
    loadingModels,
    addVehicle,
    removeVehicle,
    updateVehicle,
    addTariff,
    removeTariff,
    updateTariff,
    resetVehicles,
    refreshBrands: loadBrands
  };
}
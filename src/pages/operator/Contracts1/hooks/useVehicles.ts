import { Vehicle, Tariff } from "../types";

export function useVehicles(tenantId: string | undefined) {
  console.log("useVehicles chiamato con tenantId:", tenantId);
  return {
    vehicles: [],
    selectedVehicle: 1,
    setSelectedVehicle: () => {},
    brands: [],
    models: [],
    loadingBrands: false,
    loadingModels: false,
    addVehicle: () => {},
    removeVehicle: () => {},
    updateVehicle: () => {},
    addTariff: () => {},
    removeTariff: () => {},
    updateTariff: () => {},
    resetVehicles: () => {},
    refreshBrands: () => {}
  };
}
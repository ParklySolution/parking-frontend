// src/services/pricingEngineShim.ts
// FILE TEMPORANEO PER COMPATIBILITÀ CON VECCHI IMPORT

import { getAvailableWashServices } from "./washService";
import { getTariffaBase, calculateBaseTariff as calcBase } from "./pricingService";
import { calculatePriceWithWashBonus } from "./pricing/pricingEngine";

// Re-export per compatibilità con le vecchie importazioni
export const getAvailableWashServices = getAvailableWashServices;
export const calculatePriceWithWashBonus = calculatePriceWithWashBonus;
export const getTariffaCompleta = getTariffaBase;

// Mantieni il vecchio nome per compatibilità
export const calculateBaseTariff = async (tenantId: string, categoryId: string) => {
  const tariffa = await getTariffaBase(tenantId, categoryId);
  if (!tariffa) return null;
  
  return {
    firstHour: tariffa.first_hour,
    hourly: tariffa.next_hours || tariffa.hourly,
    dailyCap: undefined
  };
};
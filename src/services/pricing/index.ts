// src/services/pricing/index.ts

// Esporta i tipi
export * from './types';

// Esporta il motore principale
export { calculateParkingAmountV2, calculateParkingAmount } from './engine';

// Esporta il loader (utile per debugging)
export { loadPriceRules } from './loader';

// Esporta le funzioni di segmentazione (utile per test)
export { segmentParking, isNightHour } from './rules/segmenter';

// ======================================================
// NOTA: Le vecchie funzioni sono state spostate in legacy/
// e verranno gradualmente deprecate
// ======================================================

/**
 * Versione legacy per retrocompatibilità
 * @deprecated Usa calculateParkingAmountV2
 */
export { calculateParkingAmountLegacy } from './legacy/compat';
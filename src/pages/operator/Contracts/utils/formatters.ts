// src/pages/operator/Contracts/utils/formatters.ts

/**
 * Formatta una data in formato italiano (DD/MM/YYYY)
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('it-IT');
  } catch {
    return dateString;
  }
};

/**
 * Formatta un numero come valuta Euro
 */
export const formatCurrency = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num);
};

/**
 * Normalizza una targa (rimuove spazi, uppercase)
 */
export const normalizePlate = (plate: string): string => {
  return plate.replace(/\s+/g, '').toUpperCase();
};

/**
 * Genera un numero contratto univoco
 */
export const generateContractNumber = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`;
  const timePart = `${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
  return `CONTR-${datePart}-${timePart}`;
};

/**
 * Calcola data di scadenza da durata in mesi
 */
export const calculateExpiryDate = (durationMonths: string | number): string => {
  if (!durationMonths) return '';
  const months = typeof durationMonths === 'string' ? parseInt(durationMonths) : durationMonths;
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};
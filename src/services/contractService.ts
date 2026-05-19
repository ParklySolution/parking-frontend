// src/services/contractService.ts
import { supabase } from './supabase';

export interface ContractRenewResult {
  success: boolean;
  old_valid_to?: string;
  new_valid_to?: string;
  renewal_count?: number;
  error?: string;
}

export interface ContractActionResult {
  success: boolean;
  status?: string;
  error?: string;
}

/**
 * Rinnova un contratto aggiungendo mesi
 */
export const renewContract = async (
  contractId: string,
  additionalMonths: number = 12
): Promise<ContractRenewResult> => {
  try {
    const { data, error } = await supabase.rpc('renew_contract', {
      p_contract_id: contractId,
      p_additional_months: additionalMonths
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Errore rinnovo contratto:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sospende un contratto
 */
export const suspendContract = async (contractId: string): Promise<ContractActionResult> => {
  try {
    const { data, error } = await supabase.rpc('suspend_contract', {
      p_contract_id: contractId
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Errore sospensione contratto:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Riattiva un contratto sospeso
 */
export const reactivateContract = async (contractId: string): Promise<ContractActionResult> => {
  try {
    const { data, error } = await supabase.rpc('reactivate_contract', {
      p_contract_id: contractId
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Errore riattivazione contratto:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Disdice (cancella) un contratto
 */
export const cancelContract = async (contractId: string): Promise<ContractActionResult> => {
  try {
    const { data, error } = await supabase.rpc('cancel_contract', {
      p_contract_id: contractId
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Errore disdetta contratto:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ottiene lo stato di un contratto
 */
export const getContractStatus = async (contractId: string) => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('id, status, valid_from, valid_to, renewal_count, suspended_at, cancelled_at')
      .eq('id', contractId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Errore recupero stato contratto:', error);
    return null;
  }
};
// src/services/exitButtonService.ts
import { supabase } from "./supabase";

export interface ExitButton {
  id: string;
  tenant_id: string;
  label: string;
  amount: number;
  color: string;
  button_type: 'fixed' | 'overnight' | 'hourly' | 'discount';  // NUOVO CAMPO
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Recupera i pulsanti attivi per un tenant
 */
export async function getExitButtons(tenantId: string): Promise<ExitButton[]> {
  console.log("🔍 Caricamento pulsanti exit per tenant:", tenantId);
  
  const { data, error } = await supabase
    .from('exit_buttons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ Errore caricamento pulsanti:', error);
    return [];
  }

  console.log(`✅ Trovati ${data?.length || 0} pulsanti`);
  return data || [];
}

/**
 * Recupera TUTTI i pulsanti (anche inattivi) per la configurazione
 */
export async function getAllExitButtons(tenantId: string): Promise<ExitButton[]> {
  const { data, error } = await supabase
    .from('exit_buttons')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ Errore caricamento pulsanti:', error);
    return [];
  }

  return data || [];
}

/**
 * Crea o aggiorna un pulsante
 */
export async function upsertExitButton(
  tenantId: string,
  button: Partial<ExitButton>
): Promise<ExitButton | null> {
  try {
    console.log("💾 Salvataggio pulsante:", button);

    // Valori di default
    const buttonToSave = {
      tenant_id: tenantId,
      button_type: 'fixed', // Default
      ...button,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('exit_buttons')
      .upsert(buttonToSave)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Pulsante salvato:", data);
    return data;

  } catch (error) {
    console.error('❌ Errore salvataggio pulsante:', error);
    throw error;
  }
}

/**
 * Elimina un pulsante
 */
export async function deleteExitButton(id: string): Promise<void> {
  console.log("🗑️ Eliminazione pulsante:", id);
  
  const { error } = await supabase
    .from('exit_buttons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ Errore eliminazione pulsante:', error);
    throw error;
  }

  console.log("✅ Pulsante eliminato");
}

/**
 * Aggiorna l'ordine dei pulsanti
 */
export async function reorderExitButtons(
  buttons: { id: string; sort_order: number }[]
): Promise<void> {
  console.log("🔄 Riorganizzazione pulsanti");
  
  for (const btn of buttons) {
    const { error } = await supabase
      .from('exit_buttons')
      .update({ sort_order: btn.sort_order })
      .eq('id', btn.id);

    if (error) {
      console.error('❌ Errore riordino pulsanti:', error);
      throw error;
    }
  }

  console.log("✅ Pulsanti riordinati");
}

/**
 * Attiva/disattiva un pulsante
 */
export async function toggleExitButton(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('exit_buttons')
    .update({ is_active })
    .eq('id', id);

  if (error) throw error;
}
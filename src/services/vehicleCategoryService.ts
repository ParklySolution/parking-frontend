// src/services/vehicleCategoryService.ts
import { supabase } from "./supabase";

export interface VehicleCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

/* LISTA */
export async function getVehicleCategories(tenantId: string) {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (error) throw error;
  return data as VehicleCategory[];
}

/* CREATE */
export async function createVehicleCategory(
  tenantId: string,
  name: string
) {
  const { error } = await supabase
    .from("vehicle_categories")
    .insert({
      tenant_id: tenantId,
      name,
      is_active: true,
    });

  if (error) throw error;
}

/* UPDATE */
export async function updateVehicleCategory(
  id: string,
  name: string
) {
  const { error } = await supabase
    .from("vehicle_categories")
    .update({ name })
    .eq("id", id);

  if (error) throw error;
}

/* TOGGLE ATTIVO */
export async function toggleVehicleCategory(
  id: string,
  isActive: boolean
) {
  const { error } = await supabase
    .from("vehicle_categories")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}

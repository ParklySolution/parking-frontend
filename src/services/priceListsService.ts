import { supabase } from "@/services/supabase";

export interface PriceList {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

/* ======================================================
   FETCH LISTINI
   ====================================================== */
export async function fetchPriceLists(tenantId: string) {
  const { data, error } = await supabase
    .from("price_lists")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PriceList[];
}

/* ======================================================
   CREA LISTINO
   ====================================================== */
export async function createPriceList(
  tenantId: string,
  name: string,
  description?: string
) {
  const { error } = await supabase.from("price_lists").insert({
    tenant_id: tenantId,
    name,
    description: description ?? null,
    is_active: false, // i listini nuovi partono disattivi
  });

  if (error) throw error;
}

/* ======================================================
   ATTIVA LISTINO (solo uno attivo per tenant)
   ====================================================== */
export async function activatePriceList(
  tenantId: string,
  priceListId: string
) {
  // 1️⃣ Disattiva tutti i listini del tenant
  const disableAll = await supabase
    .from("price_lists")
    .update({ is_active: false })
    .eq("tenant_id", tenantId);

  if (disableAll.error) throw disableAll.error;

  // 2️⃣ Attiva quello selezionato
  const { error } = await supabase
    .from("price_lists")
    .update({ is_active: true })
    .eq("id", priceListId)
    .eq("tenant_id", tenantId); // ⭐ NECESSARIO PER RLS

  if (error) throw error;
}

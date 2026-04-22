import { supabase } from "@/services/supabase";
import type { PriceRules } from "./PricingEngineV2";

export async function loadPriceRules(
  tenantId: string,
  categoryId: string
): Promise<PriceRules> {
  const { data, error } = await supabase
    .from("price_rules")
    .select("rule_type, value, first_hour_price, next_hours_price")
    .eq("tenant_id", tenantId)
    .eq("category_id", categoryId)
    .eq("is_active", true);

  if (error || !data) return {};

  const rules: PriceRules = {};

  for (const r of data) {
    if (r.rule_type === "first_hour") rules.first_hour = Number(r.first_hour_price);
    if (r.rule_type === "next_hours") rules.next_hours = Number(r.next_hours_price);
    if (r.rule_type === "hourly") rules.hourly = Number(r.value);
    if (r.rule_type === "daily_cap") rules.daily_cap = Number(r.value);
  }

  return rules;
}

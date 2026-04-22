import { loadPriceRules } from "./PriceRulesLoader";
import { calculateParkingPriceV2 } from "./PricingEngineV2";
import { fetchParkingTolerance } from "@/services/ToleranceService";

export async function calculateFinalPrice({
  tenantId,
  categoryId,
  realMinutes,
}: {
  tenantId: string;
  categoryId: string;
  realMinutes: number;
}) {
  const tolerance = await fetchParkingTolerance(tenantId);
  const rules = await loadPriceRules(tenantId, categoryId);

  if (!tolerance || !rules) {
    return {
      totalPrice: 0,
      error: "Tariffe o tolleranze mancanti",
    };
  }

  return calculateParkingPriceV2(realMinutes, tolerance, rules);
}

// src/services/washService.ts
import { supabase } from "./supabase";
import type { WashServicePriceUI } from "@/types/vehicleProfile";

/**
 * RECUPERA I SERVIZI LAVAGGIO DISPONIBILI PER UNA CATEGORIA
 * Usa gli ID di wash_service (quelli corretti per la RPC)
 */
export async function getAvailableWashServices(
  tenantId: string,
  vehicleCategoryId: string
): Promise<WashServicePriceUI[]> {
  console.log("🔍 getAvailableWashServices chiamata con:", { tenantId, vehicleCategoryId });
  
  try {
    // 1️⃣ Recupera i prezzi (contengono wash_service_id)
    const { data: prices, error: pricesError } = await supabase
      .from("wash_service_prices")
      .select("id, price, duration_minutes, fidelity_points, wash_service_id")
      .eq("tenant_id", tenantId)
      .eq("vehicle_category_id", vehicleCategoryId);

    if (pricesError) throw pricesError;
    if (!prices || prices.length === 0) return [];

    const serviceIds = prices.map(p => p.wash_service_id);

    // 2️⃣ Recupera i servizi dalla tabella corretta: wash_service_catalog
const { data: services, error: servicesError } = await supabase
  .from("wash_service_catalog")   // ✅ CORRETTO
  .select("id, name, code, description")
  .in("id", serviceIds)
  .eq("tenant_id", tenantId)
  .eq("is_active", true);

if (servicesError) throw servicesError;

const servicesMap = new Map(services?.map(s => [s.id, s]));


    // 3️⃣ Combina prezzi + dettagli servizio
    return prices.map(price => {
      const svc = servicesMap.get(price.wash_service_id);

      console.log("📦 Creazione servizio UI:", {
        id: price.id,
        washServiceId: price.wash_service_id,
        name: svc?.name
      });

      return {
        id: price.id,
        washServiceId: price.wash_service_id, // ⭐ PROPRIETÀ CORRETTA
        vehicleCategoryId,
        vehicleCategoryName: "",
        price: Number(price.price),
        durationMinutes: price.duration_minutes,
        fidelityPoints: price.fidelity_points,
        serviceName: svc?.name || "Servizio",
        serviceCode: svc?.code || "",
        serviceDescription: svc?.description || "",
      };
    });

  } catch (error) {
    console.error("❌ Errore in getAvailableWashServices:", error);
    return [];
  }
}

/**
 * CALCOLA IL TOTALE DEI SERVIZI LAVAGGIO
 */
export function calculateWashTotal(
  washServices: Array<{ washServiceId: string }>,
  availableServices: WashServicePriceUI[]
): number {
  let total = 0;
  washServices.forEach(ws => {
    const service = availableServices.find(s => s.washServiceId === ws.washServiceId);
    if (service) total += service.price;
  });
  return total;
}
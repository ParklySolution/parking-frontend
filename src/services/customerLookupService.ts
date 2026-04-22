// services/customerLookupService.ts

import { supabase } from "./supabase";

export interface CustomerLookupResult {
  status: "idle" | "loading" | "found" | "not_found" | "error";
  message?: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    fiscal_code?: string;
  };
  vehicle?: {
    id: string;
    plate: string;
    brand?: string;
    model?: string;
    color?: string;
    category?: {
      id: string;
      name: string;
    };
    is_active: boolean;
  };
  outstandings: {
    count: number;
    total: number;
  };
  contracts?: {
    subscription?: {
      id: string;
      contract_number: string;
      valid_from: string;
      valid_to: string;
      status: string;
      subscription_type?: string;
      is_active?: boolean;
    };
    fidelity?: {
      id: string;
      contract_number: string;
      valid_from: string;
      valid_to: string;
      points: number;
      washes_count: number;
      free_washes_available: number;
    };
    conventions?: Array<{
      id: string;
      contract_number: string;
      template_name: string;
      valid_from: string;
      valid_to: string | null;
    }>;
  };
}

export async function lookupCustomerByPlate(plate: string): Promise<CustomerLookupResult> {
  console.log("🔍 lookupCustomerByPlate chiamato con targa:", plate);

  const normalizedPlate = plate.trim().toUpperCase();

  try {
    // 1. CERCA IL VEICOLO
    const { data: customerVehicle, error: cvError } = await supabase
      .from("customer_vehicles")
      .select(`
        id,
        plate,
        brand,
        model,
        color,
        is_active,
        customer_id,
        tenant_id,
        category_id,
        vehicle_categories!category_id (
          id,
          name
        )
      `)
      .ilike("plate", normalizedPlate)
      .maybeSingle();

    if (cvError) {
      console.error("❌ Errore ricerca customer_vehicles:", cvError);
      return {
        status: "error",
        message: cvError.message,
        outstandings: { count: 0, total: 0 },
      };
    }

    if (!customerVehicle) {
      console.log("❌ Veicolo non trovato per targa:", normalizedPlate);
      return {
        status: "not_found",
        outstandings: { count: 0, total: 0 },
      };
    }

    console.log("✅ Veicolo trovato in customer_vehicles:", customerVehicle);

    // 2. DATI VEICOLO
    const vehicleData = {
      id: customerVehicle.id,
      plate: customerVehicle.plate,
      brand: customerVehicle.brand,
      model: customerVehicle.model,
      color: customerVehicle.color,
      category: customerVehicle.vehicle_categories
        ? {
            id: customerVehicle.vehicle_categories.id,
            name: customerVehicle.vehicle_categories.name,
          }
        : undefined,
      is_active: customerVehicle.is_active ?? true,
    };

    console.log("🚗 Dati veicolo completi:", vehicleData);

    // 3. DATI CLIENTE
    let customer = null;
    if (customerVehicle.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, first_name, last_name, email, phone, fiscal_code")
        .eq("id", customerVehicle.customer_id)
        .maybeSingle();

      if (!customerError && customerData) {
        customer = {
          id: customerData.id,
          name:
            `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim() ||
            "Cliente",
          email: customerData.email,
          phone: customerData.phone,
          fiscal_code: customerData.fiscal_code,
        };
        console.log("✅ Cliente trovato:", customer);
      }
    }

    // 4. INSOLUTI
    let outstandings = { count: 0, total: 0 };
    if (customer) {
      const { data: outstandingData, error: outError } = await supabase
        .from("outstanding_payments")
        .select("amount")
        .eq("customer_id", customer.id)
        .eq("status", "open")
        .is("closed_at", null);

      if (!outError && outstandingData?.length > 0) {
        const total = outstandingData.reduce((sum, o) => sum + (o.amount || 0), 0);
        outstandings = {
          count: outstandingData.length,
          total,
        };
        console.log("💰 Insoluti trovati:", outstandings);
      }
    }

    // 5. CONTRATTI (ABBONAMENTO, FEDELTÀ, CONVENZIONI)
    let contracts: any = {};

    // ⭐ ABBONAMENTO
    if (customer) {
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("id, contract_id, start_date, end_date, is_active, subscription_type")
        .eq("customer_id", customer.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!subError && subscription) {
        contracts.subscription = {
          id: subscription.id,
          contract_number: subscription.contract_id,
          valid_from: subscription.start_date,
          valid_to: subscription.end_date,
          status: subscription.is_active ? "active" : "inactive",

          // ⭐ CAMPI NECESSARI AL PRICING ENGINE
          subscription_type: subscription.subscription_type,
          is_active: subscription.is_active,
        };

        console.log("🎫 Abbonamento trovato:", JSON.stringify(subscription, null, 2));
      }
    }

    // ⭐ FEDELTÀ
    if (customer) {
      const { data: fidelity, error: fidError } = await supabase
        .from("customer_fidelity")
        .select("id, points, washes_count, free_washes_available, fidelity_program_id")
        .eq("customer_id", customer.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!fidError && fidelity) {
        const { data: program } = await supabase
          .from("fidelity_programs")
          .select("id, name, contract_id")
          .eq("id", fidelity.fidelity_program_id)
          .maybeSingle();

        contracts.fidelity = {
          id: fidelity.id,
          contract_number: program?.contract_id || `FID-${fidelity.id.slice(0, 8)}`,
          valid_from: new Date().toISOString(),
          valid_to: null,
          points: fidelity.points || 0,
          washes_count: fidelity.washes_count || 0,
          free_washes_available: fidelity.free_washes_available || 0,
        };

        console.log("⭐ Fedeltà trovata:", fidelity);
      }
    }

    // ⭐ CONVENZIONI
    if (customer) {
      try {
        const { data: conventions, error: convError } = await supabase
          .from("customer_conventions")
          .select(`
            id,
            contract_number,
            valid_from,
            valid_to,
            convention_templates (
              id,
              name
            )
          `)
          .eq("customer_id", customer.id)
          .eq("is_active", true)
          .gte("valid_to", new Date().toISOString());

        if (!convError && conventions?.length > 0) {
          contracts.conventions = conventions.map((c) => ({
            id: c.id,
            contract_number: c.contract_number,
            template_name: c.convention_templates?.name || "Convenzione",
            valid_from: c.valid_from,
            valid_to: c.valid_to,
          }));

          console.log("📜 Convenzioni trovate:", conventions.length);
        }
      } catch (convError) {
        console.log("ℹ️ Tabella customer_conventions non trovata:", convError);
      }
    }

    // 6. RISULTATO FINALE
    const result: CustomerLookupResult = {
      status: "found",
      customer: customer || undefined,
      vehicle: vehicleData,
      outstandings,
      contracts: Object.keys(contracts).length > 0 ? contracts : undefined,
    };

    console.log("✅ Risultato lookup finale:", result);
    return result;
  } catch (error) {
    console.error("❌ Errore in lookupCustomerByPlate:", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Errore sconosciuto",
      outstandings: { count: 0, total: 0 },
    };
  }
}

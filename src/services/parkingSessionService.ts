// src/services/parkingSessionService.ts
import { supabase } from "@/services/supabase";
import type {
  WashServiceSelection,
  ParkingSessionWashService,
  WashStatus
} from "@/types/vehicleProfile";

export interface CreateParkingSessionEntryParams {
  tenantId: string;
  categoryId: string;
  plate: string;
  brandName?: string | null;
  modelName?: string | null;
  categoryName?: string | null;
  color?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  conventionId?: string | null;
  priceListId?: string | null;
  vehicleProfileId?: string | null;
  washServices?: WashServiceSelection[];
  calculatedAmount?: number;
  notes?: string | null;
}

export interface CreateParkingSessionResult {
  success: boolean;
  session?: {
    id: string;
    ticket_number: number;
    entry_time: string;
  };
  error?: string;
  detail?: string;
}

/**
 * Crea una nuova sessione di parcheggio (ingresso)
 * Questa è la funzione UNICA e DEFINITIVA per creare sessioni
 */
export async function createParkingSessionEntry(
  params: CreateParkingSessionEntryParams
): Promise<CreateParkingSessionResult> {
  try {
    console.log("🚀 createParkingSessionEntry chiamata con:", {
      tenantId: params.tenantId,
      categoryId: params.categoryId,
      plate: params.plate,
      washServicesCount: params.washServices?.length || 0
    });

    // Prepara i wash services nel formato corretto per JSONB
    const washServicesFormatted = params.washServices?.map(ws => ({
      washServiceId: ws.washServiceId,
      quantity: ws.quantity || 1
    })) || [];

    const { data, error } = await supabase.rpc('create_parking_session_entry', {
      p_tenant_id: params.tenantId,
      p_category_id: params.categoryId,
      p_plate: params.plate.toUpperCase().trim(),
      p_brand_name: params.brandName || null,
      p_model_name: params.modelName || null,
      p_category_name: params.categoryName || null,
      p_color: params.color || null,
      p_customer_id: params.customerId || null,
      p_subscription_id: params.subscriptionId || null,
      p_convention_id: params.conventionId || null,
      p_price_list_id: params.priceListId || null,
      p_vehicle_profile_id: params.vehicleProfileId || null,
      p_wash_services: washServicesFormatted,
      p_calculated_amount: params.calculatedAmount || 0,
      p_notes: params.notes || null
    });

    if (error) {
      console.error("❌ Errore RPC:", error);
      return {
        success: false,
        error: error.message,
        detail: error.details
      };
    }

    console.log("✅ Sessione creata:", data);
    return data;

  } catch (err: any) {
    console.error("❌ Errore in createParkingSessionEntry:", err);
    return {
      success: false,
      error: err.message
    };
  }
}

// Versione semplificata per solo parcheggio (senza lavaggi)
export async function createParkingSession(params: {
  tenantId: string;
  categoryId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  conventionId?: string | null;
  notes?: string;
}) {
  return createParkingSessionEntry({
    ...params,
    plate: 'TEMP', // sarà sovrascritto
    brandName: null,
    modelName: null,
    categoryName: null,
    washServices: []
  });
}

/* ======================================================
   FUNZIONE PROFESSIONALE: CREA SESSIONE (CON O SENZA LAVAGGIO)
   Questa funzione usa la RPC 'create_parking_session_with_wash' 
   che gestisce autonomamente: Ticket, Bonus, Abbonati e Lavaggi.
   ====================================================== */
export async function createParkingSessionWithWash(params: {
  tenantId: string;
  categoryId: string;
  plate: string;
  brandName: string;
  modelName: string;
  categoryName: string;
  color?: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  conventionId?: string | null;
  vehicleProfileId?: string | null;
  washServices?: WashServiceSelection[];
  calculatedAmount?: number;
  notes?: string;
  serviceId?: string; // Opzionale, se non passato lo cerca il DB
  priceListId?: string; // Opzionale, se non passato lo cerca il DB
}) {
  try {
    console.log("🚀 AVVIO CREAZIONE SESSIONE REALE (RPC)");

    // ⭐ AGGIUNGI LOG PER VERIFICARE washServices
    console.log("🚨 washServices inviati alla RPC:", params.washServices);
    console.log("🚨 washServices dettaglio:", params.washServices?.map(ws => ({
      washServiceId: ws.washServiceId,
      quantity: ws.quantity,
      type: typeof ws.washServiceId,
      isValid: ws.washServiceId && ws.washServiceId !== 'undefined'
    })));

    // 1. Identifichiamo il serviceId di default per PARKING se non passato
    let finalServiceId = params.serviceId;
    if (!finalServiceId) {
      const { data: service } = await supabase
        .from("services")
        .select("id")
        .eq("tenant_id", params.tenantId)
        .eq("code", "PARKING")
        .maybeSingle();
      finalServiceId = service?.id;
    }

    // 2. Identifichiamo una price list valida se non passata
    let finalPriceListId = params.priceListId;
    if (!finalPriceListId) {
      const { data: priceList } = await supabase
        .from("price_lists")
        .select("id")
        .eq("tenant_id", params.tenantId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      finalPriceListId = priceList?.id;
    }

    // Preparazione parametri per la funzione SQL
    const rpcParams = {
      p_tenant_id: params.tenantId,
      p_plate: params.plate,
      p_brand_name: params.brandName,
      p_model_name: params.modelName,
      p_category_name: params.categoryName,
      p_color: params.color || null,
      p_category_id: params.categoryId,
      p_service_id: finalServiceId,
      p_price_list_id: finalPriceListId,
      p_calculated_amount: params.calculatedAmount || 0,
      // MODIFICA: usa washServiceId invece di washServiceTypeId
      p_wash_services: params.washServices?.map(ws => ws.washServiceId) || [],
      p_customer_id: params.customerId || null,
      p_subscription_id: params.subscriptionId || null,
      p_convention_id: params.conventionId || null,
      p_vehicle_profile_id: params.vehicleProfileId || null
    };

    // ⭐ AGGIUNGI LOG DETTAGLIATO PER L'ARRAY p_wash_services
    console.log("📡 Parametri inviati al DB:", rpcParams);
    console.log("📡 p_wash_services array:", rpcParams.p_wash_services);
    console.log("📡 p_wash_services length:", rpcParams.p_wash_services.length);
    console.log("📡 p_wash_services elementi:", rpcParams.p_wash_services.map((id, idx) => ({
      index: idx,
      id: id,
      type: typeof id,
      isValid: id && id !== 'undefined' && id !== null
    })));

    // CHIAMATA ALLA FUNZIONE SQL PROFESSIONALE
    const { data, error } = await supabase.rpc('create_parking_session_with_wash', rpcParams);

    if (error) {
      console.error("❌ Errore RPC Database:", error.message);
      console.error("❌ Dettaglio errore:", error);
      throw error;
    }

    // Estraiamo i dati puliti dal risultato della RPC
    const result = data; 

    // 1. Se ci sono note, le aggiorniamo usando l'ID corretto
    if (params.notes && result.session?.id) {
      await supabase
        .from("parking_sessions")
        .update({ notes: params.notes })
        .eq("id", result.session.id);
    }

    // 2. Creazione record Ticket per stampa QR
    // Usiamo result.session.id e result.session.ticket_number
    if (result.session) {
      await createTicketRecord(
        params.tenantId, 
        result.session.id, 
        result.session.ticket_number, 
        params.plate, 
        (params.washServices?.length || 0) > 0
      );
    }

    console.log("✅ SESSIONE CREATA CON SUCCESSO:", result);
    
    // Ritorna l'oggetto esattamente come lo vuole il frontend
    return result; 

  } catch (error) {
    console.error("❌ Errore nel service createParkingSessionWithWash:", error);
    throw error;
  }
}

/* ======================================================
   UTILITIES DI SUPPORTO
   ====================================================== */

async function createTicketRecord(
  tenantId: string,
  parkingSessionId: string,
  ticketNumber: number,
  plate: string,
  hasWashServices: boolean
) {
  const qrData = {
    session_id: parkingSessionId,
    ticket_number: ticketNumber,
    entry_time: new Date().toISOString(),
    plate: plate,
    has_wash_services: hasWashServices,
  };

  await supabase.from("tickets").insert({
    tenant_id: tenantId,
    parking_session_id: parkingSessionId,
    ticket_number: ticketNumber,
    qr_data: qrData,
    printed_at: new Date().toISOString(),
  });
}

export async function fetchOpenSessionByTicket(tenantId: string, ticketNumber: number) {
  console.log("🔍 fetchOpenSessionByTicket chiamato per:", { tenantId, ticketNumber });
  
  // 1. Recupera la sessione
  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ticket_number", ticketNumber)
    .eq("status", "open") 
    .maybeSingle();

  if (sessionError) {
    console.error("❌ Errore recupero sessione:", sessionError);
    throw sessionError;
  }

  if (!session) {
    console.log("❌ Sessione non trovata per ticket:", ticketNumber);
    return null;
  }

  console.log("✅ Sessione trovata:", session.id);

  // 2. Recupera i veicoli associati
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("parking_session_vehicles")
    .select("*")
    .eq("parking_session_id", session.id);

  if (vehiclesError) {
    console.error("❌ Errore recupero veicoli:", vehiclesError);
  }

  // 3. Recupera i wash services associati
  const { data: washServices, error: washError } = await supabase
    .from("parking_session_wash_services")
    .select("*")
    .eq("parking_session_id", session.id);

  if (washError) {
    console.error("❌ Errore recupero wash services:", washError);
  }

  console.log("🧼 Wash services trovati:", washServices?.length || 0);
  console.log("💰 Prezzi wash services:", washServices?.map(ws => ({ 
    name: ws.wash_service_name, 
    price: ws.wash_service_price 
  })));

  // 4. Combina tutto
  return {
    ...session,
    parking_session_vehicles: vehicles || [],
    parking_session_wash_services: washServices || []
  };
}

export async function fetchSessionWithWashServices(sessionId: string) {
  console.log("🔍 fetchSessionWithWashServices chiamato per sessionId:", sessionId);
  
  // 1. Recupera la sessione
  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError) {
    console.error("❌ Errore recupero sessione:", sessionError);
    throw sessionError;
  }

  // 2. Recupera i veicoli associati
  const { data: vehicles, error: vehiclesError } = await supabase
    .from("parking_session_vehicles")
    .select("*")
    .eq("parking_session_id", sessionId);

  if (vehiclesError) {
    console.error("❌ Errore recupero veicoli:", vehiclesError);
  }

  // 3. Recupera i wash services associati
  const { data: washServices, error: washError } = await supabase
    .from("parking_session_wash_services")
    .select("*")
    .eq("parking_session_id", sessionId);

  if (washError) {
    console.error("❌ Errore recupero wash services:", washError);
  }

  console.log("🧼 Wash services trovati:", washServices?.length || 0);

  return {
    ...session,
    parking_session_vehicles: vehicles || [],
    parking_session_wash_services: washServices || []
  };
}

export async function updateWashServiceStatus({
  washServiceId,
  status,
  assignedTo,
}: {
  washServiceId: string;
  status: WashStatus;
  assignedTo?: string;
}) {
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  else if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (assignedTo) updates.assigned_to = assignedTo;

  const { data, error } = await supabase
    .from("parking_session_wash_services")
    .update(updates)
    .eq("id", washServiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function closeParkingSession({
  sessionId,
  finalAmount,
  washServicesPaid = true,
}: {
  sessionId: string;
  finalAmount: number;
  washServicesPaid?: boolean;
}) {
  const updates = {
  exit_time: new Date().toISOString(),
  final_amount: finalAmount,
  status: "closed"
};

  if (washServicesPaid) {
    await supabase
      .from("parking_session_wash_services")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("parking_session_id", sessionId)
      .eq("status", "pending");
  }

  const { error } = await supabase
    .from("parking_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) throw error;
}
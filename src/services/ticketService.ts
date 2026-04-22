import { supabase } from "@/services/supabase";

export async function generateTicket(
  tenantId: string,
  sessionId: string
) {
  const ticketNumber = `T-${Date.now()}`;

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      tenant_id: tenantId,
      parking_session_id: sessionId,
      ticket_number: ticketNumber,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

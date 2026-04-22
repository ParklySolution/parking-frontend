import { supabase } from "@/services/supabase";

export type PaymentMethod =
  | "cash"
  | "pos"
  | "subscription"
  | "convention";

export async function createPayment({
  tenantId,
  sessionId,
  amount,
  method,
}: {
  tenantId: string;
  sessionId: string;
  amount: number;
  method: PaymentMethod;
}) {
  const { error } = await supabase.from("payments").insert({
    tenant_id: tenantId,
    parking_session_id: sessionId,
    amount,
    payment_method: method,
  });

  if (error) throw error;
}

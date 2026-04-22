import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { impersonateTenant } from "@/services/impersonationService";

export function useImpersonation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function impersonate(ownerUserId: string, tenantId: string) {
    try {
      setLoading(true);

      // 1️⃣ Ottieni token dalla Edge Function
      const token = await impersonateTenant(ownerUserId, tenantId);
      if (!token) throw new Error("Token non ricevuto");

      // 2️⃣ Scambia token → sessione reale
      const { error } =
        await window.supabase.auth.exchangeCodeForSession(token);

      if (error) throw error;

      // 3️⃣ Redirect al tenant impersonato
      navigate(`/tenant/${tenantId}`);
    } finally {
      setLoading(false);
    }
  }

  return { impersonate, loading };
}

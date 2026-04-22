// src/pages/operator/Contracts/hooks/useCompanyInfo.ts
import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";

// ✅ CORRETTO: importa SOLO il tipo
import type { CompanyInfo } from "../types";

export function useCompanyInfo(tenantId: string | undefined) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyInfoError, setCompanyInfoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCompanyInfo = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      setCompanyInfoError(null);
      const { data, error } = await supabase
        .from("tenant_company_info")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        setCompanyInfoError("Dati aziendali non configurati");
        return;
      }
      
      setCompanyInfo(data as CompanyInfo);
    } catch (err) {
      console.error("Errore caricamento dati aziendali:", err);
      setCompanyInfoError("Errore caricamento dati aziendali");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadCompanyInfo();
    }
  }, [tenantId]);

  return {
    companyInfo,
    companyInfoError,
    loading,
    loadCompanyInfo,
    refresh: loadCompanyInfo
  };
}
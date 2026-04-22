// src/pages/operator/Contracts/hooks/useTemplates.ts
import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";
import type { ContractTemplate, ContractTerm } from "../types";

export function useTemplates(tenantId: string | undefined, selectedType: string | null) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [terms, setTerms] = useState<Record<string, ContractTerm>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async (type: string) => {
    if (!tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("type", type)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      
      setTemplates(data || []);
      
      // Carica i termini associati
      const termIds = data?.map(t => t.terms_id).filter(Boolean) || [];
      if (termIds.length > 0) {
        const { data: termsData } = await supabase
          .from("contract_terms")
          .select("*")
          .in("id", termIds);
        
        const termsMap: Record<string, ContractTerm> = {};
        termsData?.forEach(term => {
          termsMap[term.id] = term;
        });
        setTerms(termsMap);
      }
    } catch (err) {
      console.error("Errore caricamento modelli:", err);
      setError("Errore caricamento modelli");
    } finally {
      setLoading(false);
    }
  };

  // Carica modelli quando cambia il tipo
  useEffect(() => {
    if (tenantId && selectedType) {
      loadTemplates(selectedType);
    } else {
      setTemplates([]);
      setTerms({});
    }
  }, [tenantId, selectedType]);

  return {
    templates,
    terms,
    loading,
    error,
    loadTemplates,
    refresh: () => selectedType && loadTemplates(selectedType)
  };
}
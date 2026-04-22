import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';

export function useFeatureFlags(tenantId: string) {
  const [flags, setFlags] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function loadFlags() {
      // 🔥 FONDAMENTALE: Non chiamare la RPC se tenantId è vuoto
      if (!tenantId || tenantId === '') {
        console.log('🏳️ [useFeatureFlags] tenantId vuoto, skip chiamata');
        setLoading(false);
        return;
      }

      try {
        console.log('🏳️ [useFeatureFlags] Caricamento flags per tenant:', tenantId);
        const { data, error } = await supabase
          .rpc('get_effective_feature_flags', { p_tenant_id: tenantId });

        if (error) throw error;
        setFlags(data || {});
      } catch (err) {
        console.error('🏳️ [useFeatureFlags] Errore:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadFlags();
  }, [tenantId]);

  return { flags, loading, error };
}
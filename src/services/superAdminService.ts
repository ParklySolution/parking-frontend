console.log("🔥 SUPERADMINSERVICE CORRETTO CARICATO");

// ============================================================================
// SUPER ADMIN SERVICE — VERSIONE DEFINITIVA E STABILE
// ============================================================================

import { supabase } from "@/services/supabase";
import type {
  TenantDetail,
  FeatureFlags,
  PlanOverview,
  PlanDetail,
} from "@/types/superadmin";

// ⚠️ RIMOSSO: supabaseAdmin (vietato nel frontend)

// ============================================================================
// TENANTS — LISTE, DETTAGLI, CREAZIONE, UPDATE
// ============================================================================

export async function getTenants() {
  console.log("🔍 [SERVICE] getTenants → get_tenants_overview_new");

  const { data, error } = await supabase.rpc("get_tenants_overview_new");

  if (error) throw error;
  return data || [];
}

export async function getTenantsOverviewNew() {
  console.log("🔍 [SERVICE] getTenantsOverviewNew → get_tenants_overview_new");

  const { data, error } = await supabase.rpc("get_tenants_overview_new");

  if (error) throw error;
  return data || [];
}

export async function getTenantDetailNew(tenantId: string) {
  console.log("🔍 [SERVICE] getTenantDetailNew:", tenantId);

  const { data, error } = await supabase.rpc("get_tenant_detail_new", {
    tenant_id_input: tenantId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getTenantsByCompany_new(companyId: string) {
  const { data, error } = await supabase.rpc("get_tenants_by_company_new", {
    company_id: companyId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function updateTenantBasicInfo_new(
  tenantId: string,
  payload: {
    tenant_name?: string;
    address?: string;
    city?: string;
    vat_number?: string;
  }
) {
  console.log("📝 [SERVICE] updateTenantBasicInfo_new:", tenantId, payload);

  const { data, error } = await supabase
    .from("admin_tenants")
    .update(payload)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleTenantStatus_new(
  tenantId: string,
  newStatus: boolean
) {
  console.log("🔄 [SERVICE] toggleTenantStatus_new:", tenantId, newStatus);

  const { error } = await supabase.rpc("toggle_tenant_status_new", {
    p_tenant_id: tenantId,
    p_is_active: newStatus,
  });

  if (error) throw error;
}

export async function updateTenantPlan_new(tenantId: string, planId: string) {
  console.log("📝 [SERVICE] updateTenantPlan_new:", { tenantId, planId });

  const { data, error } = await supabase
    .from("admin_tenants")
    .update({ plan_id: planId })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTenantForCompany({
  company_id,
  name,
  plan_id,
}: {
  company_id: string;
  name: string;
  plan_id: string;
}) {
  console.log("🏢 [SERVICE] createTenantForCompany:", {
    company_id,
    name,
    plan_id,
  });

  const { data, error } = await supabase.rpc("create_tenant_full", {
    p_company_id: company_id,
    p_name: name,
    p_plan_id: plan_id,
  });

  if (error) throw error;
  return data;
}

// ============================================================================
// FEATURE FLAGS — TENANT
// ============================================================================

export async function getTenantFeatures_new(
  tenantId: string
): Promise<FeatureFlags> {
  console.log("🧩 [SERVICE] getTenantFeatures_new:", tenantId);

  const { data, error } = await supabase.rpc("get_tenant_features_new", {
    p_tenant_id: tenantId,
  });

  if (error) throw error;
  return data ?? {};
}

export async function getTenantFeatures(tenantId: string) {
  return await getTenantFeatures_new(tenantId);
}

export async function updateTenantFeatures_new(
  tenantId: string,
  featureFlags: FeatureFlags
) {
  console.log("🧩 [SERVICE] updateTenantFeatures_new:", tenantId, featureFlags);

  const { error } = await supabase.rpc("update_tenant_features_new", {
    p_tenant_id: tenantId,
    p_features: featureFlags,
  });

  if (error) throw error;
}

export async function updateTenantFeatures(
  tenantId: string,
  featureFlags: FeatureFlags
) {
  return await updateTenantFeatures_new(tenantId, featureFlags);
}

// ============================================================================
// FEATURE FLAGS — GLOBALI
// ============================================================================

export async function getGlobalFeatureFlags() {
  console.log("🧩 [SERVICE] getGlobalFeatureFlags");

  const { data, error } = await supabase
    .from("feature_flags_defaults")
    .select("*")
    .order("key");

  if (error) throw error;
  return data;
}

export async function updateGlobalFeatureFlag(key: string, enabled: boolean) {
  console.log("🧩 [SERVICE] updateGlobalFeatureFlag:", key, enabled);

  const { error } = await supabase.rpc("update_global_feature_flag_new", {
    p_key: key,
    p_enabled: enabled,
  });

  if (error) throw error;
}

// ============================================================================
// PLANS — CRUD COMPLETO
// ============================================================================

export async function getPlans(): Promise<PlanOverview[]> {
  console.log("🔍 [SERVICE] getPlans → get_plans_overview_new");

  const { data, error } = await supabase.rpc("get_plans_overview_new");

  if (error) {
    console.error("❌ getPlans error:", error);
    throw error;
  }

  return data || [];
}

export async function getPlanById(planId: string) {
  const { data, error } = await supabase.rpc("get_plan_detail_new", {
    p_plan_id: planId,
  });

  if (error) {
    console.error("❌ getPlanById error:", error);
    throw error;
  }

  return data?.[0] ?? null;
}


export async function createPlan(
  name: string,
  description: string,
  price: number
): Promise<string> {
  console.log("🆕 [SERVICE] createPlan:", name);

  const { data, error } = await supabase.rpc("create_plan_new", {
    p_name: name,
    p_description: description,
    p_price: price,
  });

  if (error) {
    console.error("❌ createPlan error:", error);
    throw error;
  }

  return data;
}

export async function updatePlan(
  planId: string,
  name: string,
  description: string,
  price: number
): Promise<void> {
  console.log("📝 [SERVICE] updatePlan:", planId);

  const { error } = await supabase.rpc("update_plan_new", {
    p_plan_id: planId,
    p_name: name,
    p_description: description,
    p_price: price,
  });

  if (error) {
    console.error("❌ updatePlan error:", error);
    throw error;
  }
}

export async function deletePlan(planId: string): Promise<void> {
  console.log("🗑️ [SERVICE] deletePlan:", planId);

  const { error } = await supabase.rpc("delete_plan_new", {
    p_plan_id: planId,
  });

  if (error) {
    console.error("❌ deletePlan error:", error);
    throw error;
  }
}

export async function duplicatePlan(planId: string): Promise<void> {
  console.log("📄 [SERVICE] duplicatePlan:", planId);

  const { error } = await supabase.rpc("duplicate_plan_new", {
    p_plan_id: planId,
  });

  if (error) {
    console.error("❌ duplicatePlan error:", error);
    throw error;
  }
}

// ============================================================================
// DASHBOARD SUPER ADMIN
// ============================================================================

/* ============================================================
   CALCULATE TENANT TREND
   Calcola la percentuale di crescita dei tenant tra due periodi consecutivi
============================================================ */
export function calculateTenantTrend(data: { total: number }[]): number {
  if (!data || data.length < 2) return 0;

  const last = data[data.length - 1].total;
  const prev = data[data.length - 2].total;

  if (prev === 0) {
    return last > 0 ? 100 : 0;
  }

  return ((last - prev) / prev) * 100;
}

/* ============================================================
   GET TENANT STATUS COUNTS
   Recupera il conteggio di tenant attivi e sospesi
============================================================ */
export async function getTenantStatusCounts() {
  console.log("📊 [SERVICE] getTenantStatusCounts");

  const { data, error } = await supabase.rpc("get_tenant_status_counts");

  if (error) {
    console.error("❌ getTenantStatusCounts error:", error);
    throw error;
  }

  return data?.[0] ?? { active: 0, suspended: 0 };
}

export async function getSuperAdminKpi() {
  console.log("📊 [SERVICE] getSuperAdminKpi");

  const { data, error } = await supabase.rpc("get_superadmin_kpi_new");

  if (error) {
    console.error("❌ getSuperAdminKpi error:", error);
    throw error;
  }

  if (Array.isArray(data) && data.length > 0) return data[0];
  if (data && typeof data === "object") return data;

  return {
    total_tenants: 0,
    active_tenants: 0,
    suspended_tenants: 0,
    tenants_per_plan: [],
  };
}

export async function getTenantGrowth() {
  console.log("📈 [SERVICE] getTenantGrowth");

  const { data, error } = await supabase.rpc("get_tenant_growth_new");

  console.log("📈 GROWTH DATA RAW:", JSON.stringify(data, null, 2));

  if (error) {
    console.error("❌ getTenantGrowth error:", error);
    throw error;
  }

  return data ?? [];
}

/* ============================================================
   GET COMPANY GROWTH
   Recupera i dati di crescita delle company nel tempo
============================================================ */
export async function getCompanyGrowth() {
  console.log("📈 [SERVICE] getCompanyGrowth");

  const { data, error } = await supabase.rpc("get_company_growth_new");

  if (error) {
    console.error("❌ getCompanyGrowth error:", error);
    throw error;
  }

  return data ?? [];
}

/* ============================================================
   GET TENANTS BY CITY
   Recupera la distribuzione dei tenant per città
============================================================ */
export async function getTenantsByCity() {
  console.log("🏙️ [SERVICE] getTenantsByCity");

  const { data, error } = await supabase.rpc("get_tenants_by_city");

  if (error) {
    console.error("❌ getTenantsByCity error:", error);
    throw error;
  }

  return data ?? [];
}

/* ============================================================
   GET TENANTS BY COMPANY
   Recupera la distribuzione dei tenant per company
============================================================ */
export async function getTenantsByCompany() {
  console.log("🏢 [SERVICE] getTenantsByCompany");

  const { data, error } = await supabase.rpc("get_tenants_by_company");

  if (error) {
    console.error("❌ getTenantsByCompany error:", error);
    throw error;
  }

  return data ?? [];
}

export async function getRecentAuditEvents(limit: number = 50) {
  console.log("📝 [SERVICE] getRecentAuditEvents");

  const { data, error } = await supabase.rpc("get_recent_audit_events_new", {
    limit_count: limit,
  });

  if (error) {
    console.error("❌ getRecentAuditEvents error:", error);
    throw error;
  }

  return data ?? [];
}

export async function getRecentTenants() {
  console.log("🆕 [SERVICE] getRecentTenants");

  const { data, error } = await supabase
    .from("admin_tenants")
    .select("id, name, created_at, plan:plans(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("❌ getRecentTenants error:", error);
    throw error;
  }

  if (!data) return [];

  return data.map((t: any) => ({
    id: t.id,
    name: t.name,
    created_at: t.created_at,
    plan_name: t.plan?.name ?? null,
  }));
}

// ============================================================================
// COMPANIES
// ============================================================================

/* ============================================================
   CREATE COMPANY PROFILE (nuovo schema)
============================================================ */
export async function createCompanyProfile_new(payload: {
  name: string;
  vat_number?: string;
  address?: string;
  city?: string;
}) {
  console.log("🏢 [SERVICE] createCompanyProfile_new:", payload);

  const { data, error } = await supabase.rpc("create_company_profile_new", {
    p_name: payload.name,
    p_vat_number: payload.vat_number ?? null,
    p_address: payload.address ?? null,
    p_city: payload.city ?? null,
  });

  if (error) {
    console.error("❌ createCompanyProfile_new error:", error);
    throw error;
  }

  return data;
}

export async function getCompanies() {
  console.log("🏢 [SERVICE] getCompanies");

  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ getCompanies error:", error);
    throw error;
  }

  return data;
}

// ============================================================================
// TENANT ADMIN MANAGEMENT — VERSIONE SICURA (STRADA A)
// ============================================================================

// 🔥 Configurazione API_URL (usa la variabile d'ambiente se disponibile)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function createTenantAdmin(
  tenantId: string,
  { full_name, email }: { full_name: string; email: string }
) {
  try {
    console.log("🧩 [SERVICE] createTenantAdmin:", tenantId, email);

    // 1️⃣ Recupera il token dell'utente loggato (SuperAdmin)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      console.error("❌ Nessun access token trovato");
      return { success: false, error: "Missing access token" };
    }

    console.log("🔑 TOKEN:", accessToken);
    console.log("🚀 STO PER CHIAMARE IL BACKEND…");

    // 2️⃣ URL CORRETTO con /api/ e /tenants/:tenantId/create-tenant-admin
    const url = `${API_URL}/api/superadmin/tenants/${tenantId}/create-tenant-admin`;
    console.log("📡 URL chiamata:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name,
        email,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ createTenantAdmin backend error:", data);
      return { success: false, error: data.error };
    }

    return data;

  } catch (err) {
    console.error("❌ createTenantAdmin exception:", err);
    return { success: false, error: err };
  }
}

// ============================================================================
// IMPERSONATION (VERSIONE CORRETTA PER EDGE FUNCTIONS V2)
// ============================================================================

export async function impersonateTenant(userIdToImpersonate: string) {
  console.log("🕵️ [SERVICE] impersonateTenant → impersonating:", userIdToImpersonate);

  const { data, error } = await supabase.functions.invoke(
    "generate-impersonation-token",
    {
      body: {
        user_id_to_impersonate: userIdToImpersonate,
      },
      headers: {
        "X-Client-Info": "supabase-js-edge",
      },
    }
  );

  if (error) {
    console.error("❌ impersonateTenant ERROR:", error);
    return null;
  }

  return data?.session ?? null;
}
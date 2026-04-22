// src/types/superadmin.d.ts

/* ============================================================
   FEATURE FLAGS (dinamici, non più hardcoded)
============================================================ */
export type FeatureFlags = Record<string, boolean>;

/* ============================================================
   TENANT OVERVIEW (lista tenant)
   Usato da get_tenants_overview_new
============================================================ */
export type TenantOverview = {
  tenant_id: string;
  tenant_name: string;
  company_name: string;
  plan_name: string | null;
  is_active: boolean;
  created_at: string;
};

/* ============================================================
   TENANT DETAIL (dettaglio tenant)
   Usato da get_tenant_detail_new
============================================================ */
export type TenantDetail = {
  tenant_id: string;
  tenant_name: string;
  company_id: string;
  company_name: string;
  plan_id: string | null;
  plan_name: string | null;
  address: string | null;
  city: string | null;
  vat_number: string | null;
  is_active: boolean;
  created_at: string;
  feature_flags: FeatureFlags;
};

/* ============================================================
   UPDATE PLAN PAYLOAD (nuovo schema)
============================================================ */
export type UpdatePlanPayload = {
  tenant_id: string;
  plan_id: string;
};

/* ============================================================
   UPDATE FEATURE FLAGS PAYLOAD (nuovo schema)
============================================================ */
export type UpdateFeatureFlagsPayload = {
  tenant_id: string;
  feature_flags: FeatureFlags;
};

/* ============================================================
   PLAN OVERVIEW
============================================================ */
export interface PlanOverview {
  id: string;
  name: string;
  description?: string;
  price: number;
  limits: Record<string, any>;
  features: Record<string, any>;
  tenant_count: number;
}

/* ============================================================
   PLAN DETAIL
============================================================ */
export interface PlanDetail {
  id: string;
  name: string;
  description?: string;
  price: number;
  limits: Record<string, any>;
  features: Record<string, any>;
  tenant_count: number;
}

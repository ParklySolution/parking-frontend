import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

/* ======================================================
   LAYOUT PRINCIPALE OPERATORE
====================================================== */
import AppLayout from "./layouts/AppLayout";

/* ======================================================
   OPERATORE PANEL
====================================================== */
import Dashboard from "./pages/Dashboard/Dashboard";
import Ingresso from "./pages/Ingresso";
import Exit from "./pages/Exit";
import Subscriptions from "./pages/Subscriptions";
import Customers from "./pages/Customers";
import ShiftsPage from "./pages/shifts";
import SessionsPage from "./pages/Sessions";

/* ======================================================
   ADMIN PANEL (MANAGER)
====================================================== */
import AdminLayout from "./pages/Admin/AdminLayout";
import AdminHome from "./pages/Admin/AdminHome";
import VehicleBrands from "./pages/Admin/VehicleBrands";
import VehicleCategories from "./pages/Admin/VehicleCategories";
import VehicleModels from "./pages/Admin/VehicleModels";
import PriceLists from "./pages/Admin/PriceLists";
import ParkingTolerances from "./pages/Admin/ParkingTolerances";
import WashServicesAdmin from "./pages/Admin/WashServicesAdmin";
import AcceptInvite from "./pages/Admin/AcceptInvite";
import AdminLogin from "./pages/Admin/AdminLogin";
import RequireAdmin from "@/middleware/RequireAdmin";

/* ======================================================
   AUTH
====================================================== */
import ForgotPassword from "@/pages/Auth/ForgotPassword";
import ResetPassword from "@/pages/Auth/ResetPassword";
import UpdatePassword from "@/pages/Auth/UpdatePassword";  // 🔥 AGGIUNTO

/* ======================================================
   SUPER ADMIN PANEL
====================================================== */
import SuperAdminLayout from "@/pages/SuperAdmin/SuperAdminLayout";
import SuperAdminDashboard from "@/pages/SuperAdmin/dashboard/SuperAdminDashboard";
import TenantsList from "@/pages/SuperAdmin/TenantsList";
import TenantDetailPage from "@/pages/SuperAdmin/TenantDetailPage";
import TenantEditPage from "@/pages/SuperAdmin/TenantEditPage";
import PlansList from "@/pages/SuperAdmin/PlansList";
import PlanDetailPage from "@/pages/SuperAdmin/PlanDetailPage";
import PlanCreatePage from "@/pages/SuperAdmin/PlanCreatePage";
import PlanEditPage from "@/pages/SuperAdmin/PlanEditPage";
import PlansManagementPage from "@/pages/SuperAdmin/PlansManagementPage";
import AdminsList from "@/pages/SuperAdmin/AdminsList";
import GlobalFeatureFlagsPanel from "@/pages/superadmin/GlobalFeatureFlagsPanel";
import TenantFeatureFlagsPanel from "@/pages/superadmin/TenantFeatureFlagsPanel";
import AuditLogPage from "@/pages/SuperAdmin/AuditLogPage";

/* ⭐ NEW: COMPANIES */
import CompaniesList from "@/pages/SuperAdmin/CompaniesList";
import CompanyDetail from "@/pages/SuperAdmin/CompanyDetail";
import CreateTenantFromCompany from "@/pages/SuperAdmin/CreateTenantFromCompany";

/* ======================================================
   TENANT PANEL (impersonation)
====================================================== */
import RequireTenantSession from "@/middleware/RequireTenantSession";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import ImpersonateCallback from "@/pages/Auth/ImpersonateCallback";

import TenantDashboard from "@/pages/Tenant/Dashboard";
import TenantIngressi from "@/pages/Tenant/Ingressi";
import TenantUscite from "@/pages/Tenant/Uscite";
import TenantAbbonamenti from "@/pages/Tenant/Abbonamenti";
import TenantClienti from "@/pages/Tenant/Clienti";
import TenantAbbonati from "@/pages/Tenant/abbonati";
import ContractsManagement from "@/pages/operator/ContractsManagement";
import SubscriptionRenewal from "@/pages/operator/subscription-renewal";

/* Tenant Management */
import TenantBrands from "@/pages/Tenant/management/Brands";
import TenantCategories from "@/pages/Tenant/management/Categories";
import TenantModels from "@/pages/Tenant/management/Models";
import TenantPriceLists from "@/pages/Tenant/management/PriceLists";
import TenantTolerances from "@/pages/Tenant/management/Tolerances";
import WashServices from "@/pages/Tenant/management/WashServices";
import ConventionsList from "@/pages/Tenant/management/conventions/ConventionsList";
import WashBonusList from "@/pages/Tenant/management/wash-bonus/WashBonusList";
import ContractTemplatesList from "@/pages/Tenant/management/contract-templates/ContractTemplatesList";
import CompanyInfo from "@/pages/Tenant/management/company-info/CompanyInfo";
import ContractTermsList from "@/pages/Tenant/management/contract-terms/ContractTermsList";
import PaymentMethodsManagement from "@/pages/Tenant/management/payment-methods";
import TenantUsers from "@/pages/Tenant/management/TenantUsers";

/* ======================================================
   SUPER ADMIN CREATION
====================================================== */
import CreateSuperAdmin from "@/pages/CreateSuperAdmin";

/* ======================================================
   OPERATOR CONTRACTS
====================================================== */
import OperatorContracts from "@/pages/operator/Contracts";

/* ======================================================
   ROLE REDIRECT COMPONENT
====================================================== */
function RoleRedirect() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data.session;
      const r = session?.user?.app_metadata?.role || null;
      setRole(r);
    });
  }, []);

  if (role === null) return null;

  if (role === "super_admin") {
    return <Navigate to="/super/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function App() {
  /* ======================================================
     ⭐ SESSION GATE — FIX DEFINITIVO PER I 401
  ====================================================== */
  const [sessionReady, setSessionReady] = useState(false);

  // 1️⃣ Primo hook: carica la sessione
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 2️⃣ Secondo hook: debug sessione
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data.session;
      if (session) {
        console.log("USER:", session.user);
        console.log("APP METADATA:", session.user.app_metadata);
        console.log("USER METADATA:", session.user.user_metadata);
      } else {
        console.log("Nessuna sessione trovata");
      }
    });
  }, []);

  // 3️⃣ SOLO ORA puoi fare il return condizionale
  if (!sessionReady) {
    return <div>Caricamento sessione...</div>;
  }

  /* ======================================================
     ROUTER
  ====================================================== */
  return (
    <BrowserRouter>
      <ImpersonationBanner />

      <Routes>
        {/* AUTH */}
        <Route path="/create-super-admin" element={<CreateSuperAdmin />} />
        <Route path="/auth/forgot" element={<ForgotPassword />} />
        <Route path="/auth/reset" element={<ResetPassword />} />
        <Route path="/auth/update-password" element={<UpdatePassword />} />  {/* 🔥 ROTTA AGGIUNTA */}
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* OPERATORE */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route element={<AppLayout />}>
          <Route path="/ingresso" element={<Ingresso />} />
          <Route path="/exit" element={<Exit />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/shifts" element={<ShiftsPage />} />
        </Route>

        <Route path="/sessions" element={<SessionsPage />} />

        {/* OPERATOR CONTRACTS */}
        <Route
          path="/tenant/:tenantId/contracts"
          element={
            <RequireTenantSession>
              <OperatorContracts />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/subscription-renewal"
          element={
            <RequireTenantSession>
              <SubscriptionRenewal />
            </RequireTenantSession>
          }
        />

        {/* ADMIN */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/:tenantId"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="brands" element={<VehicleBrands />} />
          <Route path="categories" element={<VehicleCategories />} />
          <Route path="models" element={<VehicleModels />} />
          <Route path="price-lists" element={<PriceLists />} />
          <Route path="tolerances" element={<ParkingTolerances />} />
          <Route path="wash-services" element={<WashServicesAdmin />} />
          <Route index element={<AdminHome />} />
        </Route>

        {/* SUPER ADMIN */}
        <Route path="/super" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="admins" element={<AdminsList />} />

          <Route path="companies" element={<CompaniesList />} />
          <Route path="companies/:id" element={<CompanyDetail />} />
          <Route
            path="companies/:companyId/create-tenant"
            element={<CreateTenantFromCompany />}
          />

          <Route path="tenants" element={<TenantsList />} />
          <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
          <Route path="tenants/:tenantId/edit" element={<TenantEditPage />} />
          <Route
            path="tenants/:tenantId/feature-flags"
            element={<TenantFeatureFlagsPanel />}
          />

          <Route path="plans" element={<PlansList />} />
          <Route path="plans/:planId" element={<PlanDetailPage />} />
          <Route path="plans/create" element={<PlanCreatePage />} />
          <Route path="plans/:planId/edit" element={<PlanEditPage />} />
          <Route path="plans/manage" element={<PlansManagementPage />} />

          <Route path="feature-flags" element={<GlobalFeatureFlagsPanel />} />
          <Route path="logs" element={<AuditLogPage />} />
        </Route>

        {/* TENANT PANEL */}
        <Route
          path="/tenant/:tenantId"
          element={<Navigate to="dashboard" replace />}
        />

        <Route
          path="/tenant/:tenantId/dashboard"
          element={
            <RequireTenantSession>
              <TenantDashboard />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/ingressi"
          element={
            <RequireTenantSession>
              <TenantIngressi />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/uscite"
          element={
            <RequireTenantSession>
              <TenantUscite />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/abbonamenti"
          element={
            <RequireTenantSession>
              <TenantAbbonamenti />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/abbonati"
          element={
            <RequireTenantSession>
              <TenantAbbonati />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/clienti"
          element={
            <RequireTenantSession>
              <TenantClienti />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/contracts-management"
          element={
            <RequireTenantSession>
              <ContractsManagement />
            </RequireTenantSession>
          }
        />

        {/* Tenant Management */}
        <Route
          path="/tenant/:tenantId/management/brands"
          element={
            <RequireTenantSession>
              <TenantBrands />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/categories"
          element={
            <RequireTenantSession>
              <TenantCategories />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/models"
          element={
            <RequireTenantSession>
              <TenantModels />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/price-lists"
          element={
            <RequireTenantSession>
              <TenantPriceLists />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/tolerances"
          element={
            <RequireTenantSession>
              <TenantTolerances />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/wash-services"
          element={
            <RequireTenantSession>
              <WashServices />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/conventions"
          element={
            <RequireTenantSession>
              <ConventionsList />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/wash-bonus"
          element={
            <RequireTenantSession>
              <WashBonusList />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/contract-templates"
          element={
            <RequireTenantSession>
              <ContractTemplatesList />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/company-info"
          element={
            <RequireTenantSession>
              <CompanyInfo />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/contract-terms"
          element={
            <RequireTenantSession>
              <ContractTermsList />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/payment-methods"
          element={
            <RequireTenantSession>
              <PaymentMethodsManagement />
            </RequireTenantSession>
          }
        />

        <Route
          path="/tenant/:tenantId/management/users"
          element={
            <RequireTenantSession>
              <TenantUsers />
            </RequireTenantSession>
          }
        />

        <Route path="/auth/impersonate-callback" element={<ImpersonateCallback />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
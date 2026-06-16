import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";

/* ======================================================
   LAYOUT PRINCIPALE OPERATORE
====================================================== */
import AppLayout from "./layouts/AppLayout";
import SimpleLayout from "./layouts/SimpleLayout";

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
import OutstandingPayments from "./pages/operator/OutstandingPayments";
import FidelityCustomers from "./pages/operator/FidelityCustomers";

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
import UpdatePassword from "@/pages/Auth/UpdatePassword";

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
import GlobalFeatureFlagsPanel from "@/pages/superadmin/GlobalFeatureFlagsPanel";
import TenantFeatureFlagsPanel from "@/pages/superadmin/TenantFeatureFlagsPanel";
import AuditLogPage from "@/pages/SuperAdmin/AuditLogPage";
import GlobalBrandsPage from "@/pages/SuperAdmin/GlobalBrandsPage";
import GlobalCategoriesPage from "@/pages/SuperAdmin/GlobalCategoriesPage";
import ModelsSyncPage from "@/pages/SuperAdmin/ModelsSyncPage";
import GlobalModelsPage from "@/pages/SuperAdmin/GlobalModelsPage";

/* COMPANIES */
import CompaniesList from "@/pages/SuperAdmin/CompaniesList";
import CompanyDetail from "@/pages/SuperAdmin/CompanyDetail";
import CreateTenantFromCompany from "@/pages/SuperAdmin/CreateTenantFromCompany";

/* ======================================================
   TENANT PANEL (impersonation)
====================================================== */
import TenantLayout from "./pages/Tenant/layout/TenantLayout";
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
import FidelityProgramsList from "@/pages/Tenant/management/fidelity-programs";

/* 🔥 TENANT EMAIL TEMPLATES (NUOVO) */
import EmailTemplates from "@/pages/Tenant/EmailTemplates";
import TemplateForm from "@/pages/Tenant/EmailTemplates/TemplateForm";

/* ======================================================
   SUPER ADMIN CREATION
====================================================== */
import CreateSuperAdmin from "@/pages/CreateSuperAdmin";

/* ======================================================
   OPERATOR CONTRACTS
====================================================== */
import OperatorContracts from "@/pages/operator/Contracts";

/* ======================================================
   MIDDLEWARE OPERATOR
====================================================== */
import RequireOperator from "@/middleware/RequireOperator";

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
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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

  if (!sessionReady) {
    return <div>Caricamento sessione...</div>;
  }

  return (
    <BrowserRouter>
      <ImpersonationBanner />

      <Routes>
        {/* AUTH */}
        <Route path="/create-super-admin" element={<CreateSuperAdmin />} />
        <Route path="/auth/forgot" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/update-password" element={<UpdatePassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* OPERATORE - PROTETTO DA RequireOperator */}
        <Route element={<RequireOperator />}>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/dashboard" element={<Dashboard />} />

          <Route element={<AppLayout />}>
            <Route path="/ingresso" element={<Ingresso />} />
            <Route path="/exit" element={<Exit />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/outstanding-payments" element={<OutstandingPayments />} />
            <Route path="/fidelity-customers" element={<FidelityCustomers />} />
          </Route>

          <Route path="/sessions" element={<SessionsPage />} />
        </Route>

        {/* ======================================================
            OPERATOR CONTRACTS - CON SIMPLE LAYOUT (SENZA SIDEBAR)
        ====================================================== */}
        <Route element={<RequireOperator />}>
          <Route element={<SimpleLayout />}>
            <Route
              path="/operator/:tenantId/contracts"
              element={<OperatorContracts />}
            />
            <Route
              path="/operator/:tenantId/contracts-management"
              element={<ContractsManagement />}
            />
            <Route
              path="/operator/:tenantId/subscription-renewal"
              element={<SubscriptionRenewal />}
            />
          </Route>
        </Route>

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
          <Route path="global-brands" element={<GlobalBrandsPage />} />
          <Route path="global-categories" element={<GlobalCategoriesPage />} />
          <Route path="models-sync" element={<ModelsSyncPage />} />
          <Route path="global-models" element={<GlobalModelsPage />} />
        </Route>

        {/* ======================================================
            TENANT PANEL - USANDO TENANT LAYOUT (CON SIDEBAR)
        ====================================================== */}
        <Route
          path="/tenant/:tenantId"
          element={
            <RequireTenantSession>
              <TenantLayout />
            </RequireTenantSession>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="ingressi" element={<TenantIngressi />} />
          <Route path="uscite" element={<TenantUscite />} />
          <Route path="abbonamenti" element={<TenantAbbonamenti />} />
          <Route path="abbonati" element={<TenantAbbonati />} />
          <Route path="clienti" element={<TenantClienti />} />

          <Route path="management/brands" element={<TenantBrands />} />
          <Route path="management/categories" element={<TenantCategories />} />
          <Route path="management/models" element={<TenantModels />} />
          <Route path="management/price-lists" element={<TenantPriceLists />} />
          <Route path="management/tolerances" element={<TenantTolerances />} />
          <Route path="management/wash-services" element={<WashServices />} />
          <Route path="management/conventions" element={<ConventionsList />} />
          <Route path="management/wash-bonus" element={<WashBonusList />} />
          <Route path="management/contract-templates" element={<ContractTemplatesList />} />
          <Route path="management/company-info" element={<CompanyInfo />} />
          <Route path="management/contract-terms" element={<ContractTermsList />} />
          <Route path="management/payment-methods" element={<PaymentMethodsManagement />} />
          <Route path="management/users" element={<TenantUsers />} />
          <Route path="management/fidelity-programs" element={<FidelityProgramsList />} />
          
          {/* 🔥 TENANT EMAIL TEMPLATES (NUOVE ROTTE) */}
          <Route path="management/email-templates" element={<EmailTemplates />} />
          <Route path="management/email-templates/new" element={<TemplateForm />} />
          <Route path="management/email-templates/edit/:id" element={<TemplateForm />} />
        </Route>

        <Route path="/auth/impersonate-callback" element={<ImpersonateCallback />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { useEffect, useState } from "react";
import {
  getSuperAdminKpi,
  getTenantGrowth,
  getRecentAuditEvents,
  getRecentTenants,
  getTenantStatusCounts,
  getCompanyGrowth,
  calculateTenantTrend,
  getTenantsByCity,
  getTenantsByCompany,
} from "@/services/superAdminService";

import KpiCard from "./components/KpiCard";
import GrowthChart from "./components/GrowthChart";
import PlanDistributionChart from "./components/PlanDistributionChart";
import RecentTenants from "./components/RecentTenants";
import RecentEvents from "./components/RecentEvents";
import QuickActions from "./components/QuickActions";

import "./dashboard.css";

export default function SuperAdminDashboard() {
  const [kpi, setKpi] = useState<any>({
    total_tenants: 0,
    active_tenants: 0,
    suspended_tenants: 0,
    tenants_per_plan: [],
  });

  const [growth, setGrowth] = useState<any[]>([]);
  const [companyGrowth, setCompanyGrowth] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<{ active: number; suspended: number } | null>(null);
  const [tenantsByCity, setTenantsByCity] = useState<any[]>([]);
  const [tenantsByCompany, setTenantsByCompany] = useState<any[]>([]);
  const [trend, setTrend] = useState<number>(0);
  const [range, setRange] = useState<"6m" | "12m" | "ytd">("12m");
  const [loading, setLoading] = useState(true);

  // Funzione per filtrare i dati dei grafici
  function filterGrowth(data: any[], range: "6m" | "12m" | "ytd") {
    if (!Array.isArray(data)) return [];

    if (range === "6m") {
      return data.slice(-6);
    }

    if (range === "ytd") {
      const currentYear = new Date().getFullYear();
      return data.filter((d) => d.month.startsWith(String(currentYear)));
    }

    return data; // 12 mesi
  }

  useEffect(() => {
    async function load() {
      try {
        const [
          kpiData,
          growthData,
          eventsData,
          tenantsData,
          statusData,
          companyGrowthData,
          tenantsByCityData,
          tenantsByCompanyData
        ] = await Promise.all([
          getSuperAdminKpi(),
          getTenantGrowth(),
          getRecentAuditEvents(),
          getRecentTenants(),
          getTenantStatusCounts(),
          getCompanyGrowth(),
          getTenantsByCity(),
          getTenantsByCompany(),
        ]);

        setKpi(
          kpiData ?? {
            total_tenants: 0,
            active_tenants: 0,
            suspended_tenants: 0,
            tenants_per_plan: [],
          }
        );

        const safeGrowth = Array.isArray(growthData) ? growthData : [];
        setGrowth(safeGrowth);
        setCompanyGrowth(Array.isArray(companyGrowthData) ? companyGrowthData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setRecentTenants(Array.isArray(tenantsData) ? tenantsData : []);
        setStatusCounts(statusData ?? { active: 0, suspended: 0 });
        setTenantsByCity(Array.isArray(tenantsByCityData) ? tenantsByCityData : []);
        setTenantsByCompany(Array.isArray(tenantsByCompanyData) ? tenantsByCompanyData : []);
        setTrend(calculateTenantTrend(safeGrowth));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <p className="sa-loading">Caricamento dashboard...</p>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Super Admin Dashboard</h1>

      {/* KPI */}
      <div className="kpi-grid">
        <KpiCard label="Totale Tenant" value={kpi.total_tenants ?? 0} />
        <KpiCard label="Tenant Attivi" value={statusCounts?.active ?? 0} />
        <KpiCard label="Tenant Sospesi" value={statusCounts?.suspended ?? 0} />
        <KpiCard
          label="Trend mensile"
          value={`${trend.toFixed(1)}%`}
          subtitle="vs mese precedente"
          accent={trend > 0 ? "positive" : trend < 0 ? "negative" : "neutral"}
        />
      </div>

      {/* FILTRI TEMPORALI */}
      <div className="filter-bar">
        <button
          className={range === "6m" ? "filter-active" : ""}
          onClick={() => setRange("6m")}
        >
          Ultimi 6 mesi
        </button>

        <button
          className={range === "12m" ? "filter-active" : ""}
          onClick={() => setRange("12m")}
        >
          Ultimi 12 mesi
        </button>

        <button
          className={range === "ytd" ? "filter-active" : ""}
          onClick={() => setRange("ytd")}
        >
          YTD
        </button>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <GrowthChart data={filterGrowth(growth, range)} title="Crescita Tenant" />
        <GrowthChart data={filterGrowth(companyGrowth, range)} title="Crescita Aziende" />
      </div>

      <div className="advanced-grid">

  <div className="advanced-card">
    <h3>Tenant per Regione</h3>
    <ul className="advanced-list">
      {tenantsByCity.map((c, i) => (
        <li key={i}>
          <span className="label">{c.city ?? "Sconosciuta"}</span>
          <span className="value">{c.total}</span>
        </li>
      ))}
    </ul>
  </div>

  <div className="advanced-card">
    <h3>Tenant per Azienda</h3>
    <ul className="advanced-list">
      {tenantsByCompany.map((c, i) => (
        <li key={i}>
          <span className="label">{c.company_name ?? "Senza azienda"}</span>
          <span className="value">{c.total}</span>
        </li>
      ))}
    </ul>
  </div>

</div>

      {/* Recent Tenants */}
      <RecentTenants tenants={recentTenants} />

      {/* Recent Events */}
      <RecentEvents events={events} />

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}

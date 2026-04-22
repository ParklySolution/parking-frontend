// src/pages/SuperAdmin/TenantsList.tsx

import React, { useEffect, useState } from "react";
import type { TenantOverview, PlanOverview } from "@/types/superadmin";
import {
  getTenantsOverviewNew,
  getPlans
} from "@/services/superAdminService";
import TenantTable from "@/pages/SuperAdmin/components/TenantTable";
import { logAudit } from "@/services/auditLog";

const TenantsList: React.FC = () => {
  const [tenants, setTenants] = useState<TenantOverview[]>([]);
  const [plans, setPlans] = useState<PlanOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ============================================================
     LOAD TENANTS + PLANS (NUOVO SCHEMA)
  ============================================================ */
  const loadTenants = async () => {
    try {
      const tenantsData = await getTenantsOverviewNew(); // ⭐ NUOVO
      const plansData = await getPlans();

      setTenants(tenantsData);
      setPlans(plansData);
    } catch (err) {
      console.error("❌ Errore in TenantsList:", err);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        // ⭐ AUDIT LOG: apertura pagina
        await logAudit({
          action: "view_tenants_list",
          entity: "tenant",
          entity_id: null,
          details: { page: "TenantsList" },
        });

        await loadTenants();
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  /* ============================================================
     SEARCH
  ============================================================ */
  const safeSearch = typeof search === "string" ? search.toLowerCase() : "";

  const filteredTenants = Array.isArray(tenants)
    ? tenants.filter((t) =>
        ((t?.tenant_name ?? "") + "").toLowerCase().includes(safeSearch)
      )
    : [];

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div
      style={{
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* HEADER */}
      <div>
        <h1
          style={{
            color: "#ffffff",
            fontSize: "32px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Lista Tenant
        </h1>
        <p
          style={{
            color: "#4ea8ff",
            marginTop: "8px",
            fontSize: "16px",
          }}
        >
          Gestisci tutti i tenant della piattaforma in un’unica schermata.
        </p>
      </div>

      {/* KPI BOXES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Totale Tenant</p>
          <h3
            style={{
              color: "#4ea8ff",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {tenants.length}
          </h3>
        </div>

        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Piani disponibili</p>
          <h3
            style={{
              color: "#4ea8ff",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {plans.length}
          </h3>
        </div>

        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Tenant attivi</p>
          <h3
            style={{
              color: "#22c55e",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {tenants.filter((t) => t.is_active).length}
          </h3>
        </div>

        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Tenant sospesi</p>
          <h3
            style={{
              color: "#f97373",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            {tenants.filter((t) => !t.is_active).length}
          </h3>
        </div>
      </div>

      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Cerca tenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "320px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "#111418",
            color: "#ffffff",
            fontSize: "14px",
          }}
        />
      </div>

      {/* TABLE CONTAINER */}
      <div
        style={{
          background: "#0b0f14",
          borderRadius: "14px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
          marginTop: "4px",
        }}
      >
        {loading ? (
          <p style={{ color: "#e5e7eb" }}>Caricamento...</p>
        ) : (
          <TenantTable tenants={filteredTenants} plans={plans} />
        )}
      </div>
    </div>
  );
};

export default TenantsList;

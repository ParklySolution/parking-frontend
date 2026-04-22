// src/pages/SuperAdmin/components/CreateTenantDrawer.tsx

import React, { useEffect, useState } from "react";
import {
  getPlans,
  getGlobalFeatureFlags,
  createTenantFullFlow_new,
  getCompanies
} from "@/services/superAdminService";
import { logAudit } from "@/services/auditLog";

export default function CreateTenantDrawer({ open, onClose, onCreated }) {
  const [plans, setPlans] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [globalFlags, setGlobalFlags] = useState([]);

  const [form, setForm] = useState({
    company_id: "",
    name: "",
    address: "",
    city: "",
    vat_number: "",
    plan_id: "",
    is_active: true,
    feature_flags: {},
    create_admin: true,
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
  });

  const [saving, setSaving] = useState(false);

  /* ============================================================
     LOAD COMPANIES + PLANS + GLOBAL FEATURE FLAGS
  ============================================================ */
  useEffect(() => {
    if (!open) return;

    async function load() {
      const companiesData = await getCompanies();
      const plansData = await getPlans();
      const flagsData = await getGlobalFeatureFlags();

      setCompanies(companiesData);
      setPlans(plansData);
      setGlobalFlags(flagsData);
    }

    load();
  }, [open]);

  /* ============================================================
     HANDLE CREATE TENANT
  ============================================================ */
  const handleCreate = async () => {
    if (!form.company_id) {
      alert("Seleziona una Company prima di creare un tenant.");
      return;
    }

    setSaving(true);

    try {
      await logAudit({
        action: "intent_create_tenant",
        entity: "tenant",
        entity_id: null,
        details: { form },
      });

      const { tenant, admin } = await createTenantFullFlow_new({
        company_id: form.company_id,
        name: form.name,
        address: form.address,
        city: form.city,
        vat_number: form.vat_number,
        plan_id: form.plan_id,
        is_active: form.is_active,
        feature_flags: form.feature_flags,
        admin_email: form.admin_email,
        admin_full_name:
          form.admin_first_name + " " + form.admin_last_name,
      });

      await logAudit({
        action: "create_tenant",
        entity: "tenant",
        entity_id: tenant.id,
        details: { form },
      });

      if (admin) {
        await logAudit({
          action: "create_admin_for_tenant",
          entity: "admin",
          entity_id: admin.user_id,
          details: {
            tenant_id: tenant.id,
            email: form.admin_email,
          },
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error("Errore creazione tenant:", err);
      alert("Errore durante la creazione del tenant");
    }

    setSaving(false);
  };

  if (!open) return null;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "480px",
        height: "100vh",
        background: "#0b0f14",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-8px 0 25px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "28px", paddingBottom: "10px" }}>
        <h2
          style={{
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "4px",
          }}
        >
          Crea Tenant
        </h2>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 28px 28px 28px",
        }}
      >
        {/* ============================
            COMPANY
        ============================ */}
        <select
          value={form.company_id}
          onChange={(e) => setForm({ ...form, company_id: e.target.value })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">Seleziona Company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.city}
            </option>
          ))}
        </select>

        {/* ============================
            INFO BASE
        ============================ */}
        <input
          type="text"
          placeholder="Nome tenant"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Indirizzo"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Città"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Partita IVA"
          value={form.vat_number}
          onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
          style={inputStyle}
        />

        {/* ============================
            PIANO
        ============================ */}
        <select
          value={form.plan_id}
          onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">Seleziona piano</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.price}€/mese
            </option>
          ))}
        </select>

        {/* ============================
            FEATURE FLAGS
        ============================ */}
        <div style={{ marginTop: "20px", color: "#fff", fontWeight: 600 }}>
          Moduli iniziali
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {globalFlags.map((f) => (
            <label
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#fff",
                fontSize: "14px",
              }}
            >
              <input
                type="checkbox"
                checked={form.feature_flags[f.key] ?? f.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    feature_flags: {
                      ...form.feature_flags,
                      [f.key]: e.target.checked,
                    },
                  })
                }
              />
              {f.key}
            </label>
          ))}
        </div>

        {/* ============================
            ADMIN PRINCIPALE
        ============================ */}
        <div style={{ marginTop: "20px", color: "#fff", fontWeight: 600 }}>
          Admin principale (opzionale)
        </div>

        <label style={{ color: "#9ca3af", fontSize: "13px" }}>
          <input
            type="checkbox"
            checked={form.create_admin}
            onChange={(e) =>
              setForm({ ...form, create_admin: e.target.checked })
            }
            style={{ marginRight: "8px" }}
          />
          Crea admin principale per questo tenant
        </label>

        {form.create_admin && (
          <>
            <input
              type="text"
              placeholder="Nome admin"
              value={form.admin_first_name}
              onChange={(e) =>
                setForm({ ...form, admin_first_name: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Cognome admin"
              value={form.admin_last_name}
              onChange={(e) =>
                setForm({ ...form, admin_last_name: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="Email admin"
              value={form.admin_email}
              onChange={(e) =>
                setForm({ ...form, admin_email: e.target.value })
              }
              style={inputStyle}
            />
          </>
        )}
      </div>

      {/* ============================
          ACTIONS
      ============================ */}
      <div
        style={{
          padding: "20px 28px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          background: "#0b0f14",
        }}
      >
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            background: "#111418",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Annulla
        </button>

        <button
          onClick={handleCreate}
          disabled={saving}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            background: "#2563eb",
            border: "none",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Creazione…" : "Crea Tenant"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#111418",
  color: "#ffffff",
  fontSize: "14px",
};

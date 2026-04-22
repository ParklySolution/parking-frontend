// src/pages/SuperAdmin/TenantEditPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getTenantDetailNew,
  updateTenantBasicInfo_new
} from "@/services/superAdminService";

import { logAudit } from "@/services/auditLog";
import "@/styles/superadmin.css";

export default function TenantEditPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Campi del form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  /* ============================================================
     LOAD TENANT DATA (NUOVO SCHEMA)
  ============================================================ */
  useEffect(() => {
    async function load() {
      if (!tenantId) return;

      try {
        await logAudit({
          action: "view_tenant_edit",
          entity: "tenant",
          entity_id: tenantId,
          details: {},
        });

        // ⭐ NUOVA RPC
        const data = await getTenantDetailNew(tenantId);

        if (data) {
          setTenant(data);
          setName(data.tenant_name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setVatNumber(data.vat_number || "");
        }
      } catch (err) {
        console.error("Errore caricamento tenant:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tenantId]);

  /* ============================================================
     SAVE CHANGES (NUOVO SCHEMA)
  ============================================================ */
  async function handleSave() {
    if (!tenantId) return;

    try {
      await updateTenantBasicInfo_new(tenantId, {
        name,
        address,
        city,
        vat_number: vatNumber,
      });

      await logAudit({
        action: "update_tenant_basic_info",
        entity: "tenant",
        entity_id: tenantId,
        details: {
          name,
          address,
          city,
          vat_number: vatNumber,
        },
      });

      alert("Modifiche salvate con successo");
      navigate(`/super/tenants/${tenantId}`);
    } catch (err) {
      console.error("Errore salvataggio:", err);
      alert("Errore durante il salvataggio");
    }
  }

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <p className="sa-loading">Caricamento...</p>;
  if (!tenant) return <p className="sa-error">Tenant non trovato.</p>;

  return (
    <div className="sa-dashboard">
      <h1 className="sa-title">Modifica Tenant</h1>

      <div className="sa-card" style={{ width: "100%", maxWidth: "600px" }}>

        {/* COMPANY (non modificabile) */}
        <label>Company</label>
        <input
          className="sa-input"
          value={tenant.company_name}
          disabled
          style={{ opacity: 0.6 }}
        />

        <label>Nome tenant</label>
        <input
          className="sa-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Indirizzo</label>
        <input
          className="sa-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <label>Città</label>
        <input
          className="sa-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <label>Partita IVA</label>
        <input
          className="sa-input"
          value={vatNumber}
          onChange={(e) => setVatNumber(e.target.value)}
        />

        <button className="sa-btn sa-btn-primary" onClick={handleSave}>
          Salva modifiche
        </button>
      </div>
    </div>
  );
}

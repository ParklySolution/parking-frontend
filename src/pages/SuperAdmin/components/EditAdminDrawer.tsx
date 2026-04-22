// src/pages/SuperAdmin/components/EditAdminDrawer.tsx

import React, { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";
import { logAudit } from "@/services/auditLog";

export default function EditAdminDrawer({ open, onClose, admin, onUpdated }) {
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    tenant_id: "",
  });

  // 🔄 Precarica i dati dell'admin selezionato
  useEffect(() => {
    if (admin) {
      const fullName = admin.full_name || "";
      const [first, ...rest] = fullName.split(" ");
      const last = rest.join(" ");

      setForm({
        first_name: first || "",
        last_name: last || "",
        email: admin.email || "",
        tenant_id: admin.tenant_id || "",
      });
    }
  }, [admin]);

  // 🔄 Carica lista tenant
  useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase.from("tenants").select("id, name");
      setTenants(data || []);
    };
    fetchTenants();
  }, []);

  // 💾 SALVA MODIFICHE
  const handleSave = async () => {
    if (!admin) return;

    const fullName = `${form.first_name} ${form.last_name}`;

    // 🔐 Recupera token utente (FIX)
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // 1️⃣ AGGIORNA UTENTE AUTH tramite Edge Function (con token)
    const { error: fnError } = await supabase.functions.invoke(
      "update-admin",
      {
        body: {
          user_id: admin.id,
          email: form.email,
          full_name: fullName,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (fnError) {
      alert("Errore aggiornamento utente: " + fnError.message);
      return;
    }

    // 2️⃣ AGGIORNA PROFILO (FIX: aggiunta email)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        tenant_id: form.tenant_id,
        full_name: fullName,
        email: form.email, // ← FIX IMPORTANTE
        updated_at: new Date().toISOString(),
      })
      .eq("id", admin.id);

    if (profileError) {
      alert("Errore aggiornamento tenant: " + profileError.message);
      return;
    }

    // 3️⃣ AUDIT LOG
    await logAudit({
      action: "update_admin",
      entity: "admin",
      entity_id: admin.id,
      details: {
        full_name: fullName,
        email: form.email,
        tenant_id: form.tenant_id,
      },
    });

    onUpdated();
    onClose();
  };

  if (!open || !admin) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "420px",
        height: "100vh",
        background: "#0b0f14",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-8px 0 25px rgba(0,0,0,0.5)",
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        zIndex: 9999,
      }}
    >
      <h2
        style={{
          color: "#ffffff",
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "4px",
        }}
      >
        Modifica Admin
      </h2>

      <input
        type="text"
        placeholder="Nome"
        value={form.first_name}
        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="Cognome"
        value={form.last_name}
        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        style={inputStyle}
      />

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        style={inputStyle}
      />

      <select
        value={form.tenant_id}
        onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
        style={{
          ...inputStyle,
          cursor: "pointer",
        }}
      >
        <option value="">Seleziona tenant</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
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
          onClick={handleSave}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            background: "#2563eb",
            border: "none",
            color: "#ffffff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Salva Modifiche
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

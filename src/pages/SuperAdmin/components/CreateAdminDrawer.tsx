// src/pages/SuperAdmin/components/CreateAdminDrawer.tsx

import React, { useState, useEffect } from "react";
import { supabase } from "@/services/supabase";
import { logAudit } from "@/services/auditLog";

export default function CreateAdminDrawer({ open, onClose, onCreated }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    tenant_id: "",
  });

  // 🔄 Carica lista tenant
  useEffect(() => {
    const fetchTenants = async () => {
      const { data } = await supabase.from("tenants").select("id, name");
      setTenants(data || []);
    };
    fetchTenants();
  }, []);

  // ⭐ NUOVA VERSIONE: handleCreate con schema unificato
  const handleCreate = async () => {
    if (!form.email || !form.first_name || !form.last_name || !form.tenant_id) {
      alert("Compila tutti i campi");
      return;
    }

    setLoading(true);

    try {
      const fullName = `${form.first_name} ${form.last_name}`;

      // 1️⃣ CREA UTENTE AUTH CON METADATA
      console.log("📦 Creazione utente admin:", {
        email: form.email,
        full_name: fullName,
        tenant_id: form.tenant_id,
      });

      const { data: createdUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: form.email,
          email_confirm: true,
          password: crypto.randomUUID(), // password temporanea
          user_metadata: {
            role: "admin",
            full_name: fullName,
          },
        });

      if (createError) {
        console.error("❌ Errore creazione utente:", createError);
        alert("Errore creazione utente: " + createError.message);
        return;
      }

      const userId = createdUser.user.id;
      console.log("✅ Utente creato con ID:", userId);

      // 2️⃣ CREA PROFILO + ASSEGNA TENANT (NUOVO SCHEMA)
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          full_name: fullName,
          role: "admin",
          tenant_id: form.tenant_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("❌ Errore creazione profilo:", profileError);
        alert("Errore creazione profilo: " + profileError.message);
        return;
      }

      console.log("✅ Profilo creato e tenant assegnato");

      // 3️⃣ AUDIT LOG
      await logAudit({
        action: "create_admin",
        entity: "admin",
        entity_id: userId,
        details: {
          full_name: fullName,
          email: form.email,
          tenant_id: form.tenant_id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      });

      console.log("✅ Admin creato con successo!");

      // 4️⃣ NOTIFICA AL SUPER ADMIN
      alert(
        `Admin ${fullName} creato con successo!\n\nEmail: ${form.email}\nTenant: ${
          tenants.find((t) => t.id === form.tenant_id)?.name
        }\n\nL'admin riceverà una email per impostare la password.`
      );

      onCreated();
      onClose();

      // Reset form
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        tenant_id: "",
      });
    } catch (err) {
      console.error("❌ Errore durante creazione admin:", err);
      alert("Errore imprevisto durante la creazione dell'admin");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

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
        Crea Admin
      </h2>

      <p
        style={{
          color: "#9ca3af",
          fontSize: "13px",
          marginTop: "-8px",
          marginBottom: "8px",
        }}
      >
        Il nuovo admin potrà accedere al portale e gestire il tenant selezionato.
      </p>

      <input
        type="text"
        placeholder="Nome *"
        value={form.first_name}
        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="Cognome *"
        value={form.last_name}
        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        style={inputStyle}
      />

      <input
        type="email"
        placeholder="Email *"
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
        <option value="">Seleziona tenant *</option>
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
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            background: "#111418",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          Annulla
        </button>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            background: "#2563eb",
            border: "none",
            color: "#ffffff",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {loading ? (
            <>
              <span>⏳</span> Creazione in corso...
            </>
          ) : (
            "Crea Admin"
          )}
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
  outline: "none",
  transition: "border-color 0.2s",
};

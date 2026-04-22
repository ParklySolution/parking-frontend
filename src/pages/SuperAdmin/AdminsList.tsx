// src/pages/SuperAdmin/AdminsList.tsx

import React, { useEffect, useState } from "react";
import AdminTable from "./components/AdminTable";
import CreateAdminDrawer from "./components/CreateAdminDrawer";
import EditAdminDrawer from "./components/EditAdminDrawer";
import { supabase } from "@/services/supabase";
import { logAudit } from "@/services/auditLog";

export default function AdminsList() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // ⭐ NUOVA VERSIONE: fetchAdmins basata su profiles
  const fetchAdmins = async () => {
    setLoading(true);

    const { data, error } = await supabase
  .from("profiles")
  .select(`
    id,
    full_name,
    email,
    role,
    created_at,
    tenant_id,
    status,
    tenants:tenant_id (
      name
    )
  `)
  .eq("role", "admin");

    if (error) {
      console.error("❌ Errore caricamento admin:", error);
      setAdmins([]);
    } else {
      setAdmins(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Filtra admin in base alla ricerca
  const filtered = admins.filter((a) => {
    const full = `${a.full_name || ""} ${a.role || ""}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const handleEdit = (admin) => {
    setSelectedAdmin(admin);
    setIsEditOpen(true);
  };

  // ⭐ GESTIONE STATUS ADMIN (NUOVO SCHEMA)
  const handleToggleStatus = async (admin) => {
    if (!admin.tenant_id) {
      console.warn("⚠️ Admin senza tenant assegnato");
      alert("Questo admin non è assegnato a nessun tenant.");
      return;
    }

    const newStatus = admin.status === "suspended" ? "active" : "suspended";

    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", admin.id);

    if (error) {
      console.error("❌ Errore aggiornamento status:", error);
      alert("Errore aggiornamento stato admin");
      return;
    }

    // ⭐ AUDIT LOG
    await logAudit({
      action: newStatus === "active" ? "reactivate_admin" : "suspend_admin",
      entity: "admin",
      entity_id: admin.id,
      details: {
        previous_status: admin.status,
        new_status: newStatus,
        admin_name: admin.full_name,
      },
    });

    fetchAdmins();
  };

  // ⭐ GESTIONE ELIMINAZIONE ADMIN (NUOVO SCHEMA)
  const handleDelete = async (admin) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo admin?")) return;

    try {
      // 1️⃣ Elimina il profilo
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", admin.id);

      if (profileError) {
        console.error("❌ Errore eliminazione profilo:", profileError);
        throw profileError;
      }

      // 2️⃣ Elimina l'utente da auth
      const { error: authError } = await supabase.auth.admin.deleteUser(admin.id);

      if (authError) {
        console.error("❌ Errore eliminazione utente auth:", authError);
      }

      // ⭐ AUDIT LOG
      await logAudit({
        action: "delete_admin",
        entity: "admin",
        entity_id: admin.id,
        details: {
          full_name: admin.full_name,
          role: admin.role,
        },
      });

      fetchAdmins();
    } catch (err) {
      console.error("❌ Errore durante eliminazione admin:", err);
      alert("Errore durante l'eliminazione dell'admin");
    }
  };

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
        <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, margin: 0 }}>
          Gestione Admin
        </h1>
        <p style={{ color: "#4ea8ff", marginTop: "8px", fontSize: "16px" }}>
          Crea, modifica e gestisci gli amministratori della piattaforma.
        </p>
      </div>

      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Cerca admin per nome..."
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

        <button
          onClick={() => setIsCreateOpen(true)}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 500,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          + Crea Admin
        </button>
      </div>

      {/* TABLE */}
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
          <AdminTable
            admins={filtered}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* DRAWERS */}
      <CreateAdminDrawer
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchAdmins}
      />

      <EditAdminDrawer
        open={isEditOpen}
        admin={selectedAdmin}
        onClose={() => setIsEditOpen(false)}
        onUpdated={fetchAdmins}
      />
    </div>
  );
}

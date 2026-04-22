// src/pages/SuperAdmin/components/AdminTable.tsx

import React from "react";

export default function AdminTable({ admins, onEdit, onToggleStatus, onDelete }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        color: "#ffffff",
        fontSize: "14px",
      }}
    >
      <thead>
        <tr>
          <th style={thStyle}>Nome</th>
          <th style={thStyle}>Email</th>
          <th style={thStyle}>Tenant</th>
          <th style={thStyle}>Ruolo</th>
          <th style={thStyle}>Stato</th>
          <th style={thStyle}>Creato il</th>
          <th style={{ ...thStyle, textAlign: "right" }}>Azioni</th>
        </tr>
      </thead>

      <tbody>
        {admins.map((admin) => {
          return (
            <tr key={admin.id} style={rowStyle}>
              {/* NOME */}
              <td style={tdStyle}>{admin.full_name || "—"}</td>

              {/* EMAIL */}
              <td style={{ ...tdStyle, color: "#4ea8ff" }}>
                {admin.email || "—"}
              </td>

              {/* TENANT */}
              <td style={tdStyle}>
                {admin.tenants?.name || "—"}
              </td>

              {/* RUOLO */}
              <td style={tdStyle}>
                {admin.role || "admin"}
              </td>

              {/* STATO */}
              <td style={tdStyle}>
                {admin.status === "active" ? (
                  <span style={{ color: "#4ade80" }}>Attivo</span>
                ) : (
                  <span style={{ color: "#f87171" }}>Sospeso</span>
                )}
              </td>

              {/* DATA CREAZIONE */}
              <td style={{ ...tdStyle, color: "#9ca3af" }}>
                {new Date(admin.created_at).toLocaleDateString()}
              </td>

              {/* AZIONI */}
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <button onClick={() => onEdit(admin)} style={btnBlue}>
                  Modifica
                </button>

                <button
                  onClick={() => onToggleStatus(admin)}
                  style={btnYellow}
                >
                  {admin.status === "active" ? "Sospendi" : "Riattiva"}
                </button>

                <button
                  onClick={() => onDelete(admin)}
                  style={btnRed}
                >
                  Elimina
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "#9ca3af",
  fontWeight: 500,
};

const tdStyle = {
  padding: "12px",
};

const rowStyle = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const btnBase = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  fontSize: "13px",
  cursor: "pointer",
  marginLeft: "6px",
};

const btnBlue = {
  ...btnBase,
  background: "#2563eb",
  color: "#ffffff",
};

const btnYellow = {
  ...btnBase,
  background: "#facc15",
  color: "#000000",
};

const btnRed = {
  ...btnBase,
  background: "#dc2626",
  color: "#ffffff",
};

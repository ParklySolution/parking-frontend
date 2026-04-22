import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  fetchVehicleBrands,
  toggleVehicleBrand,
  createVehicleBrand,
} from "@/services/vehicleBrandsAdminService";

import type { VehicleBrand } from "@/services/vehicleBrandsAdminService";
import BrandModal from "./components/BrandModal";

function VehicleBrands() {
  const { tenantId } = useParams(); // ⭐ tenantId dinamico dalla URL

  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const BLUE = "#3B82F6";

  const load = async () => {
    if (!tenantId) return; // sicurezza
    setLoading(true);
    const data = await fetchVehicleBrands(tenantId);
    setBrands(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tenantId]); // ⭐ ricarica se cambia tenant

  if (loading)
    return (
      <p style={{ color: "#9ca3af", padding: "24px" }}>Caricamento…</p>
    );

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: BLUE,
          }}
        >
          🚗 Marche veicolo
        </h2>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: BLUE,
            color: "#000",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ➕ Nuova marca
        </button>
      </div>

      {/* TABELLA */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#111418",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#1a1f25",
              textAlign: "left",
              color: "#9ca3af",
            }}
          >
            <th style={{ padding: "12px 16px" }}>Nome</th>
            <th style={{ padding: "12px 16px" }}>Attiva</th>
            <th style={{ padding: "12px 16px" }}>Azioni</th>
          </tr>
        </thead>

        <tbody>
          {brands.map((b) => (
            <tr
              key={b.id}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <td style={{ padding: "12px 16px" }}>{b.name}</td>

              <td style={{ padding: "12px 16px" }}>
                {b.is_active ? "✅" : "❌"}
              </td>

              <td style={{ padding: "12px 16px" }}>
                <button
                  onClick={async () => {
                    await toggleVehicleBrand(b.id, !b.is_active);
                    load();
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: b.is_active ? "#ef4444" : BLUE,
                    color: b.is_active ? "#fff" : "#000",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {b.is_active ? "Disattiva" : "Attiva"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODALE */}
      <BrandModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (name) => {
          if (!tenantId) return;
          await createVehicleBrand(tenantId, name);
          await load();
        }}
      />
    </div>
  );
}

export default VehicleBrands;

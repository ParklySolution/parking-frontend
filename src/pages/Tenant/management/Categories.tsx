import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getVehicleCategories,
  toggleVehicleCategory,
  createVehicleCategory,
} from "@/services/vehicleCategoryService";

import type { VehicleCategory } from "@/services/vehicleCategoryService";
import CategoryModal from "./components/CategoryModal";

export default function TenantCategories() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  const load = async () => {
    if (!tenantId) {
      setError("Tenant ID non trovato");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getVehicleCategories(tenantId);
      setCategories(data);
    } catch (err) {
      console.error("Errore caricamento categorie:", err);
      setError("Errore durante il caricamento delle categorie");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div style={{ color: "#ff4444", padding: "24px" }}>
        Errore: Tenant ID non presente nell'URL
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        Caricamento categorie...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "#ff4444", padding: "24px", textAlign: "center" }}>
        {error}
      </div>
    );
  }

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
          🗂️ Categorie veicolo
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
          ➕ Nuova categoria
        </button>
      </div>

      {/* TABELLA */}
      {categories.length === 0 ? (
        <div
          style={{
            background: "#111418",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          Nessuna categoria trovata. Crea la prima categoria!
        </div>
      ) : (
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
            {categories.map((c) => (
              <tr
                key={c.id}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <td style={{ padding: "12px 16px" }}>{c.name}</td>

                <td style={{ padding: "12px 16px" }}>
                  {c.is_active ? "✅" : "❌"}
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={async () => {
                      if (!tenantId) return;
                      try {
                        await toggleVehicleCategory(c.id, !c.is_active);
                        await load();
                      } catch (err) {
                        console.error("Errore toggle categoria:", err);
                        setError("Errore durante l'aggiornamento");
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: c.is_active ? "#ef4444" : BLUE,
                      color: c.is_active ? "#fff" : "#000",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {c.is_active ? "Disattiva" : "Attiva"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODALE */}
      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={async (name) => {
          if (!tenantId) return;
          try {
            await createVehicleCategory(tenantId, name);
            await load();
          } catch (err) {
            console.error("Errore creazione categoria:", err);
            setError("Errore durante la creazione");
          }
        }}
      />
    </div>
  );
}
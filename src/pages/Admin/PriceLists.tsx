import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  fetchPriceLists,
  createPriceList,
  activatePriceList,
  type PriceList,
} from "@/services/priceListsService";

import PricingModal from "./PricingModal";

export default function PriceLists() {
  const { tenantId } = useParams(); // ⭐ tenantId dinamico dalla URL

  const [lists, setLists] = useState<PriceList[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedList, setSelectedList] = useState<PriceList | null>(null);

  const BLUE = "#3B82F6";

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    const data = await fetchPriceLists(tenantId);
    setLists(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tenantId]); // ⭐ ricarica se cambia tenant

  if (loading)
    return (
      <p style={{ color: "#9ca3af", padding: "24px" }}>
        Caricamento listini…
      </p>
    );

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* HEADER */}
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: BLUE,
          marginBottom: "24px",
        }}
      >
        💰 Listini prezzi
      </h2>

      {/* FORM CREAZIONE */}
      <div
        style={{
          background: "#111418",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "32px",
        }}
      >
        <h4
          style={{
            margin: 0,
            marginBottom: "12px",
            fontSize: "18px",
            color: BLUE,
          }}
        >
          ➕ Crea nuovo listino
        </h4>

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <input
            placeholder="Nome listino"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          />

          <input
            placeholder="Descrizione"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              flex: 2,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          />
        </div>

        <button
          onClick={async () => {
            if (!tenantId) return;
            if (!name) return;

            await createPriceList(tenantId, name, description);
            setName("");
            setDescription("");
            load();
          }}
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
          ➕ Crea listino
        </button>
      </div>

      {/* TABELLA LISTINI */}
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
            <th style={{ padding: "12px 16px" }}>Descrizione</th>
            <th style={{ padding: "12px 16px" }}>Attivo</th>
            <th style={{ padding: "12px 16px" }}>Azioni</th>
          </tr>
        </thead>

        <tbody>
          {lists.map((l) => (
            <tr
              key={l.id}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <td style={{ padding: "12px 16px" }}>{l.name}</td>
              <td style={{ padding: "12px 16px" }}>{l.description}</td>
              <td style={{ padding: "12px 16px" }}>
                {l.is_active ? "✅" : "❌"}
              </td>

              <td style={{ padding: "12px 16px", display: "flex", gap: "10px" }}>
                {!l.is_active && (
                  <button
                    onClick={async () => {
                      if (!tenantId) return;
                      await activatePriceList(tenantId, l.id);
                      load();
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: BLUE,
                      color: "#000",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Attiva
                  </button>
                )}

                <button
                  onClick={() => setSelectedList(l)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#4ade80",
                    color: "#000",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✏️ Modifica tariffe
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODALE TARIFFE */}
      {selectedList && (
        <PricingModal
          list={selectedList}
          onClose={() => setSelectedList(null)}
        />
      )}
    </div>
  );
}

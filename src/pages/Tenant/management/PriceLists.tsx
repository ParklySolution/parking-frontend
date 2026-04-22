import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPriceLists,
  createPriceList,
  activatePriceList,
  type PriceList,
} from "@/services/priceListsService";
import PricingModal from "./components/PricingModal";
import ExitButtonsConfig from "./components/ExitButtonsConfig";

export default function TenantPriceLists() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [lists, setLists] = useState<PriceList[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedList, setSelectedList] = useState<PriceList | null>(null);
  const [activeTab, setActiveTab] = useState<'listini' | 'pulsanti'>('listini');

  const BLUE = "#3B82F6";
  const GREEN = "#10b981";

  const load = async () => {
    if (!tenantId) {
      setError("Tenant ID non trovato");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPriceLists(tenantId);
      setLists(data);
    } catch (err) {
      console.error("Errore caricamento listini:", err);
      setError("Errore durante il caricamento dei listini");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenantId]);

  const handleCreateList = async () => {
    if (!tenantId) return;
    if (!name) {
      setError("Inserisci un nome per il listino");
      return;
    }

    try {
      await createPriceList(tenantId, name, description);
      setName("");
      setDescription("");
      setError(null);
      await load();
    } catch (err) {
      console.error("Errore creazione listino:", err);
      setError("Errore durante la creazione del listino");
    }
  };

  const handleActivateList = async (listId: string) => {
    if (!tenantId) return;
    try {
      await activatePriceList(tenantId, listId);
      await load();
    } catch (err) {
      console.error("Errore attivazione listino:", err);
      setError("Errore durante l'attivazione del listino");
    }
  };

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
        Caricamento listini prezzi...
      </div>
    );
  }

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
        💰 Gestione prezzi
      </h2>

      {/* TAB NAVIGATION */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        borderBottom: "2px solid #333",
        marginBottom: "24px"
      }}>
        <button
          onClick={() => setActiveTab('listini')}
          style={{
            padding: "12px 24px",
            background: activeTab === 'listini' ? BLUE : 'transparent',
            border: "none",
            borderRadius: "8px 8px 0 0",
            color: activeTab === 'listini' ? '#000' : '#9ca3af',
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.2s"
          }}
        >
          📋 Listini prezzi
        </button>
        <button
          onClick={() => setActiveTab('pulsanti')}
          style={{
            padding: "12px 24px",
            background: activeTab === 'pulsanti' ? GREEN : 'transparent',
            border: "none",
            borderRadius: "8px 8px 0 0",
            color: activeTab === 'pulsanti' ? '#000' : '#9ca3af',
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "16px",
            transition: "all 0.2s"
          }}
        >
          🎯 Pulsanti uscita
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#ff4444",
            color: "white",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* CONTENUTO TAB */}
      {activeTab === 'listini' ? (
        <>
          {/* FORM CREAZIONE LISTINO */}
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
              onClick={handleCreateList}
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
          {lists.length === 0 ? (
            <div
              style={{
                background: "#111418",
                padding: "40px",
                textAlign: "center",
                borderRadius: "12px",
                color: "#9ca3af",
              }}
            >
              Nessun listino trovato. Crea il primo listino!
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
                          onClick={() => handleActivateList(l.id)}
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
          )}

          {/* MODALE TARIFFE */}
          {selectedList && (
            <PricingModal
              list={selectedList}
              onClose={() => setSelectedList(null)}
            />
          )}
        </>
      ) : (
        /* SEZIONE PULSANTI USCITA */
        <ExitButtonsConfig tenantId={tenantId} />
      )}
    </div>
  );
}
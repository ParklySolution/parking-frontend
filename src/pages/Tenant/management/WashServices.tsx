import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";

/* ======================================================
   TIPI
   ====================================================== */
interface WashService {
  id: string;
  name: string;
  code: string;
  description: string;
  base_duration_minutes: number;
  triggers_fidelity: boolean;
  is_active: boolean;
  tenant_id: string;
}

interface VehicleCategory {
  id: string;
  name: string;
  is_active: boolean;
  tenant_id: string;
}

interface WashServicePrice {
  id: string;
  wash_service_id: string;
  vehicle_category_id: string;
  price: number;
  duration_minutes: number;
  fidelity_points: number;
  tenant_id: string;
}

/* ======================================================
   COMPONENTE PRINCIPALE
   ====================================================== */
export default function TenantWashServices() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [services, setServices] = useState<WashService[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [prices, setPrices] = useState<WashServicePrice[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerService, setDrawerService] = useState<WashService | null>(null); // servizio selezionato per tariffe
  const [drawerPrice, setDrawerPrice] = useState<Partial<WashServicePrice> | null>(null); // tariffa selezionata
  const [drawerEditService, setDrawerEditService] = useState<Partial<WashService> | null>(null); // drawer per creare/modificare servizio

  /* ======================================================
     FETCH DATI
     ====================================================== */
  async function fetchAll() {
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const [svc, cat, prc] = await Promise.all([
        supabase
          .from("wash_service_catalog")
          .select("*")
          .eq("tenant_id", tenantId),
        supabase
          .from("vehicle_categories")
          .select("*")
          .eq("tenant_id", tenantId),
        supabase
          .from("wash_service_prices")
          .select("*")
          .eq("tenant_id", tenantId),
      ]);

      if (svc.error) throw svc.error;
      if (cat.error) throw cat.error;
      if (prc.error) throw prc.error;

      setServices(svc.data || []);
      setCategories(cat.data || []);
      setPrices(prc.data || []);
    } catch (err) {
      console.error("❌ Errore caricamento dati:", err);
      setError("Errore durante il caricamento dei dati");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [tenantId]);

  /* ======================================================
     APRI DRAWER TARIFFE PER SERVIZIO
     ====================================================== */
  function openServiceDrawer(service: WashService) {
    setDrawerService(service);
    setDrawerPrice(null);
  }

  /* ======================================================
     APRI DRAWER MODIFICA/AGGIUNGI TARIFFA
     ====================================================== */
  function openPriceDrawer(price: Partial<WashServicePrice>) {
    setDrawerPrice(price);
  }

  /* ======================================================
     SALVA TARIFFA
     ====================================================== */
  async function savePrice(form: Partial<WashServicePrice>) {
    if (!tenantId || !drawerService) return;

    const payload = {
      tenant_id: tenantId,
      wash_service_id: drawerService.id,
      vehicle_category_id: form.vehicle_category_id,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      fidelity_points: Number(form.fidelity_points),
    };

    try {
      let result;

      if (drawerPrice?.id) {
        result = await supabase
          .from("wash_service_prices")
          .update(payload)
          .eq("id", drawerPrice.id);
      } else {
        result = await supabase.from("wash_service_prices").insert(payload);
      }

      if (result.error) throw result.error;

      setDrawerPrice(null);
      await fetchAll();
    } catch (err) {
      console.error("❌ Errore salvataggio tariffa:", err);
      setError("Errore durante il salvataggio della tariffa");
    }
  }

  /* ======================================================
     APRI DRAWER PER CREARE/MODIFICARE SERVIZIO
     ====================================================== */
  function openEditServiceDrawer(service: WashService | null = null) {
    setDrawerEditService(
      service || {
        name: "",
        code: "",
        description: "",
        base_duration_minutes: 0,
        triggers_fidelity: false,
        is_active: true,
      }
    );
  }

  /* ======================================================
   SALVA SERVIZIO (VERSIONE CORRETTA)
   ====================================================== */
async function saveService(form: Partial<WashService>) {
  if (!tenantId) {
    setError("Tenant ID non trovato");
    return;
  }

  console.log("🔍 FORM RICEVUTO:", form);
  console.log("🔍 TENANT ID:", tenantId);

  // 🔥 VALIDAZIONE: campi obbligatori (ORA CON PREZZO)
  if (!form.name || !form.code || !form.base_duration_minutes || !form.base_price) {
    console.log("❌ Validazione fallita:", {
      name: form.name,
      code: form.code,
      base_duration_minutes: form.base_duration_minutes,
      base_price: form.base_price
    });
    setError("Nome, Codice, Durata e Prezzo base sono obbligatori");
    return;
  }

  // Costruisci payload con TUTTI i campi
  const payload = {
    tenant_id: tenantId,
    name: form.name,
    code: form.code,
    description: form.description || "",
    base_price: Number(form.base_price),
    base_duration_minutes: Number(form.base_duration_minutes),
    parking_bonus_type: form.parking_bonus_type || null,
    parking_bonus_value: form.parking_bonus_value ? Number(form.parking_bonus_value) : null,
    triggers_fidelity: form.triggers_fidelity || false,
    is_active: form.is_active ?? true,
  };

  console.log("📦 PAYLOAD INVIATO:", payload);

  try {
    let result;

    if (form.id) {
      result = await supabase
        .from("wash_service_catalog")
        .update(payload)
        .eq("id", form.id);
    } else {
      result = await supabase.from("wash_service_catalog").insert(payload);
    }

    if (result.error) {
      console.error("❌ ERRORE DB:", result.error);
      throw result.error;
    }

    console.log("✅ SUCCESSO!");
    setDrawerEditService(null);
    await fetchAll();
    setError(null);
  } catch (err) {
    console.error("❌ ECCEZIONE:", err);
    setError("Errore durante il salvataggio del servizio: " + (err as any).message);
  }
}

  /* ======================================================
     UI STATES
     ====================================================== */
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
        Caricamento servizi lavaggio...
      </div>
    );
  }

  /* ======================================================
     UI
     ====================================================== */
  return (
    <div style={{ padding: "32px", color: "#fff" }}>
      <div style={headerRow}>
        <h1 style={pageTitle}>🧼 Servizi Lavaggio</h1>

        <button style={btnPrimary} onClick={() => openEditServiceDrawer()}>
          + Aggiungi Servizio
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

      {/* KPI */}
      <div style={kpiRow}>
        <div style={kpiBox}>
          <div style={kpiLabel}>Servizi Attivi</div>
          <div style={kpiValue}>{services.filter((s) => s.is_active).length}</div>
        </div>

        <div style={kpiBox}>
          <div style={kpiLabel}>Durata Media</div>
          <div style={kpiValue}>
            {services.length
              ? Math.round(
                  services.reduce(
                    (sum, s) => sum + (s.base_duration_minutes || 0),
                    0
                  ) / services.length
                ) + " min"
              : "-"}
          </div>
        </div>

        <div style={kpiBox}>
          <div style={kpiLabel}>Bonus più usato</div>
          <div style={kpiValue}>{services.length ? mostUsedBonus(services) : "-"}</div>
        </div>
      </div>

      {/* CARD LAYOUT */}
      {services.length === 0 ? (
        <div
          style={{
            background: "#111418",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          Nessun servizio di lavaggio trovato. Crea il primo servizio!
        </div>
      ) : (
        <div style={cardGrid}>
          {services.map((svc) => (
            <div key={svc.id} style={serviceCard}>
              <h2 style={cardTitle}>{svc.name}</h2>
              <div style={cardSubtitle}>Codice: {svc.code}</div>
              <div style={cardDescription}>{svc.description}</div>

              <div style={cardInfoRow}>
                <span>Durata base:</span>
                <strong>{svc.base_duration_minutes} min</strong>
              </div>

              <div style={cardInfoRow}>
                <span>Fidelity:</span>
                <strong>{svc.triggers_fidelity ? "Sì" : "No"}</strong>
              </div>

              <div style={cardInfoRow}>
                <span>Attivo:</span>
                <strong>{svc.is_active ? "Sì" : "No"}</strong>
              </div>

              <div style={cardButtons}>
                <button style={btnSecondary} onClick={() => openEditServiceDrawer(svc)}>
                  Modifica Servizio
                </button>

                <button style={btnPrimary} onClick={() => openServiceDrawer(svc)}>
                  Gestisci Tariffe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER TARIFFE PER SERVIZIO */}
      {drawerService && (
        <Drawer onClose={() => setDrawerService(null)} title={`Tariffe — ${drawerService.name}`}>
          <div style={{ marginBottom: "20px" }}>
            <button
              style={btnPrimary}
              onClick={() =>
                openPriceDrawer({
                  vehicle_category_id: "",
                  price: 0,
                  duration_minutes: 0,
                  fidelity_points: 0,
                })
              }
            >
              + Aggiungi Tariffa
            </button>
          </div>

          <table style={priceTable}>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Prezzo</th>
                <th>Durata</th>
                <th>Punti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {prices
                .filter((p) => p.wash_service_id === drawerService.id)
                .map((p) => {
                  const cat = categories.find((c) => c.id === p.vehicle_category_id);
                  return (
                    <tr key={p.id}>
                      <td>{cat?.name || "-"}</td>
                      <td>€ {p.price}</td>
                      <td>{p.duration_minutes} min</td>
                      <td>{p.fidelity_points}</td>
                      <td>
                        <button style={btnSmall} onClick={() => openPriceDrawer(p)}>
                          Modifica
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Drawer>
      )}

      {/* DRAWER MODIFICA TARIFFA */}
      {drawerPrice && (
        <Drawer
          onClose={() => setDrawerPrice(null)}
          title={drawerPrice.id ? "Modifica Tariffa" : "Nuova Tariffa"}
        >
          <PriceForm
            categories={categories}
            initial={drawerPrice}
            onSave={savePrice}
            onCancel={() => setDrawerPrice(null)}
          />
        </Drawer>
      )}

      {/* DRAWER CREAZIONE/MODIFICA SERVIZIO */}
      {drawerEditService && (
        <Drawer
          onClose={() => setDrawerEditService(null)}
          title={drawerEditService.id ? "Modifica Servizio" : "Nuovo Servizio"}
        >
          <ServiceForm
            initial={drawerEditService}
            onSave={saveService}
            onCancel={() => setDrawerEditService(null)}
          />
        </Drawer>
      )}
    </div>
  );
}

/* ======================================================
   COMPONENTE DRAWER
   ====================================================== */
function Drawer({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={drawerOverlay}>
      <div style={drawer}>
        <div style={drawerHeader}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button style={drawerClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={drawerContent}>{children}</div>
      </div>
    </div>
  );
}

/* ======================================================
   FORM TARIFFA
   ====================================================== */
function PriceForm({
  categories,
  initial,
  onSave,
  onCancel,
}: {
  categories: VehicleCategory[];
  initial: Partial<WashServicePrice>;
  onSave: (form: Partial<WashServicePrice>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update(field: keyof WashServicePrice, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <label style={label}>Categoria</label>
      <select
        style={input}
        value={form.vehicle_category_id || ""}
        disabled={!!initial.id}
        onChange={(e) => update("vehicle_category_id", e.target.value)}
      >
        <option value="">Seleziona categoria</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <label style={label}>Prezzo (€)</label>
      <input
        style={input}
        type="number"
        step="0.01"
        value={form.price || 0}
        onChange={(e) => update("price", e.target.value)}
      />

      <label style={label}>Durata (min)</label>
      <input
        style={input}
        type="number"
        value={form.duration_minutes || 0}
        onChange={(e) => update("duration_minutes", e.target.value)}
      />

      <label style={label}>Punti Fidelity</label>
      <input
        style={input}
        type="number"
        value={form.fidelity_points || 0}
        onChange={(e) => update("fidelity_points", e.target.value)}
      />

      <div style={drawerFooter}>
        <button style={btnSecondary} onClick={onCancel}>
          Annulla
        </button>
        <button style={btnPrimary} onClick={() => onSave(form)}>
          Salva
        </button>
      </div>
    </div>
  );
}

/* ======================================================
   FORM SERVIZIO
   ====================================================== */
function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<WashService>;
  onSave: (form: Partial<WashService>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update(field: keyof WashService, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <label style={label}>Nome Servizio *</label>
      <input
        style={input}
        value={form.name || ""}
        onChange={(e) => update("name", e.target.value)}
        required
      />

      <label style={label}>Codice * (univoco)</label>
      <input
        style={input}
        value={form.code || ""}
        onChange={(e) => update("code", e.target.value)}
        required
        placeholder="Es. LAV-STD"
      />

      <label style={label}>Descrizione</label>
      <textarea
        style={input}
        value={form.description || ""}
        onChange={(e) => update("description", e.target.value)}
      />

      {/* 🔥 CAMPI OBBLIGATORI AGGIUNTI */}
      <label style={label}>Prezzo Base (€) *</label>
      <input
        style={input}
        type="number"
        step="0.01"
        min="0"
        value={form.base_price || 0}
        onChange={(e) => update("base_price", e.target.value)}
        required
      />

      <label style={label}>Durata Base (min) *</label>
      <input
        style={input}
        type="number"
        min="0"
        value={form.base_duration_minutes || 0}
        onChange={(e) => update("base_duration_minutes", e.target.value)}
        required
      />

      <label style={label}>Tipo Bonus (opzionale)</label>
      <input
        style={input}
        value={form.parking_bonus_type || ""}
        onChange={(e) => update("parking_bonus_type", e.target.value)}
        placeholder="Es. fidelity, discount"
      />

      <label style={label}>Valore Bonus (opzionale)</label>
      <input
        style={input}
        type="number"
        step="0.01"
        min="0"
        value={form.parking_bonus_value || 0}
        onChange={(e) => update("parking_bonus_value", e.target.value)}
      />

      <label style={label}>Attiva Fidelity</label>
      <input
        type="checkbox"
        checked={form.triggers_fidelity || false}
        onChange={(e) => update("triggers_fidelity", e.target.checked)}
      />

      <label style={label}>Servizio Attivo</label>
      <input
        type="checkbox"
        checked={form.is_active ?? true}
        onChange={(e) => update("is_active", e.target.checked)}
      />

      <div style={drawerFooter}>
        <button style={btnSecondary} onClick={onCancel}>
          Annulla
        </button>
        <button style={btnPrimary} onClick={() => onSave(form)}>
          Salva Servizio
        </button>
      </div>
    </div>
  );
}

/* ======================================================
   STILI PREMIUM — PARKING LABS
   ====================================================== */

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const pageTitle = {
  fontSize: "28px",
  fontWeight: 700,
  color: "#3B82F6",
  margin: 0,
};

const kpiRow = {
  display: "flex",
  gap: "20px",
  marginBottom: "30px",
};

const kpiBox = {
  background: "#1b263b",
  padding: "20px",
  borderRadius: "12px",
  flex: 1,
  color: "white",
  border: "1px solid rgba(255,255,255,0.06)",
};

const kpiLabel = { fontSize: "14px", opacity: 0.7, marginBottom: "4px" };
const kpiValue = { fontSize: "26px", fontWeight: 700 };

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "20px",
};

const serviceCard = {
  background: "#1b263b",
  color: "white",
  padding: "20px",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const cardTitle = { fontSize: "20px", fontWeight: 700, margin: "0 0 4px 0", color: "#3B82F6" };
const cardSubtitle = { fontSize: "14px", opacity: 0.8, marginBottom: "8px" };
const cardDescription = { fontSize: "14px", opacity: 0.9, marginBottom: "12px" };

const cardInfoRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "14px",
  opacity: 0.9,
  marginBottom: "4px",
};

const cardButtons = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "16px",
  gap: "8px",
};

const btnPrimary = {
  background: "#3B82F6",
  color: "white",
  padding: "8px 14px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const btnSecondary = {
  background: "white",
  color: "#1b263b",
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const btnSmall = {
  background: "#3B82F6",
  color: "white",
  padding: "4px 8px",
  borderRadius: "4px",
  border: "none",
  cursor: "pointer",
  fontSize: "12px",
};

const priceTable = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const drawerOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 9999,
};

const drawer = {
  width: "420px",
  height: "100%",
  background: "#ffffff",
  padding: "32px",
  boxShadow: "-4px 0 12px rgba(0,0,0,0.15)",
  overflowY: "auto",
  borderLeft: "1px solid #e5e7eb",
};

const drawerHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const drawerClose = {
  background: "transparent",
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
};

const drawerContent = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const drawerFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "20px",
};

const label = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#1f2937",
  marginBottom: "4px",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  color: "#111827",
  background: "#ffffff",
  boxSizing: "border-box" as const,
};

/* ======================================================
   FUNZIONE DI SUPPORTO — BONUS PIÙ USATO
   ====================================================== */
function mostUsedBonus(services: WashService[]) {
  // Per ora placeholder: in futuro potremo collegarlo a una tabella "wash_bonuses"
  // oppure calcolarlo in base alle tariffe/fidelity.
  // Per non rompere nulla, restituiamo un valore statico elegante.
  return "Fidelity attivo";
}
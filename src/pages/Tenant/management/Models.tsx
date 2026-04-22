import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  is_active: boolean;
  brand: Brand;
  category: Category;
}

export default function TenantModels() {
  const { tenantId } = useParams<{ tenantId: string }>();
  
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BLUE = "#3B82F6";

  async function loadAll() {
    if (!tenantId) {
      setError("Tenant ID non trovato");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: m }, { data: b }, { data: c }] = await Promise.all([
        supabase
          .from("vehicle_models")
          .select(`
            id,
            name,
            is_active,
            vehicle_brands ( id, name ),
            vehicle_categories ( id, name )
          `)
          .eq("tenant_id", tenantId)
          .order("name"),

        supabase
          .from("vehicle_brands")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("vehicle_categories")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name"),
      ]);

      setModels(
        (m ?? []).map((x: any) => ({
          id: x.id,
          name: x.name,
          is_active: x.is_active,
          brand: x.vehicle_brands,
          category: x.vehicle_categories,
        }))
      );

      setBrands(b ?? []);
      setCategories(c ?? []);
    } catch (err) {
      console.error("Errore caricamento modelli:", err);
      setError("Errore durante il caricamento dei modelli");
    } finally {
      setLoading(false);
    }
  }

  async function createModel() {
    if (!tenantId) return;
    
    if (!name || !brandId || !categoryId) {
      setError("Compila tutti i campi");
      return;
    }

    try {
      const { error } = await supabase.from("vehicle_models").insert({
        tenant_id: tenantId,
        name,
        brand_id: brandId,
        category_id: categoryId,
        is_active: true,
      });

      if (error) throw error;

      setName("");
      setBrandId("");
      setCategoryId("");
      setError(null);
      await loadAll();
    } catch (err) {
      console.error("Errore creazione modello:", err);
      setError("Errore durante la creazione del modello");
    }
  }

  useEffect(() => {
    loadAll();
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
        Caricamento modelli...
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
        🚘 Modelli veicolo
      </h2>

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

      {/* FORM NUOVO MODELLO */}
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
          ➕ Nuovo modello
        </h4>

        <input
          placeholder="Nome modello (es. Panda)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#0d1117",
            color: "#fff",
            marginBottom: "12px",
          }}
        />

        <div style={{ display: "flex", gap: "12px" }}>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          >
            <option value="">Seleziona marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0d1117",
              color: "#fff",
            }}
          >
            <option value="">Seleziona categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createModel}
          style={{
            marginTop: "16px",
            background: BLUE,
            color: "#000",
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Salva modello
        </button>
      </div>

      {/* TABELLA */}
      {models.length === 0 ? (
        <div
          style={{
            background: "#111418",
            padding: "40px",
            textAlign: "center",
            borderRadius: "12px",
            color: "#9ca3af",
          }}
        >
          Nessun modello trovato. Crea il primo modello!
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
              <th style={{ padding: "12px 16px" }}>Modello</th>
              <th style={{ padding: "12px 16px" }}>Marca</th>
              <th style={{ padding: "12px 16px" }}>Categoria</th>
              <th style={{ padding: "12px 16px" }}>Attivo</th>
            </tr>
          </thead>

          <tbody>
            {models.map((m) => (
              <tr
                key={m.id}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <td style={{ padding: "12px 16px" }}>{m.name}</td>
                <td style={{ padding: "12px 16px" }}>{m.brand?.name}</td>
                <td style={{ padding: "12px 16px" }}>{m.category?.name}</td>
                <td style={{ padding: "12px 16px" }}>
                  {m.is_active ? "✅" : "❌"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
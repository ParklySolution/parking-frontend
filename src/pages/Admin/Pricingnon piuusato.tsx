import { useEffect, useState } from "react";
import { getVehicleCategories } from "@/services/vehicleCategoriesService";
import { fetchBaseTariffs, upsertBaseTariff } from "@/services/pricingService";

const TENANT_ID = "5f018af5-8e61-4c5c-a4f8-aa08edcadcb5";

export default function Pricing() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<Record<string, any>>({});

  const BLUE = "#3B82F6";

  useEffect(() => {
    const load = async () => {
      const cats = await getVehicleCategories(TENANT_ID);
      const rules = await fetchBaseTariffs(TENANT_ID);

      const map: Record<string, any> = {};

      rules.forEach((r: any) => {
        if (!map[r.category_id]) map[r.category_id] = {};

        map[r.category_id].price_list_id = r.price_list_id;

        if (r.rule_type === "hourly") map[r.category_id].hourly = r.value;
        if (r.rule_type === "daily_cap") map[r.category_id].daily_cap = r.value;
        if (r.rule_type === "first_hour") map[r.category_id].first_hour = r.first_hour_price;
        if (r.rule_type === "next_hours") map[r.category_id].next_hours = r.next_hours_price;
      });

      setCategories(cats);
      setTariffs(map);
    };

    load();
  }, []);

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: BLUE,
          marginBottom: "24px",
        }}
      >
        💰 Tariffe base
      </h2>

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
            <th style={{ padding: "12px 16px" }}>Categoria</th>
            <th style={{ padding: "12px 16px" }}>Prima ora (€)</th>
            <th style={{ padding: "12px 16px" }}>Ore successive (€)</th>
            <th style={{ padding: "12px 16px" }}>Tariffa unica (€)</th>
            <th style={{ padding: "12px 16px" }}>Max giornaliero</th>
            <th style={{ padding: "12px 16px" }}></th>
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

              {/* FIRST HOUR */}
              <td style={{ padding: "12px 16px" }}>
                <input
                  type="number"
                  step="0.1"
                  value={tariffs[c.id]?.first_hour ?? ""}
                  onChange={(e) =>
                    setTariffs({
                      ...tariffs,
                      [c.id]: {
                        price_list_id: tariffs[c.id]?.price_list_id,
                        first_hour: Number(e.target.value),
                        next_hours: tariffs[c.id]?.next_hours ?? undefined,
                        hourly: undefined,
                        daily_cap: tariffs[c.id]?.daily_cap ?? undefined,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </td>

              {/* NEXT HOURS */}
              <td style={{ padding: "12px 16px" }}>
                <input
                  type="number"
                  step="0.1"
                  value={tariffs[c.id]?.next_hours ?? ""}
                  onChange={(e) =>
                    setTariffs({
                      ...tariffs,
                      [c.id]: {
                        price_list_id: tariffs[c.id]?.price_list_id,
                        next_hours: Number(e.target.value),
                        first_hour: tariffs[c.id]?.first_hour ?? undefined,
                        hourly: undefined,
                        daily_cap: tariffs[c.id]?.daily_cap ?? undefined,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </td>

              {/* TARIFFA UNICA */}
              <td style={{ padding: "12px 16px" }}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Tariffa unica"
                  value={tariffs[c.id]?.hourly ?? ""}
                  onChange={(e) =>
                    setTariffs({
                      ...tariffs,
                      [c.id]: {
                        price_list_id: tariffs[c.id]?.price_list_id,
                        hourly: Number(e.target.value),
                        first_hour: undefined,
                        next_hours: undefined,
                        daily_cap: tariffs[c.id]?.daily_cap ?? undefined,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </td>

              {/* DAILY CAP */}
              <td style={{ padding: "12px 16px" }}>
                <input
                  type="number"
                  step="0.1"
                  value={tariffs[c.id]?.daily_cap ?? ""}
                  onChange={(e) =>
                    setTariffs({
                      ...tariffs,
                      [c.id]: {
                        price_list_id: tariffs[c.id]?.price_list_id,
                        daily_cap: Number(e.target.value),
                        hourly: tariffs[c.id]?.hourly ?? undefined,
                        first_hour: tariffs[c.id]?.first_hour ?? undefined,
                        next_hours: tariffs[c.id]?.next_hours ?? undefined,
                      },
                    })
                  }
                  style={inputStyle}
                />
              </td>

              {/* SAVE BUTTON */}
              <td style={{ padding: "12px 16px" }}>
                <button
                  onClick={() =>
                    upsertBaseTariff(
                      TENANT_ID,
                      tariffs[c.id].price_list_id,
                      c.id,
                      tariffs[c.id].hourly,
                      tariffs[c.id].daily_cap,
                      tariffs[c.id].first_hour,
                      tariffs[c.id].next_hours
                    )
                  }
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
                  💾 Salva
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d1117",
  color: "#fff",
};

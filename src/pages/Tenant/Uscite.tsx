import TenantLayout from "./layout/TenantLayout";

export default function TenantUscite() {
  return (
    <TenantLayout>
      {/* HEADER */}
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            color: "#4ea8ff",
            fontSize: "30px",
            fontWeight: 700,
            margin: 0,
          }}
        >
          Uscite
        </h1>

        <p
          style={{
            color: "#9ca3af",
            marginTop: "6px",
            fontSize: "15px",
          }}
        >
          Panoramica delle uscite registrate nel parcheggio.
        </p>
      </div>

      {/* KPI BOXES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Uscite oggi</p>
          <h3
            style={{
              color: "#4ea8ff",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            —
          </h3>
        </div>

        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Uscite questa settimana</p>
          <h3
            style={{
              color: "#4ea8ff",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            —
          </h3>
        </div>

        <div
          style={{
            background: "#111418",
            borderRadius: "12px",
            padding: "18px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#9ca3af", fontSize: "13px" }}>Uscite totali</p>
          <h3
            style={{
              color: "#4ea8ff",
              fontSize: "26px",
              fontWeight: 700,
              marginTop: "8px",
            }}
          >
            —
          </h3>
        </div>
      </div>

      {/* TABLE / LISTA USCITE */}
      <div
        style={{
          background: "#0b0f14",
          borderRadius: "14px",
          padding: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
        }}
      >
        <h3
          style={{
            color: "#fff",
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          Storico uscite
        </h3>

        <p style={{ color: "#9ca3af" }}>
          Nessuna uscita registrata al momento.
        </p>
      </div>
    </TenantLayout>
  );
}

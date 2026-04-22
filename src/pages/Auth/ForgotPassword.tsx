import { useState } from "react";
import { supabase } from "@/services/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/auth/reset",
    });

    setLoading(false);

    if (error) {
      alert("Errore: " + error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: "40px",
        borderRadius: "16px",
        background: "#ffffff",
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}
    >
      {!sent ? (
        <>
          <h2 style={{ marginBottom: 10, fontSize: 28, fontWeight: 700 }}>
            🔐 Recupera Password
          </h2>

          <p style={{ color: "#555", marginBottom: 30 }}>
            Inserisci la tua email per ricevere il link di reset.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "18px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                background: "#2563eb",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {loading ? "Invio..." : "Invia link di reset"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: 10, fontSize: 28, fontWeight: 700 }}>
            📩 Email inviata
          </h2>
          <p style={{ color: "#555" }}>
            Controlla la tua casella email e clicca sul link per reimpostare la
            password.
          </p>
        </>
      )}
    </div>
  );
}

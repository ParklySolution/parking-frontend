import { useState } from "react";
import { supabase } from "@/services/supabase";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const accessToken = searchParams.get("access_token");

  async function handleReset() {
    if (!accessToken) {
      alert("Token non valido o mancante.");
      return;
    }

    setLoading(true); 
    
    console.log("TOKEN:", accessToken);

    const { error } = await supabase.auth.updateUser(
      { password },
      { accessToken }
    );

    setLoading(false);

    if (error) {
      alert("Errore: " + error.message);
      return;
    }

    alert("Password aggiornata con successo!");
    navigate("/admin/login");
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
      <h2 style={{ marginBottom: 10, fontSize: 28, fontWeight: 700 }}>
        🔐 Reimposta Password
      </h2>

      <p style={{ color: "#555", marginBottom: 30 }}>
        Inserisci la nuova password per il tuo account.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        {/* ⭐ Campo email visivamente nascosto (accessibility compliant) */}
        <label
          htmlFor="hidden-email"
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        >
          Email
        </label>
        <input
          id="hidden-email"
          type="email"
          name="email"
          autoComplete="username"
          value="placeholder@example.com"
          readOnly
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        />

        <input
          type="password"
          placeholder="Nuova password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
            transition: "0.2s",
          }}
        >
          {loading ? "Aggiornamento..." : "Aggiorna Password"}
        </button>
      </form>
    </div>
  );
}

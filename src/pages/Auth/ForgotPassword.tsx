import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const colors = {
    primary: "#3B82F6",
    bgDark: "#0f172a",
    bgCard: "#1e293b",
    border: "#334155",
    textPrimary: "#ffffff",
    textSecondary: "#94a3b8",
    errorBg: "rgba(239, 68, 68, 0.1)",
    errorBorder: "rgba(239, 68, 68, 0.3)",
    errorText: "#f87171",
    successBg: "rgba(16, 185, 129, 0.1)",
    successBorder: "rgba(16, 185, 129, 0.3)",
    successText: "#34d399",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore durante l'invio");
      }

      setMessage("Se l'email esiste, riceverai un link per reimpostare la password.");
      setEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 100%)`,
      padding: "16px",
    }}>
      <div style={{
        maxWidth: "440px",
        width: "100%",
        background: colors.bgCard,
        borderRadius: "24px",
        padding: "40px 32px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: `1px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: `linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%)`,
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: colors.textPrimary, marginBottom: "8px" }}>
            Password dimenticata?
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: "14px" }}>
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
        </div>

        {error && (
          <div style={{
            marginBottom: "24px",
            padding: "12px 16px",
            background: colors.errorBg,
            border: `1px solid ${colors.errorBorder}`,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.errorText} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: colors.errorText, fontSize: "14px" }}>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            marginBottom: "24px",
            padding: "12px 16px",
            background: colors.successBg,
            border: `1px solid ${colors.successBorder}`,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.successText} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ color: colors.successText, fontSize: "14px" }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: colors.textSecondary,
              marginBottom: "8px",
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="admin@azienda.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0f172a",
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                color: colors.textPrimary,
                fontSize: "15px",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: `linear-gradient(135deg, ${colors.primary} 0%, #8b5cf6 100%)`,
              border: "none",
              borderRadius: "12px",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Invio in corso..." : "Invia link"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link
            to="/admin/login"
            style={{
              fontSize: "14px",
              color: colors.textSecondary,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
          >
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
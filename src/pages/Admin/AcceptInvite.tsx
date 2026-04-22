import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);

  // Valida il token all'avvio (opzionale, possiamo rimuoverlo se causa problemi)
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false);
        return;
      }

      // Non facciamo più la validazione con verifyOtp perché useremo la nostra funzione
      // Lasciamo solo un piccolo delay per mostrare lo stato di caricamento
      setTimeout(() => {
        setValidating(false);
      }, 500);
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    
    if (password.length < 6) {
      setError("La password deve essere almeno 6 caratteri");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 🔥 CHIAMIAMO LA NOSTRA EDGE FUNCTION PERSONALIZZATA
      const { data, error: functionError } = await supabase.functions.invoke("verify-invite", {
        body: {
          token,
          password
        }
      });

      if (functionError) {
        console.error("Errore dalla funzione:", functionError);
        throw new Error(functionError.message || "Errore durante la verifica dell'invito");
      }

      // Se tutto è andato bene, l'utente è stato confermato e la password impostata
      setSuccess(true);
      
      // Reindirizza alla dashboard admin dopo 3 secondi
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
      
    } catch (err: any) {
      console.error("❌ ERRORE:", err);
      setError(err.message || "Errore durante l'accettazione dell'invito");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ 
        padding: "48px 24px", 
        textAlign: "center",
        maxWidth: "400px",
        margin: "0 auto",
        color: "#fff"
      }}>
        <h2 style={{ color: "#ff4444", marginBottom: "16px" }}>
          Link non valido
        </h2>
        <p style={{ color: "#9ca3af" }}>
          Il link di invito non contiene un token valido.
        </p>
      </div>
    );
  }

  if (validating) {
    return (
      <div style={{ 
        padding: "48px 24px", 
        textAlign: "center",
        color: "#fff"
      }}>
        <p>Verifica del link in corso...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ 
        padding: "48px 24px", 
        textAlign: "center",
        maxWidth: "400px",
        margin: "0 auto",
        color: "#fff"
      }}>
        <h2 style={{ color: "#4f9cff", marginBottom: "16px" }}>
          ✅ Password impostata con successo!
        </h2>
        <p style={{ color: "#9ca3af" }}>
          Verrai reindirizzato alla dashboard admin...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: "400px",
      margin: "50px auto",
      padding: "24px",
      background: "#111418",
      borderRadius: "12px",
      color: "#fff"
    }}>
      <h2 style={{ color: "#4f9cff", marginBottom: "20px" }}>
        Accetta Invito
      </h2>
      
      {error && (
        <div style={{
          background: "#ff4444",
          color: "white",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "6px",
            color: "#9ca3af",
            fontSize: "14px"
          }}>
            Nuova Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1a1f2a",
              border: "1px solid #2d3748",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "14px"
            }}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
            Minimo 6 caratteri
          </small>
        </div>
        
        <div style={{ marginBottom: "24px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "6px",
            color: "#9ca3af",
            fontSize: "14px"
          }}>
            Conferma Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1a1f2a",
              border: "1px solid #2d3748",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "14px"
            }}
            required
            autoComplete="new-password"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#4b5563" : "#4f9cff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            fontSize: "14px",
            fontWeight: "bold"
          }}
        >
          {loading ? "Elaborazione..." : "Imposta Password e Accedi"}
        </button>
      </form>
    </div>
  );
}
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/services/supabase";
import { useParams } from "react-router-dom";

export default function TenantUsers() {
  const { tenantId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  
  // Stato per il menu dropdown
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Ref per il menu dropdown
  const menuRef = useRef<HTMLDivElement>(null);

  async function loadUsers() {
    setLoading(true);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, [tenantId]);

  // Chiudi il menu quando si clicca fuori
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreate(role: "admin" | "operator") {
    setSending(true);
    setError("");

    const endpoint = role === "admin" ? "create-admin" : "create-operator";

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          full_name: fullName,
          tenant_id: tenantId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Errore durante l'invio dell'invito");
      setSending(false);
      return;
    }

    setSending(false);
    setShowAdminModal(false);
    setShowOperatorModal(false);
    setFullName("");
    setEmail("");

    loadUsers();
  }

  // Funzione per attivare/disattivare utente
  async function toggleUserStatus(user: any) {
    const newStatus = !user.disabled;

    // 1) Aggiorna profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ disabled: newStatus })
      .eq("id", user.id);

    if (profileError) {
      console.error("❌ Errore aggiornamento profiles:", profileError);
      alert("Errore durante l'aggiornamento dello stato");
      return;
    }

    // 2) Aggiorna auth metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { disabled: newStatus },
    });

    if (authError) {
      console.error("❌ Errore aggiornamento auth metadata:", authError);
      alert("Errore durante l'aggiornamento dei metadati");
      return;
    }

    // 3) Aggiorna UI
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, disabled: newStatus } : u
      )
    );

    setOpenMenu(null);
  }

  // Funzione reset password
  async function resetPassword(user: any) {
    try {
      if (!user.email) {
        alert("Utente senza email, impossibile inviare il reset");
        return;
      }

      console.log("📧 Invio reset password per:", user.email);

      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
      });

      if (error) {
        console.error("❌ Errore reset password:", error);
        alert("Errore durante il reset password: " + error.message);
        return;
      }

      console.log("✅ Reset password inviato:", data);
      alert(`Email di reset inviata a ${user.email}\n\nL'utente riceverà un link per impostare una nuova password.`);
      setOpenMenu(null);
    } catch (err: any) {
      console.error("❌ Errore imprevisto reset password:", err);
      alert("Errore imprevisto: " + err.message);
    }
  }

  // Funzione cambio ruolo
  async function changeUserRole(user: any) {
    try {
      const newRole = user.role === "admin" ? "operator" : "admin";

      // Protezione: non puoi cambiare il tuo stesso ruolo
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id === user.id) {
        alert("Non puoi cambiare il ruolo del tuo stesso account.");
        return;
      }

      // 1) Aggiorna profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (profileError) {
        console.error("❌ Errore aggiornamento profiles:", profileError);
        alert("Errore durante il cambio ruolo");
        return;
      }

      // 2) Aggiorna auth metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { role: newRole },
      });

      if (authError) {
        console.error("❌ Errore aggiornamento auth metadata:", authError);
        alert("Errore durante l'aggiornamento dei metadati");
        return;
      }

      // 3) Aggiorna UI
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, role: newRole } : u
        )
      );

      setOpenMenu(null);
      alert(`Ruolo aggiornato: ${newRole === "admin" ? "Admin" : "Operatore"}`);
    } catch (err: any) {
      console.error("❌ Errore cambio ruolo:", err);
      alert("Errore durante il cambio ruolo: " + err.message);
    }
  }

  // Funzione eliminazione utente
  async function deleteUser(user: any) {
    try {
      // Protezione: non puoi eliminare te stesso
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id === user.id) {
        alert("Non puoi eliminare il tuo stesso account.");
        return;
      }

      // Doppia conferma
      if (!confirm(`Sei sicuro di voler eliminare l'utente ${user.full_name}?`)) return;
      if (!confirm("Questa azione è irreversibile. Confermi?")) return;

      // 1) Elimina da Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) {
        alert("Errore durante l'eliminazione dell'utente: " + authError.message);
        return;
      }

      // 2) Elimina da profiles
      await supabase.from("profiles").delete().eq("id", user.id);

      // 3) Aggiorna UI
      setUsers((prev) => prev.filter((u) => u.id !== user.id));

      setOpenMenu(null);
      alert("Utente eliminato correttamente.");
    } catch (err: any) {
      console.error("❌ Errore eliminazione utente:", err);
      alert("Errore imprevisto: " + err.message);
    }
  }

  // Funzione per la ricerca
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        hidden: !u.full_name?.toLowerCase().includes(q) && 
                !u.email?.toLowerCase().includes(q),
      }))
    );
  };

  // Funzione per il filtro ruolo
  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        hidden: role !== "all" && u.role !== role,
      }))
    );
  };

  return (
    <div style={{ padding: "30px", background: "#0d0f12", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 600, marginBottom: "25px" }}>
        Gestione Utenti
      </h1>

      {/* Barra di ricerca */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          placeholder="Cerca per nome o email..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#111418",
            color: "#fff",
          }}
          onChange={handleSearch}
        />

        <select
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#111418",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          onChange={handleRoleFilter}
        >
          <option value="all">Tutti i ruoli</option>
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
        </select>
      </div>

      {/* Pulsanti */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "25px" }}>
        <button onClick={() => setShowAdminModal(true)} style={buttonPrimary}>
          + Crea Admin
        </button>

        <button
          onClick={() => setShowOperatorModal(true)}
          style={buttonSecondary}
        >
          + Crea Operatore
        </button>
      </div>

      {/* Tabella - con overflow visible per la colonna azioni */}
      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <p style={{ color: "#9ca3af" }}>Caricamento utenti...</p>
        ) : users.filter((u) => !u.hidden).length === 0 ? (
          <p style={{ color: "#9ca3af" }}>Nessun utente trovato.</p>
        ) : (
          <table style={{ ...tableStyle, width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Ruolo</th>
                <th style={thStyle}>Creato il</th>
                <th style={{ ...thStyle, width: "80px" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => !u.hidden)
                .map((u) => (
                  <tr key={u.id} style={rowStyle(u.disabled)}>
                    <td style={tdStyle}>{u.full_name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          background:
                            u.role === "admin"
                              ? "rgba(79,140,255,0.2)"
                              : "rgba(0,200,120,0.2)",
                          color:
                            u.role === "admin"
                              ? "#4f8cff"
                              : "#00c878",
                        }}
                      >
                        {u.role === "admin" ? "Admin" : "Operatore"}
                      </span>
                      {/* Badge DISATTIVATO */}
                      {u.disabled && (
                        <span
                          style={{
                            marginLeft: "8px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            background: "rgba(255,0,0,0.2)",
                            color: "#ff4444",
                          }}
                        >
                          DISATTIVATO
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {new Date(u.created_at).toLocaleString()}
                    </td>

                    {/* ⭐ Menu azioni con posizionamento migliorato */}
                    <td style={{ ...tdStyle, textAlign: "center", position: "relative" }}>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9ca3af",
                          fontSize: "20px",
                          cursor: "pointer",
                          padding: "8px 12px",
                          borderRadius: "4px",
                        }}
                        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      >
                        ⋮
                      </button>

                      {openMenu === u.id && (
                        <div
                          ref={menuRef}
                          style={{
                            position: "fixed",
                            background: "#1a1f25",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: "12px",
                            padding: "8px 0",
                            width: "220px",
                            zIndex: 9999,
                            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {/* Toggle attivo/disattivo */}
                          <div
                            style={menuItemStyle}
                            onClick={async () => {
                              const { data: { user: currentUser } } = await supabase.auth.getUser();
                              if (currentUser?.id === u.id) {
                                alert("Non puoi disattivare te stesso");
                                setOpenMenu(null);
                                return;
                              }
                              await toggleUserStatus(u);
                            }}
                          >
                            {u.disabled ? "🔓 Riattiva utente" : "🔒 Disattiva utente"}
                          </div>

                          {/* Reset password */}
                          <div
                            style={menuItemStyle}
                            onClick={async () => {
                              const { data: { user: currentUser } } = await supabase.auth.getUser();
                              if (currentUser?.id === u.id) {
                                alert("Non puoi resettare la password del tuo stesso account.");
                                setOpenMenu(null);
                                return;
                              }
                              await resetPassword(u);
                            }}
                          >
                            🔑 Reset password
                          </div>

                          {/* Cambia ruolo (dinamico) */}
                          <div
                            style={menuItemStyle}
                            onClick={() => changeUserRole(u)}
                          >
                            🔄 Cambia ruolo ({u.role === "admin" ? "→ operatore" : "→ admin"})
                          </div>

                          {/* Elimina utente (con colore rosso) */}
                          <div
                            style={{ ...menuItemStyle, color: "#ff4444", borderBottom: "none" }}
                            onClick={() => deleteUser(u)}
                          >
                            🗑️ Elimina utente
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modali */}
      {showAdminModal && (
        <Modal
          title="Invita Admin"
          onClose={() => setShowAdminModal(false)}
          onConfirm={() => handleCreate("admin")}
          sending={sending}
          error={error}
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          setEmail={setEmail}
        />
      )}

      {showOperatorModal && (
        <Modal
          title="Invita Operatore"
          onClose={() => setShowOperatorModal(false)}
          onConfirm={() => handleCreate("operator")}
          sending={sending}
          error={error}
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          setEmail={setEmail}
        />
      )}
    </div>
  );
}

/* ============================
   COMPONENTE MODALE
============================ */

function Modal({
  title,
  onClose,
  onConfirm,
  sending,
  error,
  fullName,
  setFullName,
  email,
  setEmail,
}) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ color: "#fff", marginBottom: "20px" }}>{title}</h2>

        <label style={labelStyle}>Nome completo</label>
        <input
          style={inputStyle}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Mario Rossi"
        />

        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="mario.rossi@esempio.it"
        />

        {error && <p style={{ color: "#ff4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={buttonSecondary}>
            Annulla
          </button>

          <button
            onClick={onConfirm}
            style={{ ...buttonPrimary, opacity: sending ? 0.6 : 1 }}
            disabled={sending}
          >
            {sending ? "Invio in corso..." : "Invia Invito"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================
   STILI INLINE
============================ */

const tableStyle = {
  borderCollapse: "collapse" as const,
  background: "#0f1216",
  borderRadius: "10px",
  overflow: "hidden",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "14px 18px",
  background: "#1a1f25",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: "14px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const tdStyle = {
  padding: "14px 18px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "14px",
  color: "#fff",
};

const rowStyle = (disabled: boolean) => ({
  transition: "background 0.2s",
  background: disabled ? "rgba(255,0,0,0.05)" : "transparent",
  opacity: disabled ? 0.5 : 1,
});

const buttonPrimary = {
  background: "#4f8cff",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer" as const,
  fontWeight: 600,
  fontSize: "14px",
};

const buttonSecondary = {
  background: "#1a1f25",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer" as const,
  fontWeight: 600,
  fontSize: "14px",
};

const modalOverlay = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalBox = {
  background: "#1a1f25",
  padding: "30px",
  borderRadius: "12px",
  width: "400px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const labelStyle = {
  color: "#9ca3af",
  fontSize: "14px",
  marginBottom: "4px",
  display: "block" as const,
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#111418",
  color: "#fff",
  marginBottom: "15px",
  outline: "none",
};

const menuItemStyle = {
  padding: "12px 16px",
  cursor: "pointer" as const,
  color: "#fff",
  fontSize: "14px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  transition: "background 0.2s",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
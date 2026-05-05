import { useEffect, useState, useRef } from "react";
import { supabase } from "@/services/supabase";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Errore caricamento utenti:", error);
    } else {
      setUsers(data || []);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    if (tenantId) {
      loadUsers();
    }
  }, [tenantId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleInvite(role: "admin" | "operator") {
    setSending(true);
    setError("");

    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError("Sessione scaduta. Ricarica la pagina.");
        setSending(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/tenant/${tenantId}/invite-operator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          role: role === "admin" ? "tenant_admin" : "operator"
        }),
      });

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

      alert(`✅ Invito inviato a ${email}! L'utente riceverà un'email per impostare la password.`);
      loadUsers();
    } catch (err: any) {
      console.error("❌ Errore invito:", err);
      setError(err.message || "Errore durante l'invio dell'invito");
      setSending(false);
    }
  }

  async function toggleUserStatus(user: any) {
    const newStatus = user.status === "active" ? "inactive" : "active";

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", user.id);

    if (profileError) {
      console.error("❌ Errore aggiornamento:", profileError);
      alert("Errore durante l'aggiornamento dello stato");
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, status: newStatus } : u
      )
    );

    setOpenMenu(null);
  }

  async function resetPassword(user: any) {
    try {
      if (!user.email) {
        alert("Utente senza email, impossibile inviare il reset");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: user.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Errore reset password");
      }

      alert(`Email di reset inviata a ${user.email}`);
      setOpenMenu(null);
    } catch (err: any) {
      console.error("❌ Errore reset password:", err);
      alert("Errore: " + err.message);
    }
  }

  async function changeUserRole(user: any) {
    try {
      const isAdmin = user.role === "admin" || user.role === "tenant_admin";
      const newRole = isAdmin ? "operator" : "tenant_admin";

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      
      if (currentUser?.id === user.id) {
        alert("Non puoi cambiare il ruolo del tuo stesso account.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", user.id);

      if (profileError) {
        console.error("❌ Errore cambio ruolo:", profileError);
        alert("Errore durante il cambio ruolo");
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, role: newRole } : u
        )
      );

      setOpenMenu(null);
      alert(`Ruolo aggiornato: ${newRole === "tenant_admin" ? "Admin" : "Operatore"}`);
    } catch (err: any) {
      console.error("❌ Errore cambio ruolo:", err);
      alert("Errore: " + err.message);
    }
  }

  async function deleteUser(user: any) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      
      if (currentUser?.id === user.id) {
        alert("Non puoi eliminare il tuo stesso account.");
        return;
      }

      if (!confirm(`Sei sicuro di voler eliminare l'utente ${user.full_name}?`)) return;
      if (!confirm("Questa azione è irreversibile. Confermi?")) return;

      await supabase.from("profiles").delete().eq("id", user.id);

      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) {
        console.error("❌ Errore eliminazione auth:", authError);
        alert("Errore durante l'eliminazione: " + authError.message);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setOpenMenu(null);
      alert("Utente eliminato correttamente.");
    } catch (err: any) {
      console.error("❌ Errore eliminazione utente:", err);
      alert("Errore: " + err.message);
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        hidden: !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q),
      }))
    );
  };

  const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value;
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        hidden: role !== "all" && (
          role === "admin" 
            ? (u.role !== "admin" && u.role !== "tenant_admin")
            : u.role !== role
        ),
      }))
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "30px", color: "#fff", textAlign: "center" }}>
        Caricamento utenti...
      </div>
    );
  }

  return (
    <div style={{ padding: "30px", background: "#0d0f12", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 600, marginBottom: "25px" }}>
        Gestione Utenti
      </h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          placeholder="Cerca per nome o email..."
          style={{
            flex: 1,
            minWidth: "200px",
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
          <option value="operator">Operatore</option>
        </select>

        <button onClick={() => setShowAdminModal(true)} style={buttonPrimary}>
          + Crea Admin
        </button>

        <button onClick={() => setShowOperatorModal(true)} style={buttonSecondary}>
          + Crea Operatore
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        {users.filter((u) => !u.hidden).length === 0 ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
            Nessun utente trovato.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Ruolo</th>
                <th style={thStyle}>Creato il</th>
                <th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => !u.hidden)
                .map((u) => (
                  <tr key={u.id} style={rowStyle(u.status)}>
                    <td style={tdStyle}>{u.full_name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={getRoleBadgeStyle(u.role)}>
                        {(u.role === "admin" || u.role === "tenant_admin") ? "Admin" : "Operatore"}
                      </span>
                      {u.status === "inactive" && <span style={inactiveBadgeStyle}>DISATTIVATO</span>}
                    </td>
                    <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <button
                        style={menuButtonStyle}
                        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      >
                        ⋮
                      </button>
                      {openMenu === u.id && (
                        <div ref={menuRef} style={dropdownMenuStyle}>
                          <div style={menuItemStyle} onClick={() => toggleUserStatus(u)}>
                            {u.status === "inactive" ? "🔓 Riattiva utente" : "🔒 Disattiva utente"}
                          </div>
                          <div style={menuItemStyle} onClick={() => resetPassword(u)}>
                            🔑 Reset password
                          </div>
                          <div style={menuItemStyle} onClick={() => changeUserRole(u)}>
                            🔄 Cambia ruolo ({(u.role === "admin" || u.role === "tenant_admin") ? "→ operatore" : "→ admin"})
                          </div>
                          <div style={{ ...menuItemStyle, color: "#ff4444", borderBottom: "none" }} onClick={() => deleteUser(u)}>
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

      {showAdminModal && (
        <Modal
          title="Invita Admin"
          onClose={() => setShowAdminModal(false)}
          onConfirm={() => handleInvite("admin")}
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
          onConfirm={() => handleInvite("operator")}
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

function Modal({ title, onClose, onConfirm, sending, error, fullName, setFullName, email, setEmail }) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <h2 style={{ color: "#fff", marginBottom: "20px" }}>{title}</h2>
        <label style={labelStyle}>Nome completo</label>
        <input style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" />
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario.rossi@esempio.it" />
        {error && <p style={{ color: "#ff4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button onClick={onClose} style={buttonSecondary}>Annulla</button>
          <button onClick={onConfirm} style={{ ...buttonPrimary, opacity: sending ? 0.6 : 1 }} disabled={sending}>
            {sending ? "Invio in corso..." : "Invia Invito"}
          </button>
        </div>
      </div>
    </div>
  );
}

const getRoleBadgeStyle = (role: string) => ({
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  background: (role === "admin" || role === "tenant_admin") ? "rgba(79,140,255,0.2)" : "rgba(0,200,120,0.2)",
  color: (role === "admin" || role === "tenant_admin") ? "#4f8cff" : "#00c878",
});

const inactiveBadgeStyle = {
  marginLeft: "8px",
  padding: "4px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  background: "rgba(255,0,0,0.2)",
  color: "#ff4444",
};

const tableStyle = { borderCollapse: "collapse" as const, background: "#0f1216", borderRadius: "10px", overflow: "hidden", width: "100%" };
const thStyle = { textAlign: "left" as const, padding: "14px 18px", background: "#1a1f25", color: "#9ca3af", fontWeight: 600, fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.05)" };
const tdStyle = { padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", color: "#fff" };
const rowStyle = (status: string) => ({ transition: "background 0.2s", background: status === "inactive" ? "rgba(255,0,0,0.05)" : "transparent", opacity: status === "inactive" ? 0.5 : 1 });
const menuButtonStyle = { background: "transparent", border: "none", color: "#9ca3af", fontSize: "20px", cursor: "pointer", padding: "8px 12px", borderRadius: "4px" };
const dropdownMenuStyle = { position: "fixed" as const, background: "#1a1f25", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "8px 0", width: "220px", zIndex: 9999, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" };
const menuItemStyle = { padding: "12px 16px", cursor: "pointer" as const, color: "#fff", fontSize: "14px", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s", display: "flex", alignItems: "center", gap: "8px" };
const buttonPrimary = { background: "#4f8cff", color: "#fff", padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer" as const, fontWeight: 600, fontSize: "14px" };
const buttonSecondary = { background: "#1a1f25", color: "#fff", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" as const, fontWeight: 600, fontSize: "14px" };
const modalOverlay = { position: "fixed" as const, top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 };
const modalBox = { background: "#1a1f25", padding: "30px", borderRadius: "12px", width: "400px", border: "1px solid rgba(255,255,255,0.1)" };
const labelStyle = { color: "#9ca3af", fontSize: "14px", marginBottom: "4px", display: "block" as const };
const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#111418", color: "#fff", marginBottom: "15px", outline: "none" };
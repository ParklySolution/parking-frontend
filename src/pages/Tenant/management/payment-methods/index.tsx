// src/pages/Tenant/management/payment-methods/index.tsx

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { 
  FaMoneyBillWave, 
  FaCreditCard, 
  FaUniversity,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaSave,
  FaBan
} from "react-icons/fa";

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  is_cash: boolean;
  is_active: boolean;
  created_at: string;
}

export default function PaymentMethodsManagement() {
  const { tenantId } = useParams();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", is_cash: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMethod, setNewMethod] = useState({ code: "", name: "", is_cash: false });

  // Carica i metodi di pagamento
  useEffect(() => {
    loadMethods();
  }, [tenantId]);

  const loadMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_cash', { ascending: false })
      .order('name');
    
    if (error) {
      console.error('Errore caricamento metodi:', error);
    } else {
      setMethods(data || []);
    }
    setLoading(false);
  };

  // Attiva/disattiva metodo
  const toggleActive = async (method: PaymentMethod) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: !method.is_active })
      .eq('id', method.id);
    
    if (!error) {
      loadMethods();
    }
  };

  // Avvia modifica
  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditForm({ name: method.name, is_cash: method.is_cash });
  };

  // Salva modifica
  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({ name: editForm.name, is_cash: editForm.is_cash })
      .eq('id', id);
    
    if (!error) {
      setEditingId(null);
      loadMethods();
    }
  };

  // Elimina metodo
  const deleteMethod = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo metodo di pagamento?')) return;
    
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);
    
    if (!error) {
      loadMethods();
    }
  };

  // Aggiungi nuovo metodo
  const addMethod = async () => {
    if (!newMethod.code || !newMethod.name) {
      alert('Codice e nome sono obbligatori');
      return;
    }

    const { error } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: tenantId,
        code: newMethod.code.toUpperCase().replace(/\s/g, '_'),
        name: newMethod.name,
        is_cash: newMethod.is_cash,
        is_active: true
      });
    
    if (!error) {
      setShowAddForm(false);
      setNewMethod({ code: "", name: "", is_cash: false });
      loadMethods();
    }
  };

  // Icona in base al metodo
  const getMethodIcon = (code: string, is_cash: boolean) => {
    if (is_cash) return <FaMoneyBillWave size={20} />;
    if (code === 'CARD') return <FaCreditCard size={20} />;
    if (code === 'BANK') return <FaUniversity size={20} />;
    return <FaCreditCard size={20} />;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "20px", 
        marginBottom: "30px",
        background: BG_DARK,
        padding: "15px 20px",
        borderRadius: "10px"
      }}>
        <button 
          onClick={() => window.history.back()} 
          style={{ 
            background: "transparent", 
            border: "none", 
            color: BLUE, 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "14px"
          }}
        >
          <FaArrowLeft /> Indietro
        </button>
        <h1 style={{ color: "#fff", margin: 0, fontSize: "20px" }}>
          💳 Gestione Metodi di Pagamento
        </h1>
      </div>

      {/* Contenuto principale */}
      <div style={{ background: BG_DARK, borderRadius: "12px", padding: "24px" }}>
        {/* Barra superiore */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "24px"
        }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: "18px" }}>
            Metodi disponibili ({methods.length})
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: "10px 16px",
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
            onMouseLeave={(e) => e.currentTarget.style.background = BLUE}
          >
            <FaPlus /> Nuovo Metodo
          </button>
        </div>

        {/* Form aggiunta nuovo metodo */}
        {showAddForm && (
          <div style={{
            background: BG_LIGHTER,
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid #333"
          }}>
            <h3 style={{ color: "#fff", marginBottom: "15px" }}>➕ Aggiungi nuovo metodo</h3>
            <div style={{ display: "grid", gap: "15px" }}>
              <div>
                <label style={{ color: "#9ca3af", fontSize: "13px", display: "block", marginBottom: "5px" }}>
                  Codice *
                </label>
                <input
                  type="text"
                  value={newMethod.code}
                  onChange={(e) => setNewMethod({ ...newMethod, code: e.target.value })}
                  placeholder="es. PAYPAL, SATISPAY, APPLEPAY"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: BG_DARK,
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>
              <div>
                <label style={{ color: "#9ca3af", fontSize: "13px", display: "block", marginBottom: "5px" }}>
                  Nome visualizzato *
                </label>
                <input
                  type="text"
                  value={newMethod.name}
                  onChange={(e) => setNewMethod({ ...newMethod, name: e.target.value })}
                  placeholder="es. PayPal, Satispay, Apple Pay"
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: BG_DARK,
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#9ca3af" }}>
                <input
                  type="checkbox"
                  checked={newMethod.is_cash}
                  onChange={(e) => setNewMethod({ ...newMethod, is_cash: e.target.checked })}
                />
                È un metodo contanti (es. per gestione cassa)
              </label>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={addMethod}
                  style={{
                    padding: "8px 16px",
                    background: "#10b981",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <FaSave /> Salva
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista metodi */}
        {loading ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
            Caricamento metodi...
          </p>
        ) : methods.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px",
            background: BG_LIGHTER,
            borderRadius: "8px"
          }}>
            <p style={{ color: "#9ca3af", fontSize: "16px" }}>
              Nessun metodo di pagamento configurato.
            </p>
            <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
              Clicca su "Nuovo Metodo" per iniziare.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {methods.map(method => (
              <div
                key={method.id}
                style={{
                  padding: "16px 20px",
                  background: BG_LIGHTER,
                  borderRadius: "8px",
                  border: `1px solid ${method.is_active ? BLUE + '40' : '#333'}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                {editingId === method.id ? (
                  // Modalità modifica
                  <div style={{ display: "flex", gap: "15px", alignItems: "center", flex: 1 }}>
                    <div style={{ color: BLUE }}>
                      {getMethodIcon(method.code, method.is_cash)}
                    </div>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{
                        padding: "8px 12px",
                        background: BG_DARK,
                        border: "1px solid #333",
                        borderRadius: "6px",
                        color: "#fff",
                        flex: 1
                      }}
                    />
                    <label style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: "5px" }}>
                      <input
                        type="checkbox"
                        checked={editForm.is_cash}
                        onChange={(e) => setEditForm({ ...editForm, is_cash: e.target.checked })}
                      />
                      Contanti
                    </label>
                    <button 
                      onClick={() => saveEdit(method.id)} 
                      style={{ color: "#10b981", background: "none", border: "none", cursor: "pointer" }}
                      title="Salva"
                    >
                      <FaCheck size={18} />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)} 
                      style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                      title="Annulla"
                    >
                      <FaTimes size={18} />
                    </button>
                  </div>
                ) : (
                  // Visualizzazione normale
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <div style={{ color: BLUE }}>
                        {getMethodIcon(method.code, method.is_cash)}
                      </div>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>
                          {method.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                          Codice: {method.code}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{
                        padding: "4px 12px",
                        background: method.is_active ? "#10b981" : "#666",
                        color: "#fff",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {method.is_active ? "Attivo" : "Disattivato"}
                      </span>
                      
                      <button 
                        onClick={() => startEdit(method)} 
                        style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}
                        title="Modifica"
                      >
                        <FaEdit size={16} />
                      </button>
                      
                      <button 
                        onClick={() => toggleActive(method)} 
                        style={{ 
                          color: method.is_active ? "#ef4444" : "#10b981", 
                          background: "none", 
                          border: "none", 
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "bold"
                        }}
                        title={method.is_active ? "Disattiva" : "Attiva"}
                      >
                        {method.is_active ? <FaBan size={16} /> : <FaCheck size={16} />}
                      </button>
                      
                      <button 
                        onClick={() => deleteMethod(method.id)} 
                        style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                        title="Elimina"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Note informative */}
        <div style={{ 
          marginTop: "30px",
          padding: "16px",
          background: BG_LIGHTER,
          borderRadius: "8px",
          border: "1px solid #333"
        }}>
          <h4 style={{ color: "#fff", marginBottom: "10px" }}>ℹ️ Note importanti</h4>
          <ul style={{ color: "#9ca3af", fontSize: "13px", margin: "0", paddingLeft: "20px" }}>
            <li>I metodi attivi saranno visibili nella pagina di rinnovo abbonamenti</li>
            <li>Puoi disattivare un metodo senza eliminarlo per mantenere lo storico</li>
            <li>Il flag "Contanti" aiuta a identificare i pagamenti in contante per la gestione cassa</li>
            <li>Il codice viene automaticamente convertito in maiuscolo e senza spazi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
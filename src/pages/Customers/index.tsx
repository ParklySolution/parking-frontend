import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { FaUser, FaSearch, FaArrowLeft, FaCar, FaPhone, FaEnvelope, FaIdCard } from "react-icons/fa";

const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";
const BG_MAIN = "#0d1117";

interface Customer {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  fiscal_code: string;
  address: string;
  city: string;
  created_at: string;
}

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Leggi il parametro search dalla URL o dallo state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    if (searchParam) {
      setSearchTerm(searchParam);
    } else if (location.state?.searchCustomer) {
      setSearchTerm(location.state.searchCustomer);
    }
  }, [location]);

  useEffect(() => {
    loadTenantAndCustomers();
  }, []);

  const loadTenantAndCustomers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tid = session?.user?.user_metadata?.tenant_id || null;
      setTenantId(tid);

      if (tid) {
        await loadCustomers(tid);
      }
    } catch (error) {
      console.error("Errore:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async (tid: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Errore caricamento clienti:", error);
    }
  };

  const loadCustomerVehicles = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_vehicles')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Errore caricamento veicoli:", error);
    }
  };

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerVehicles(customer.id);
    setShowModal(true);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fiscal_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#fff", background: BG_MAIN, minHeight: "100vh" }}>
        Caricamento clienti...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG_MAIN, padding: "20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Header con freccia indietro */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "30px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
  onClick={() => {
    if (location.state?.from === "/fidelity-customers") {
      navigate("/fidelity-customers");
    } else {
      navigate("/dashboard");
    }
  }}
  style={{
    background: "transparent",
    border: "none",
    color: BLUE,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px"
  }}
>
  ← Indietro
</button>
            <h1 style={{ color: BLUE, display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <FaUser /> Clienti
            </h1>
          </div>
          
          <div style={{ background: BG_DARK, padding: "8px 16px", borderRadius: "8px" }}>
            <span style={{ color: "#9ca3af" }}>Totale clienti: </span>
            <span style={{ color: BLUE, fontWeight: "bold" }}>{customers.length}</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ background: BG_DARK, padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <FaSearch color="#9ca3af" />
            <input
              type="text"
              placeholder="Cerca per nome, email o codice fiscale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                background: BG_LIGHTER,
                border: "1px solid #333",
                borderRadius: "6px",
                color: "#fff"
              }}
            />
            <span style={{ color: "#9ca3af", fontSize: "12px" }}>
              {filteredCustomers.length} clienti trovati
            </span>
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: BG_DARK,
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid #333",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = BLUE}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#333"}
              onClick={() => handleViewCustomer(customer)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: BG_LIGHTER,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FaUser size={24} color={BLUE} />
                </div>
                <div>
                  <h3 style={{ color: "#fff", margin: 0 }}>{customer.name}</h3>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    {customer.fiscal_code || "Nessun CF"}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "8px" }}>
                <FaEnvelope style={{ marginRight: "8px", color: BLUE }} />
                {customer.email || "Nessuna email"}
              </div>

              <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "8px" }}>
                <FaPhone style={{ marginRight: "8px", color: BLUE }} />
                {customer.phone || "Nessun telefono"}
              </div>

              <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                <FaIdCard style={{ marginRight: "8px", color: BLUE }} />
                {customer.address ? `${customer.address}, ${customer.city}` : "Nessun indirizzo"}
              </div>
            </div>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "60px",
            background: BG_DARK,
            borderRadius: "12px",
            color: "#9ca3af"
          }}>
            <FaUser size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
            <p>Nessun cliente trovato</p>
          </div>
        )}

        {/* Modal Dettaglio Cliente */}
        {showModal && selectedCustomer && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            overflow: "auto"
          }}>
            <div style={{
              background: BG_DARK,
              borderRadius: "12px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              margin: "20px"
            }}>
              <div style={{
                position: "sticky",
                top: 0,
                background: BG_DARK,
                padding: "20px",
                borderBottom: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <h3 style={{ color: "#fff", margin: 0 }}>Dettaglio Cliente</h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fff",
                    fontSize: "24px",
                    cursor: "pointer"
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                {/* Dati Anagrafici */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: BLUE, marginBottom: "15px" }}>Dati Anagrafici</h4>
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div><strong style={{ color: "#9ca3af" }}>Nome:</strong> <span style={{ color: "#fff" }}>{selectedCustomer.name}</span></div>
                    <div><strong style={{ color: "#9ca3af" }}>Codice Fiscale:</strong> <span style={{ color: "#fff" }}>{selectedCustomer.fiscal_code || "N/D"}</span></div>
                    <div><strong style={{ color: "#9ca3af" }}>Email:</strong> <span style={{ color: "#fff" }}>{selectedCustomer.email || "N/D"}</span></div>
                    <div><strong style={{ color: "#9ca3af" }}>Telefono:</strong> <span style={{ color: "#fff" }}>{selectedCustomer.phone || "N/D"}</span></div>
                    <div><strong style={{ color: "#9ca3af" }}>Indirizzo:</strong> <span style={{ color: "#fff" }}>{selectedCustomer.address ? `${selectedCustomer.address}, ${selectedCustomer.city}` : "N/D"}</span></div>
                  </div>
                </div>

                {/* Veicoli Associati */}
                <div>
                  <h4 style={{ color: BLUE, marginBottom: "15px" }}>Veicoli Associati</h4>
                  {vehicles.length === 0 ? (
                    <div style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
                      Nessun veicolo associato
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {vehicles.map((vehicle) => (
                        <div key={vehicle.id} style={{
                          background: BG_LIGHTER,
                          padding: "12px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}>
                          <FaCar color={BLUE} size={20} />
                          <div>
                            <div style={{ color: "#fff", fontWeight: "bold" }}>{vehicle.plate}</div>
                            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                              {vehicle.brand} {vehicle.model} {vehicle.color ? `- ${vehicle.color}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// src/pages/operator/ContractsManagement/index.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { 
  FaTicketAlt, 
  FaSoap, 
  FaHandshake, 
  FaFileContract,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
  FaFilePdf,
  FaPrint,
  FaEnvelope,
  FaEdit,
  FaArrowLeft
} from "react-icons/fa";
import { generatePDFFromHTML, downloadPDF, printHTML } from '@/services/pdfService';
import { sendContractEmail } from '@/services/emailService';
import { formatDate, formatCurrency } from '@/pages/operator/Contracts/utils/formatters';

// Colori (copiati dai contratti per coerenza)
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

// Tipi contratto
const CONTRACT_TYPES = [
  { 
    id: 'subscription', 
    nome: 'Abbonamento Parcheggio', 
    icon: <FaTicketAlt size={32} />,
    colore: '#4f8cff',
    descrizione: 'Contratti di abbonamento mensile/annuale'
  },
  { 
    id: 'wash_fidelity', 
    nome: 'Fedeltà Lavaggio', 
    icon: <FaSoap size={32} />,
    colore: '#10b981',
    descrizione: 'Programmi fedeltà per clienti lavaggio'
  },
  { 
    id: 'convention', 
    nome: 'Convenzione', 
    icon: <FaHandshake size={32} />,
    colore: '#f59e0b',
    descrizione: 'Contratti convenzionati con aziende/enti'
  },
  { 
    id: 'generic', 
    nome: 'Generico', 
    icon: <FaFileContract size={32} />,
    colore: '#8b5cf6',
    descrizione: 'Altri tipi di contratto personalizzati'
  }
];

// Tipi
interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  fiscal_code: string | null;
}

interface VehicleInfo {
  plate: string;
  make: string;
  model: string;
}

interface ContractInfo {
  id: string;
  contract_number: string;
  type: 'subscription' | 'wash_fidelity' | 'convention' | 'generic';
  type_name: string;
  price: number | null;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  customer_id: string;
}

interface CustomerWithContracts {
  customer: Customer;
  vehicles: VehicleInfo[];
  contracts: ContractInfo[];
  expanded: boolean;
}

interface ContractDetails {
  id: string;
  contract_number: string;
  valid_from: string;
  valid_to: string | null;
  price: number | null;
  created_at: string;
  duration_months?: number;
  notes?: string;
  generated_html?: string; // 👈 AGGIUNTO: HTML salvato
  generated_pdf_url?: string; // 👈 AGGIUNTO: URL PDF salvato
  customer: Customer | null;
  template: { 
    name: string;
    content?: string;
    type: string;
    title?: string;
    terms_id?: string;
  } | null;
}

interface CompanyInfo {
  company_name: string;
  address?: string;
  city?: string;
  vat?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

export default function ContractsManagement() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithContracts[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithContracts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (tenantId) {
      loadCustomersData();
    }
  }, [tenantId]);

  const loadCustomersData = async () => {
    setLoading(true);
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone, fiscal_code')
        .eq('tenant_id', tenantId)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true });

      if (customersError) throw customersError;

      const customersWithData: CustomerWithContracts[] = await Promise.all(
        (customersData || []).map(async (customer) => {
          // Veicoli del cliente
          let vehicleList: VehicleInfo[] = [];

          try {
            const { data: vehicles } = await supabase
              .from('customer_vehicles')
              .select('plate')
              .eq('customer_id', customer.id);

            if (vehicles && vehicles.length > 0) {
              const plates = vehicles.map(v => v.plate);
              
              const { data: profiles } = await supabase
                .from('vehicle_profiles')
                .select(`
                  plate,
                  brand:vehicle_brands(name),
                  model:vehicle_models(name)
                `)
                .in('plate', plates);

              const profileMap = new Map();
              if (profiles) {
                profiles.forEach(p => {
                  profileMap.set(p.plate, {
                    make: p.brand?.name || '',
                    model: p.model?.name || ''
                  });
                });
              }

              vehicleList = vehicles.map(v => {
                const profile = profileMap.get(v.plate);
                return {
                  plate: v.plate,
                  make: profile?.make || '',
                  model: profile?.model || ''
                };
              });
            }
          } catch (error) {
            console.error("❌ Errore caricamento veicoli:", error);
          }

          const { data: contracts } = await supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              valid_from,
              valid_to,
              price,
              created_at,
              duration_months,
              notes,
              generated_html,
              generated_pdf_url,
              template:contract_templates!inner (
                type,
                name,
                content,
                title,
                terms_id
              )
            `)
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });

          const contractList: ContractInfo[] = (contracts || []).map(c => ({
            id: c.id,
            contract_number: c.contract_number,
            type: c.template.type,
            type_name: c.template.name,
            price: c.price,
            valid_from: c.valid_from,
            valid_to: c.valid_to,
            created_at: c.created_at,
            customer_id: customer.id
          }));

          return {
            customer: {
              id: customer.id,
              first_name: customer.first_name || '',
              last_name: customer.last_name || '',
              full_name: `${customer.last_name || ''} ${customer.first_name || ''}`.trim(),
              email: customer.email,
              phone: customer.phone,
              fiscal_code: customer.fiscal_code
            },
            vehicles: vehicleList,
            contracts: contractList,
            expanded: false
          };
        })
      );

      setCustomers(customersWithData);
      setFilteredCustomers(customersWithData);
    } catch (error) {
      console.error("❌ Errore caricamento clienti:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = customers;

    if (selectedType) {
      filtered = filtered.filter(item => 
        item.contracts.some(c => c.type === selectedType)
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.customer.full_name.toLowerCase().includes(term) ||
        item.customer.email?.toLowerCase().includes(term) ||
        item.vehicles.some(v => v.plate.toLowerCase().includes(term)) ||
        item.contracts.some(c => c.contract_number.toLowerCase().includes(term))
      );
    }

    setFilteredCustomers(filtered);
  }, [selectedType, searchTerm, customers]);

  const toggleExpand = (index: number) => {
    setFilteredCustomers(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  // 3️⃣ Nella pagina di gestione, USA l'HTML salvato
  const getContractDetails = async (contractId: string): Promise<ContractDetails | null> => {
    try {
      const { data } = await supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(*),
          template:contract_templates(*)
        `)
        .eq('id', contractId)
        .single();
      
      return data;
    } catch (error) {
      console.error('Errore recupero dettagli contratto:', error);
      return null;
    }
  };

  const getCompanyInfo = async (tenantId: string): Promise<CompanyInfo> => {
    try {
      const { data, error } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      if (error) {
        console.error('Errore recupero dati azienda:', error);
      }
      
      if (data) {
        return {
          company_name: data.company_name || data.name || '',
          address: data.address || '',
          city: data.city || '',
          vat: data.vat || '',
          phone: data.phone || '',
          email: data.email || '',
          logo_url: data.logo_url || ''
        };
      }
      
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
      
      return { 
        company_name: tenantData?.name || '',
        address: '',
        city: '',
        vat: '',
        phone: '',
        email: '',
        logo_url: ''
      };
    } catch (error) {
      console.error('Errore recupero dati azienda:', error);
      return { 
        company_name: '',
        address: '',
        city: '',
        vat: '',
        phone: '',
        email: '',
        logo_url: ''
      };
    }
  };

  const getCustomerFullData = async (customerId: string) => {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (customerError) throw customerError;
      if (!customer) return null;
      
      // Ritorna solo i dati del cliente, senza tentare addresses/documents
      return customer;
      
    } catch (error) {
      console.error('❌ Errore recupero dati cliente:', error);
      return null;
    }
  };

  const getCustomerVehicles = async (customerId: string) => {
    try {
      // Prima prendi le targhe
      const { data: vehicles } = await supabase
        .from('customer_vehicles')
        .select('plate')
        .eq('customer_id', customerId);
      
      if (!vehicles || vehicles.length === 0) return [];
      
      // Poi prendi i profili per ogni targa
      const plates = vehicles.map(v => v.plate);
      const { data: profiles } = await supabase
        .from('vehicle_profiles')
        .select(`
          plate,
          brand:vehicle_brands(name),
          model:vehicle_models(name)
        `)
        .in('plate', plates);
      
      // Crea una mappa per associare i dati
      const profileMap = new Map();
      if (profiles) {
        profiles.forEach(p => {
          profileMap.set(p.plate, {
            make: p.brand?.name || '',
            model: p.model?.name || ''
          });
        });
      }
      
      return vehicles.map(v => ({
        plate: v.plate,
        make: profileMap.get(v.plate)?.make || '',
        model: profileMap.get(v.plate)?.model || '',
        year: '',
        color: ''
      }));
      
    } catch (error) {
      console.error('Errore recupero veicoli:', error);
      return [];
    }
  };

  const generateContractHTML = (
    contract: ContractDetails,
    customer: any,
    companyInfo: CompanyInfo,
    vehicles: any[],
    template: any,
    terms?: any
  ): string => {
    if (!template || !companyInfo) return "";

    let html = template.content || "";
    
    // Pulisci eventuali {' '} dal template se presenti
    html = html.replace(/\{'\{/g, '{').replace(/\}'\}/g, '}');

    // Genera HTML per veicoli multipli
    const vehiclesHTML = vehicles.map(v => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #4f8cff;">Veicolo: ${v.make || ''} ${v.model || ''}</h4>
        <p><strong>Targa:</strong> ${v.plate || ''}</p>
      </div>
    `).join('');

    const replacements: Record<string, string> = {
      // DATI AZIENDA
      '{{COMPANY_NAME}}': companyInfo.company_name || '',
      '{{COMPANY_ADDRESS}}': companyInfo.address || '',
      '{{COMPANY_CITY}}': companyInfo.city || '',
      '{{COMPANY_VAT}}': companyInfo.vat || '',
      '{{COMPANY_PHONE}}': companyInfo.phone || '',
      '{{COMPANY_EMAIL}}': companyInfo.email || '',
      '{{COMPANY_LOGO}}': companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" style="max-height: 60px;">` : '',
      
      // DATI CONTRATTO
      '{{CONTRACT_TITLE}}': template.title || 'Contratto',
      '{{CONTRACT_NUMBER}}': contract.contract_number,
      '{{CONTRACT_DATE}}': formatDate(contract.created_at),
      '{{CONTRACT_DURATION}}': contract.duration_months?.toString() || '',
      '{{CONTRACT_AMOUNT}}': contract.price?.toString() || '',
      '{{NOTES}}': contract.notes || '',
      '{{GENERATION_DATE}}': formatDate(new Date().toISOString()),
      
      // DATI CLIENTE
      '{{CUSTOMER_FIRST_NAME}}': customer?.first_name || '',
      '{{CUSTOMER_LAST_NAME}}': customer?.last_name || '',
      '{{CUSTOMER_FULLNAME}}': `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
      '{{CUSTOMER_FISCAL_CODE}}': customer?.fiscal_code || '',
      '{{CUSTOMER_FISCALCODE}}': customer?.fiscal_code || '',
      '{{CUSTOMER_BIRTH_DATE}}': customer?.birth_date ? formatDate(customer.birth_date) : '',
      '{{CUSTOMER_BIRTH_PLACE}}': customer?.birth_place || '',
      '{{CUSTOMER_BIRTH_PROVINCE}}': '',
      '{{CUSTOMER_ADDRESS}}': customer?.address || '',
      '{{CUSTOMER_CITY}}': customer?.city || '',
      '{{CUSTOMER_POSTAL_CODE}}': customer?.postal_code || '',
      '{{CUSTOMER_PROVINCE}}': customer?.province || '',
      '{{CUSTOMER_EMAIL}}': customer?.email || '',
      '{{CUSTOMER_PHONE}}': customer?.phone || '',
      
      // DOCUMENTO
      '{{CUSTOMER_DOCUMENT_TYPE}}': customer?.document_type || '',
      '{{CUSTOMER_DOCUMENT_NUMBER}}': customer?.document_number || '',
      '{{CUSTOMER_DOCUMENT_ISSUE_DATE}}': customer?.document_issue_date ? formatDate(customer.document_issue_date) : '',
      '{{CUSTOMER_DOCUMENT_EXPIRY_DATE}}': customer?.document_expiry_date ? formatDate(customer.document_expiry_date) : '',
      '{{CUSTOMER_DOCUMENT_ISSUING_AUTHORITY}}': customer?.document_issuing_authority || '',
      
      // VECCHI PLACEHOLDER (per compatibilità)
      '{{VEHICLE_PLATE}}': vehicles[0]?.plate || '',
      '{{VEHICLE_MAKE}}': vehicles[0]?.make || '',
      '{{VEHICLE_MODEL}}': vehicles[0]?.model || '',
      
      // NUOVI PLACEHOLDER per veicoli multipli
      '{{VEHICLES_LIST}}': vehiclesHTML,
      '{{VEHICLES_COUNT}}': vehicles.length.toString(),
      '{{TARIFFS_TABLE}}': '',
      '{{TOTAL_TARIFFS}}': '0',
      
      // TERMINI
      '{{CONTRACT_TERMS}}': terms?.content || '',
      '{{TERMS}}': terms?.content || '',
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(escapedKey, 'g'), value);
    });

    return html;
  };

  const handleViewContract = (contractId: string, contractNumber: string) => {
    navigate(`/tenant/${tenantId}/contracts`);
  };

  const handlePrintContract = async (contractId: string, contractNumber: string, customer: Customer) => {
    try {
      setLoading(true);
      
      const contract = await getContractDetails(contractId);
      if (!contract) {
        alert('Errore nel recupero dei dettagli del contratto');
        return;
      }
      
      // Se esiste l'HTML salvato, USALO DIRETTAMENTE!
      if (contract.generated_html) {
        console.log(`🖨️ Stampa contratto ${contractNumber} usando HTML salvato`);
        printHTML(contract.generated_html);
      } else {
        // Altrimenti rigenera (fallback)
        console.log(`🖨️ Stampa contratto ${contractNumber} rigenerando HTML (fallback)`);
        const customerFullData = await getCustomerFullData(customer.id);
        const companyInfo = await getCompanyInfo(tenantId!);
        const vehicles = await getCustomerVehicles(customer.id);
        
        let terms = null;
        if (contract.template?.terms_id) {
          const { data: termsData } = await supabase
            .from('contract_terms')
            .select('*')
            .eq('id', contract.template.terms_id)
            .single();
          terms = termsData;
        }
        
        const html = generateContractHTML(
          contract,
          customerFullData || customer,
          companyInfo,
          vehicles,
          contract.template,
          terms
        );
        
        printHTML(html);
      }
    } catch (error) {
      console.error('Errore stampa contratto:', error);
      alert('Errore durante la stampa del contratto');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfContract = async (contractId: string, contractNumber: string, customer: Customer) => {
    try {
      setLoading(true);
      
      const contract = await getContractDetails(contractId);
      if (!contract) {
        alert('Errore nel recupero dei dettagli del contratto');
        return;
      }
      
      // Se esiste l'HTML salvato, USALO DIRETTAMENTE!
      if (contract.generated_html) {
        console.log(`📄 Generazione PDF contratto ${contractNumber} usando HTML salvato`);
        const safeFileName = `contratto-${contractNumber || Date.now()}.pdf`;
        const pdfBlob = await generatePDFFromHTML(contract.generated_html, safeFileName);
        downloadPDF(pdfBlob, safeFileName);
      } else {
        // Altrimenti rigenera (fallback)
        console.log(`📄 Generazione PDF contratto ${contractNumber} rigenerando HTML (fallback)`);
        const customerFullData = await getCustomerFullData(customer.id);
        const companyInfo = await getCompanyInfo(tenantId!);
        const vehicles = await getCustomerVehicles(customer.id);
        
        let terms = null;
        if (contract.template?.terms_id) {
          const { data: termsData } = await supabase
            .from('contract_terms')
            .select('*')
            .eq('id', contract.template.terms_id)
            .single();
          terms = termsData;
        }
        
        const html = generateContractHTML(
          contract,
          customerFullData || customer,
          companyInfo,
          vehicles,
          contract.template,
          terms
        );
        
        const safeFileName = `contratto-${contractNumber || Date.now()}.pdf`;
        const pdfBlob = await generatePDFFromHTML(html, safeFileName);
        downloadPDF(pdfBlob, safeFileName);
      }
      
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      alert('Errore durante la generazione del PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailContract = async (contractId: string, contractNumber: string, email?: string | null, customer?: Customer) => {
    if (!email) {
      alert('Cliente senza email. Impossibile inviare il contratto.');
      return;
    }

    if (!customer) {
      alert('Dati cliente non disponibili');
      return;
    }

    try {
      setLoading(true);
      
      const contract = await getContractDetails(contractId);
      if (!contract) {
        alert('Errore nel recupero dei dettagli del contratto');
        return;
      }
      
      let html: string;
      
      // Se esiste l'HTML salvato, USALO DIRETTAMENTE!
      if (contract.generated_html) {
        console.log(`📧 Invio email contratto ${contractNumber} usando HTML salvato`);
        html = contract.generated_html;
      } else {
        // Altrimenti rigenera (fallback)
        console.log(`📧 Invio email contratto ${contractNumber} rigenerando HTML (fallback)`);
        const customerFullData = await getCustomerFullData(customer.id);
        const companyInfo = await getCompanyInfo(tenantId!);
        const vehicles = await getCustomerVehicles(customer.id);
        
        let terms = null;
        if (contract.template?.terms_id) {
          const { data: termsData } = await supabase
            .from('contract_terms')
            .select('*')
            .eq('id', contract.template.terms_id)
            .single();
          terms = termsData;
        }
        
        html = generateContractHTML(
          contract,
          customerFullData || customer,
          companyInfo,
          vehicles,
          contract.template,
          terms
        );
      }
      
      const safeFileName = `contratto-${contractNumber || Date.now()}.pdf`;
      const pdfBlob = await generatePDFFromHTML(html, safeFileName);
      
      const success = await sendContractEmail(
        email,
        contractNumber,
        pdfBlob,
        customer.full_name || 'Cliente'
      );

      if (success) {
        alert(`✅ Contratto ${contractNumber} inviato con successo a ${email}`);
      } else {
        alert('❌ Errore durante l\'invio del contratto');
      }
    } catch (error) {
      console.error('Errore invio email:', error);
      alert('Errore durante l\'invio del contratto via email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header con back button */}
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
          onClick={() => navigate(-1)} 
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
        <h1 style={{ color: "#fff", margin: 0, fontSize: "20px" }}>📋 Gestione Contratti</h1>
      </div>

      {/* Card di selezione tipo */}
      {!selectedType ? (
        <>
          <h2 style={{ color: "#fff", marginBottom: "20px" }}>Seleziona il tipo di contratto</h2>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "20px",
            marginBottom: "30px"
          }}>
            {CONTRACT_TYPES.map(type => {
              const count = customers.filter(c => 
                c.contracts.some(ct => ct.type === type.id)
              ).length;

              return (
                <div
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  style={{
                    background: BG_DARK,
                    padding: "30px 20px",
                    borderRadius: "12px",
                    border: `2px solid ${type.colore}`,
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    textAlign: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 10px 20px rgba(0,0,0,0.3)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ color: type.colore, marginBottom: "15px" }}>{type.icon}</div>
                  <h3 style={{ color: "#fff", marginBottom: "10px" }}>{type.nome}</h3>
                  <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "15px" }}>{type.descrizione}</p>
                  <div style={{ 
                    background: type.colore, 
                    color: "#fff", 
                    padding: "5px 10px", 
                    borderRadius: "20px",
                    display: "inline-block",
                    fontWeight: "bold"
                  }}>
                    {count} clienti
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Lista clienti filtrata */
        <>
          {/* Intestazione con tipo selezionato e ricerca */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "15px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <button
                onClick={() => setSelectedType(null)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: `1px solid ${BLUE}`,
                  color: BLUE,
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                ← Torna ai tipi
              </button>
              <h2 style={{ color: "#fff", margin: 0 }}>
                {CONTRACT_TYPES.find(t => t.id === selectedType)?.nome}
              </h2>
            </div>

            <div style={{ position: "relative", width: "300px" }}>
              <FaSearch style={{ 
                position: "absolute", 
                left: "12px", 
                top: "50%", 
                transform: "translateY(-50%)",
                color: "#9ca3af"
              }} />
              <input
                type="text"
                placeholder="Cerca cliente, targa, contratto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 10px 10px 40px",
                  background: BG_LIGHTER,
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          {/* Lista clienti filtrata */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
              Caricamento clienti...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ 
              background: BG_DARK, 
              padding: "60px", 
              borderRadius: "12px", 
              textAlign: "center",
              color: "#9ca3af"
            }}>
              Nessun cliente trovato per questa categoria
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {filteredCustomers.map((item, index) => (
                <div
                  key={item.customer.id}
                  style={{
                    background: BG_DARK,
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #333"
                  }}
                >
                  {/* Riga cliente */}
                  <div
                    onClick={() => toggleExpand(index)}
                    style={{
                      padding: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: item.expanded ? BG_LIGHTER : "transparent",
                      borderBottom: item.expanded ? "1px solid #333" : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        background: CONTRACT_TYPES.find(t => t.id === selectedType)?.colore || BLUE, 
                        borderRadius: "50%", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "#fff", 
                        fontWeight: "bold" 
                      }}>
                        {item.customer.first_name?.[0]}{item.customer.last_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: "bold", color: "#fff", fontSize: "16px" }}>
                          {item.customer.full_name}
                        </div>
                        <div style={{ display: "flex", gap: "15px", fontSize: "13px", color: "#9ca3af", flexWrap: "wrap" }}>
                          {item.customer.email && <span>📧 {item.customer.email}</span>}
                          {item.customer.phone && <span>📞 {item.customer.phone}</span>}
                          {item.customer.fiscal_code && <span>🆔 {item.customer.fiscal_code}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                        {item.contracts.length} contratto/i
                      </span>
                      {item.expanded ? <FaChevronUp color="#9ca3af" /> : <FaChevronDown color="#9ca3af" />}
                    </div>
                  </div>

                  {/* Dettaglio espanso */}
                  {item.expanded && (
                    <div style={{ padding: "20px", background: "#111418" }}>
                      {/* Veicoli */}
                      {item.vehicles.length > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                          <h4 style={{ color: "#fff", marginBottom: "10px", fontSize: "14px" }}>🚗 Veicoli</h4>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            {item.vehicles.map((v, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "8px 12px",
                                  background: BG_LIGHTER,
                                  borderRadius: "8px",
                                  border: "1px solid #333"
                                }}
                              >
                                <span style={{ color: BLUE, fontWeight: "bold", marginRight: "8px" }}>{v.plate}</span>
                                <span style={{ color: "#9ca3af" }}>{v.make} {v.model}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contratti filtrati per tipo selezionato */}
                      {item.contracts.filter(c => c.type === selectedType).map(contract => (
                        <div
                          key={contract.id}
                          style={{
                            background: BG_LIGHTER,
                            borderRadius: "8px",
                            padding: "15px",
                            marginBottom: "10px",
                            border: "1px solid #333"
                          }}
                        >
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            marginBottom: "10px",
                            flexWrap: "wrap",
                            gap: "10px"
                          }}>
                            <div>
                              <span style={{ color: BLUE, fontWeight: "bold", fontSize: "14px" }}>
                                {contract.contract_number}
                              </span>
                              <span style={{ 
                                marginLeft: "10px",
                                padding: "2px 8px",
                                background: CONTRACT_TYPES.find(t => t.id === contract.type)?.colore,
                                color: "#fff",
                                borderRadius: "12px",
                                fontSize: "11px"
                              }}>
                                {contract.type_name}
                              </span>
                            </div>
                            <div style={{ color: "#10b981", fontWeight: "bold" }}>
                              {formatCurrency(contract.price)}
                            </div>
                          </div>

                          <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                            gap: "10px",
                            marginBottom: "15px",
                            fontSize: "13px",
                            color: "#9ca3af"
                          }}>
                            <div>📅 Dal: {formatDate(contract.valid_from)}</div>
                            {contract.valid_to && <div>📅 Al: {formatDate(contract.valid_to)}</div>}
                            <div>📆 Creato: {formatDate(contract.created_at)}</div>
                          </div>

                          {/* Pulsanti azioni */}
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleViewContract(contract.id, contract.contract_number)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: `1px solid ${BLUE}`,
                                color: BLUE,
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                              }}
                            >
                              <FaEdit /> Modifica
                            </button>
                            <button
                              onClick={() => handlePdfContract(contract.id, contract.contract_number, item.customer)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: `1px solid #ef4444`,
                                color: "#ef4444",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                              }}
                            >
                              <FaFilePdf /> PDF
                            </button>
                            <button
                              onClick={() => handlePrintContract(contract.id, contract.contract_number, item.customer)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: `1px solid #10b981`,
                                color: "#10b981",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                              }}
                            >
                              <FaPrint /> Stampa
                            </button>
                            <button
                              onClick={() => handleEmailContract(contract.id, contract.contract_number, item.customer.email, item.customer)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: `1px solid #f59e0b`,
                                color: "#f59e0b",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px"
                              }}
                            >
                              <FaEnvelope /> Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
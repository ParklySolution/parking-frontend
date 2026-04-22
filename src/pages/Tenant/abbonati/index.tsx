// src/pages/Tenant/abbonati/index.tsx

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
  FaTrash,
  FaArrowLeft,
  FaChartBar,
  FaUsers
} from "react-icons/fa";
import { generatePDFFromHTML, downloadPDF, printHTML } from '@/services/pdfService';
import { sendContractEmail } from '@/services/emailService';
import { formatDate, formatCurrency } from '@/pages/operator/Contracts/utils/formatters';

// Colori
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
  customer: Customer | null;
  template: { 
    name: string;
    content?: string;
    type: string;
    title?: string;
    terms_id?: string;
  } | null;
  generated_html?: string;
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

interface FilterValues {
  type: string;
  status: string;
  from: string;
  to: string;
  search: string;
}

interface Stats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  totalRevenue: number;
  avgPrice: number;
  byType: Record<string, number>;
}

export default function TenantAbbonati() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerWithContracts[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithContracts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(true);
  const [activeFilters, setActiveFilters] = useState<FilterValues>({
    type: '',
    status: '',
    from: '',
    to: '',
    search: ''
  });

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

  // Calcola le statistiche
  const calculateStats = (): Stats => {
    const allContracts = customers.flatMap(item => item.contracts);
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return {
      total: allContracts.length,
      active: allContracts.filter(c => {
        if (!c.valid_to) return true;
        return new Date(c.valid_to) > today;
      }).length,
      expiring: allContracts.filter(c => {
        if (!c.valid_to) return false;
        const validTo = new Date(c.valid_to);
        return validTo > today && validTo <= thirtyDaysFromNow;
      }).length,
      expired: allContracts.filter(c => {
        if (!c.valid_to) return false;
        return new Date(c.valid_to) < today;
      }).length,
      totalRevenue: allContracts.reduce((sum, c) => sum + (c.price || 0), 0),
      avgPrice: allContracts.length ? 
        allContracts.reduce((sum, c) => sum + (c.price || 0), 0) / allContracts.length : 0,
      byType: allContracts.reduce((acc: Record<string, number>, c) => {
        const type = c.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  };

  const stats = calculateStats();

  // Funzione di filtro avanzato
  const applyAdvancedFilters = (customers: CustomerWithContracts[], filters: FilterValues) => {
    return customers.filter(item => {
      // Filtro per tipo contratto
      if (filters.type && !item.contracts.some(c => c.type === filters.type)) {
        return false;
      }

      // Filtro per stato
      if (filters.status) {
        const today = new Date();
        const hasValidStatus = item.contracts.some(c => {
          if (!c.valid_to) return filters.status === 'active';
          
          const validTo = new Date(c.valid_to);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);

          switch (filters.status) {
            case 'active':
              return validTo > today;
            case 'expiring':
              return validTo > today && validTo <= thirtyDaysFromNow;
            case 'expired':
              return validTo < today;
            default:
              return true;
          }
        });
        if (!hasValidStatus) return false;
      }

      // Filtro per data inizio
      if (filters.from) {
        const fromDate = new Date(filters.from);
        const hasContractAfter = item.contracts.some(c => 
          new Date(c.valid_from) >= fromDate
        );
        if (!hasContractAfter) return false;
      }

      if (filters.to) {
        const toDate = new Date(filters.to);
        const hasContractBefore = item.contracts.some(c => 
          new Date(c.valid_from) <= toDate
        );
        if (!hasContractBefore) return false;
      }

      // Filtro di ricerca testuale
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchesSearch = 
          item.customer.full_name.toLowerCase().includes(term) ||
          item.customer.email?.toLowerCase().includes(term) ||
          item.vehicles.some(v => v.plate.toLowerCase().includes(term)) ||
          item.contracts.some(c => c.contract_number.toLowerCase().includes(term));
        
        if (!matchesSearch) return false;
      }

      return true;
    });
  };

  // Effetto per applicare i filtri
  useEffect(() => {
    let filtered = customers;

    if (selectedType) {
      filtered = filtered.filter(item => 
        item.contracts.some(c => c.type === selectedType)
      );
    }

    filtered = applyAdvancedFilters(filtered, activeFilters);

    setFilteredCustomers(filtered);
  }, [selectedType, activeFilters, customers]);

  const toggleExpand = (index: number) => {
    setFilteredCustomers(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

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
      const { data } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      
      return data || { company_name: '' };
    } catch {
      return { company_name: '' };
    }
  };

  const getCustomerFullData = async (customerId: string) => {
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      return customer;
    } catch {
      return null;
    }
  };

  const getCustomerVehicles = async (customerId: string) => {
    try {
      const { data: vehicles } = await supabase
        .from('customer_vehicles')
        .select('plate')
        .eq('customer_id', customerId);
      
      if (!vehicles) return [];
      
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
      
      return vehicles.map(v => ({
        plate: v.plate,
        make: profileMap.get(v.plate)?.make || '',
        model: profileMap.get(v.plate)?.model || ''
      }));
    } catch {
      return [];
    }
  };

  const handleViewContract = (contractId: string, contractNumber: string) => {
    navigate(`/tenant/${tenantId}/contracts`);
  };

  const handlePrintContract = async (contractId: string, contractNumber: string, customer: Customer) => {
    try {
      setLoading(true);
      
      const contract = await getContractDetails(contractId);
      if (!contract) return;

      if (contract.generated_html) {
        printHTML(contract.generated_html);
      } else {
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
      if (!contract) return;

      let html: string;
      
      if (contract.generated_html) {
        html = contract.generated_html;
      } else {
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
      
      const safeFileName = `contratto-${Date.now()}.pdf`;
      const pdfBlob = await generatePDFFromHTML(html, safeFileName);
      downloadPDF(pdfBlob, safeFileName);
      
    } catch (error) {
      console.error('Errore generazione PDF:', error);
      alert('Errore durante la generazione del PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailContract = async (contractId: string, contractNumber: string, email?: string | null, customer?: Customer) => {
    if (!email || !customer) return;

    try {
      setLoading(true);
      
      const contract = await getContractDetails(contractId);
      if (!contract) return;

      let html: string;
      
      if (contract.generated_html) {
        html = contract.generated_html;
      } else {
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
      
      const safeFileName = `contratto-${Date.now()}.pdf`;
      const pdfBlob = await generatePDFFromHTML(html, safeFileName);
      
      await sendContractEmail(
        email,
        contractNumber,
        pdfBlob,
        customer.full_name || 'Cliente'
      );

      alert(`✅ Contratto ${contractNumber} inviato con successo a ${email}`);
      
    } catch (error) {
      console.error('Errore invio email:', error);
      alert('Errore durante l\'invio del contratto via email');
    } finally {
      setLoading(false);
    }
  };

  const handleEditContract = (contractId: string, contractNumber: string) => {
    alert(`Funzionalità di modifica in sviluppo per il contratto ${contractNumber}`);
  };

  const handleDeleteContract = async (contractId: string, contractNumber: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il contratto ${contractNumber}?`)) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
      
      if (error) throw error;
      
      alert(`✅ Contratto ${contractNumber} eliminato con successo`);
      await loadCustomersData();
      
    } catch (error) {
      console.error('Errore eliminazione contratto:', error);
      alert('Errore durante l\'eliminazione del contratto');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const data = filteredCustomers.flatMap(item => 
      item.contracts.map(contract => ({
        'Cliente': item.customer.full_name,
        'Email': item.customer.email || '',
        'Telefono': item.customer.phone || '',
        'Codice Fiscale': item.customer.fiscal_code || '',
        'Numero Contratto': contract.contract_number,
        'Tipo': contract.type_name,
        'Data Inizio': formatDate(contract.valid_from),
        'Data Fine': contract.valid_to ? formatDate(contract.valid_to) : '',
        'Importo': contract.price ? `€ ${contract.price}` : '',
        'Veicoli': item.vehicles.map(v => v.plate).join(', ')
      }))
    );

    if (data.length === 0) {
      alert('Nessun dato da esportare');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const csv = [
      headers,
      ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abbonati-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    
    html = html.replace(/\{'\{/g, '{').replace(/\}'\}/g, '}');

    const vehiclesHTML = vehicles.map(v => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #4f8cff;">Veicolo: ${v.make || ''} ${v.model || ''}</h4>
        <p><strong>Targa:</strong> ${v.plate || ''}</p>
      </div>
    `).join('');

    const replacements: Record<string, string> = {
      '{{COMPANY_NAME}}': companyInfo.company_name || '',
      '{{COMPANY_ADDRESS}}': companyInfo.address || '',
      '{{COMPANY_CITY}}': companyInfo.city || '',
      '{{COMPANY_VAT}}': companyInfo.vat || '',
      '{{COMPANY_PHONE}}': companyInfo.phone || '',
      '{{COMPANY_EMAIL}}': companyInfo.email || '',
      '{{COMPANY_LOGO}}': companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" style="max-height: 60px;">` : '',
      
      '{{CONTRACT_TITLE}}': template.title || 'Contratto',
      '{{CONTRACT_NUMBER}}': contract.contract_number,
      '{{CONTRACT_DATE}}': formatDate(contract.created_at),
      '{{CONTRACT_DURATION}}': contract.duration_months?.toString() || '',
      '{{CONTRACT_AMOUNT}}': contract.price?.toString() || '',
      '{{NOTES}}': contract.notes || '',
      '{{GENERATION_DATE}}': formatDate(new Date().toISOString()),
      
      '{{CUSTOMER_FULLNAME}}': `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
      '{{CUSTOMER_FISCAL_CODE}}': customer?.fiscal_code || '',
      '{{CUSTOMER_EMAIL}}': customer?.email || '',
      '{{CUSTOMER_PHONE}}': customer?.phone || '',
      
      '{{CUSTOMER_BIRTH_PLACE}}': customer?.birth_place || '',
      '{{CUSTOMER_BIRTH_DATE}}': customer?.birth_date ? formatDate(customer.birth_date) : '',
      '{{CUSTOMER_ADDRESS}}': customer?.address || '',
      '{{CUSTOMER_CITY}}': customer?.city || '',
      '{{CUSTOMER_POSTAL_CODE}}': customer?.postal_code || '',
      '{{CUSTOMER_PROVINCE}}': customer?.province || '',
      
      '{{VEHICLES_LIST}}': vehiclesHTML,
      '{{VEHICLES_COUNT}}': vehicles.length.toString(),
      '{{VEHICLE_PLATE}}': vehicles.map(v => v.plate).join(', '),
      '{{VEHICLE_MAKE}}': vehicles.map(v => v.make).join(', '),
      '{{VEHICLE_MODEL}}': vehicles.map(v => v.model).join(', '),
      
      '{{CONTRACT_TERMS}}': terms?.content || '',
    };

    Object.entries(replacements).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(escapedKey, 'g'), value);
    });

    return html;
  };

  // Componente StatsCards inline
  const StatsCards = ({ stats }: { stats: Stats }) => {
    const activePercentage = stats.total > 0 
      ? ((stats.active / stats.total) * 100).toFixed(1) 
      : '0';
    
    const expiringPercentage = stats.total > 0 
      ? ((stats.expiring / stats.total) * 100).toFixed(1) 
      : '0';

    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginBottom: '20px' 
      }}>
        <StatCard 
          label="Totale Contratti" 
          value={stats.total} 
          color="#4f8cff"
        />
        <StatCard 
          label="Attivi" 
          value={stats.active} 
          color="#10b981"
          subtitle={`${activePercentage}% del totale`}
        />
        <StatCard 
          label="In Scadenza" 
          value={stats.expiring} 
          color="#f59e0b"
          subtitle={`${expiringPercentage}% del totale`}
        />
        <StatCard 
          label="Scaduti" 
          value={stats.expired} 
          color="#ef4444"
        />
        <StatCard 
          label="Ricavo Totale" 
          value={`€ ${stats.totalRevenue.toFixed(2)}`} 
          color="#8b5cf6"
        />
        <StatCard 
          label="Media/Contratto" 
          value={`€ ${stats.avgPrice.toFixed(2)}`} 
          color="#ec4899"
        />
      </div>
    );
  };

  const StatCard = ({ label, value, color, subtitle }: { 
    label: string; 
    value: string | number; 
    color: string;
    subtitle?: string;
  }) => (
    <div style={{
      background: BG_DARK,
      padding: '20px',
      borderRadius: '10px',
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '5px' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>{value}</div>
      {subtitle && <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '5px' }}>{subtitle}</div>}
    </div>
  );

  // Componente AdvancedFilters inline
  const AdvancedFilters = ({ onFilterChange, onExport }: { 
    onFilterChange: (filters: FilterValues) => void;
    onExport: () => void;
  }) => {
    const [filters, setFilters] = useState<FilterValues>({
      type: '',
      status: '',
      from: '',
      to: '',
      search: ''
    });
    const [isExpanded, setIsExpanded] = useState(false);

    const handleFilterChange = (key: keyof FilterValues, value: string) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilterChange(newFilters);
    };

    const handleReset = () => {
      const resetFilters = {
        type: '',
        status: '',
        from: '',
        to: '',
        search: ''
      };
      setFilters(resetFilters);
      onFilterChange(resetFilters);
    };

    const selectStyle: React.CSSProperties = {
      padding: '10px 15px',
      background: BG_LIGHTER,
      border: '1px solid #333',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '14px',
      minWidth: '150px',
      cursor: 'pointer'
    };

    const inputStyle: React.CSSProperties = {
      padding: '10px 15px',
      background: BG_LIGHTER,
      border: '1px solid #333',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '14px',
      minWidth: '130px'
    };

    const buttonStyle: React.CSSProperties = {
      padding: '10px 20px',
      background: 'transparent',
      border: `1px solid ${BLUE}`,
      color: BLUE,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    };

    return (
      <div style={{ 
        background: BG_DARK, 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '20px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: isExpanded ? '20px' : '0'
        }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: BLUE,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {isExpanded ? '▼ Nascondi filtri' : '▶ Mostra filtri avanzati'}
          </button>

          <button
            onClick={onExport}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = BLUE;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = BLUE;
            }}
          >
            <span>📥</span> Esporta CSV
          </button>
        </div>

        {isExpanded && (
          <>
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              flexWrap: 'wrap', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <select 
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={selectStyle}
              >
                <option value="">Tutti i tipi</option>
                <option value="subscription">Abbonamenti</option>
                <option value="wash_fidelity">Fedeltà Lavaggio</option>
                <option value="convention">Convenzioni</option>
                <option value="generic">Generici</option>
              </select>

              <select 
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={selectStyle}
              >
                <option value="">Tutti gli stati</option>
                <option value="active">Attivi</option>
                <option value="expiring">In scadenza (30gg)</option>
                <option value="expired">Scaduti</option>
              </select>

              <input
                type="date"
                placeholder="Dal"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                style={inputStyle}
              />

              <input
                type="date"
                placeholder="Al"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                style={inputStyle}
              />

              <input
                type="text"
                placeholder="Cerca..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                style={{ ...inputStyle, minWidth: '250px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #666',
                  color: '#9ca3af',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = BLUE;
                  e.currentTarget.style.color = BLUE;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#666';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                ↻ Reset filtri
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
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
        <h1 style={{ color: "#fff", margin: 0, fontSize: "20px", display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaUsers /> Gestione Abbonati
        </h1>
      </div>

      {/* Statistiche */}
      {showStats && <StatsCards stats={stats} />}

      {/* Filtri avanzati */}
      <AdvancedFilters 
        onFilterChange={setActiveFilters}
        onExport={handleExportCSV}
      />

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
          {/* Intestazione con tipo selezionato e ricerca base */}
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
                placeholder="Cerca rapida..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setActiveFilters(prev => ({ ...prev, search: e.target.value }));
                }}
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

                          {/* Pulsanti azioni - ADMIN */}
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button
                              onClick={() => handleEditContract(contract.id, contract.contract_number)}
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
                              <FaEdit /> Modifica
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id, contract.contract_number)}
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
                              <FaTrash /> Elimina
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

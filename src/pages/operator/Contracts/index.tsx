// src/pages/operator/Contracts/index.tsx - VERSIONE COMPLETA CORRETTA

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaFileContract, FaUser, FaHome, FaIdCard, FaCar, FaFileAlt } from "react-icons/fa";

// Componenti
import { TabButton } from "./components/ui/TabButton";
import { AnagraficaTab } from "./components/tabs/AnagraficaTab";
import { ResidenzaTab } from "./components/tabs/ResidenzaTab";
import { DocumentoTab } from "./components/tabs/DocumentoTab";
import { VeicoliTab } from "./components/tabs/VeicoliTab";
import { ContrattoTab } from "./components/tabs/ContrattoTab";

// Hooks
import { useCompanyInfo } from "./hooks/useCompanyInfo";
import { useTemplates } from "./hooks/useTemplates";
import { useVehicles } from "./hooks/useVehicles";

// Tipi
import type { ContractTemplate, FormData, GeneratedContract } from "./types";

// Costanti
import { BLUE, BG_DARK, CONTRACT_TYPES } from "./constants";

// Servizi
import { generatePDFFromHTML, downloadPDF, printHTML } from "@/services/pdfService";
import { sendContractEmail } from "@/services/emailService";
import { supabase } from "@/services/supabase";

// Utils
import { formatDate } from "./utils/formatters";

// Interfaccia per la configurazione del template
interface TemplateConfig {
  type: string;
  sections: string[];
  required_fields: {
    customer: string[];
    vehicle: string[];
  };
  show_vehicle_tariffs: boolean;
  show_contract_duration: boolean;
  show_contract_price: boolean;
  layout: string;
}

// 🔥 CONFIGURAZIONE DEFAULT PER I TEMPLATE (INCLUSI TUTTI I CAMPI)
const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  type: 'standard',
  sections: ['anagrafica', 'residenza', 'documento', 'veicolo', 'contratto'],
  required_fields: {
    customer: [
      'first_name', 'last_name', 'fiscal_code', 
      'birth_date', 'birth_place', 
      'address', 'city', 'postal_code', 'province',  // 🔥 CAMPI RESIDENZA
      'email', 'phone',
      'document_type', 'document_number', 'document_issue_date', 
      'document_expiry_date', 'document_issuing_authority'  // 🔥 CAMPI DOCUMENTO
    ],
    vehicle: ['plate', 'make', 'model']
  },
  show_vehicle_tariffs: true,
  show_contract_duration: true,
  show_contract_price: true,
  layout: 'completo'
};

export default function OperatorContracts() {
  const navigate = useNavigate();
  const { tenantId } = useParams();
  
  // Stati principali
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('anagrafica');
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Custom hooks
  const { companyInfo, companyInfoError } = useCompanyInfo(tenantId);
  const { templates, terms, loading: templatesLoading } = useTemplates(tenantId, selectedType);
  const { 
    vehicles, 
    selectedVehicle, 
    setSelectedVehicle, 
    brands,
    models,
    loadingBrands,
    loadingModels,
    addVehicle, 
    removeVehicle, 
    updateVehicle,
    addTariff,
    removeTariff,
    updateTariff
  } = useVehicles(tenantId);
  
  // Form dati
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    fiscal_code: "",
    birth_date: "",
    birth_place: "",
    birth_province: "",
    address: "",
    city: "",
    postal_code: "",
    province: "",
    email: "",
    phone: "",
    mobile: "",
    fax: "",
    document_type: "",
    document_number: "",
    document_issue_date: "",
    document_expiry_date: "",
    document_issuing_authority: "",
    document_issuing_place: "",
    duration_months: "",
    price: "",
    notes: "",
    send_email: true,
    print_copy: true
  });

  // 🔥 Determina la configurazione del template con FALLBACK
  const templateConfig = (selectedTemplate?.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG;
  const safeSections = templateConfig?.sections || DEFAULT_TEMPLATE_CONFIG.sections;
  const safeRequiredFields = templateConfig?.required_fields || DEFAULT_TEMPLATE_CONFIG.required_fields;

  const availableTabs = [
    { id: 'anagrafica', label: 'Anagrafica', show: safeSections.includes('anagrafica') },
    { id: 'residenza', label: 'Residenza', show: safeSections.includes('residenza') },
    { id: 'documento', label: 'Documento', show: safeSections.includes('documento') },
    { id: 'veicolo', label: 'Veicolo', show: safeSections.includes('veicolo') },
    { id: 'contratto', label: 'Contratto', show: safeSections.includes('contratto') }
  ].filter(tab => tab.show);

  useEffect(() => {
    if (selectedTemplate && availableTabs.length > 0 && !availableTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [selectedTemplate, availableTabs, activeTab]);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setSelectedTemplate(null);
    setStep(2);
  };

  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      duration_months: template.default_duration_months?.toString() || "",
      price: template.default_price?.toString() || ""
    }));
    setStep(3);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      if (step === 2) setSelectedTemplate(null);
      if (step === 3) setSelectedType(null);
    } else {
      navigate(-1);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    console.log(`📝 handleInputChange: ${field} = ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 🔥 GENERA HTML DEL CONTRATTO - VERSIONE COMPLETA
  const generateContractHTML = (): string => {
    if (!selectedTemplate || !companyInfo) return "";

    let html = selectedTemplate.content || "";
    const term = selectedTemplate.terms_id ? terms[selectedTemplate.terms_id] : null;

    // Pulisci eventuali placeholder malformati
    html = html.replace(/\{\{\{\s*/g, '{{').replace(/\s*\}\}\}/g, '}}');
    html = html.replace(/\{\{\s*/g, '{{').replace(/\s*\}\}/g, '}}');
    html = html.replace(/\{'\{/g, '{').replace(/\}'\}/g, '}');

    // Helper per formattare le date
    const formatDateHelper = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT');
      } catch {
        return '';
      }
    };

    // Primo veicolo (per retrocompatibilità con placeholder singoli)
    const primoVeicolo = vehicles.find(v => v.plate) || vehicles[0];

    // Genera HTML per veicoli multipli (assicurati che includa TUTTI i veicoli)
const vehiclesHTML = vehicles.filter(v => v.plate).map(v => `
  <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #4f8cff;">Veicolo: ${v.make} ${v.model}</h4>
    <p><strong>Targa:</strong> ${v.plate}</p>
    <p><strong>Anno:</strong> ${v.year || 'N/D'} - <strong>Colore:</strong> ${v.color || 'N/D'}</p>
    ${v.monthly_price ? `<p><strong>Canone mensile:</strong> € ${v.monthly_price}</p>` : ''}
  </div>
`).join('');

console.log(`🔍 VEHICLES_HTML generato per ${vehicles.filter(v => v.plate).length} veicoli`);

    // Calcola il prezzo totale dai canoni mensili dei veicoli
let totalMonthlyPrice = 0;
for (const vehicle of vehicles) {
  if (vehicle.monthly_price && vehicle.monthly_price !== "") {
    totalMonthlyPrice += parseFloat(vehicle.monthly_price);
  }
}

// Usa il prezzo calcolato dai veicoli, altrimenti usa formData.price come fallback
const monthlyPrice = totalMonthlyPrice > 0 ? totalMonthlyPrice : (parseFloat(formData.price) || 0);
const durationMonths = parseInt(formData.duration_months) || 0;
const totalAmount = durationMonths * monthlyPrice;

console.log("🔍 PREZZO CALCOLATO:", {
  totalMonthlyPrice,
  monthlyPrice,
  durationMonths,
  totalAmount
});

console.log("🔍 FORM DATA per PDF:", {
  address: formData.address,
  city: formData.city,
  postal_code: formData.postal_code,
  province: formData.province,
  document_type: formData.document_type,
  document_number: formData.document_number,
  document_issue_date: formData.document_issue_date,
  document_expiry_date: formData.document_expiry_date,
  document_issuing_authority: formData.document_issuing_authority,
});

    // Costruisci la mappa dei placeholder
    const replacements: Record<string, string> = {
      // ========== DATI AZIENDA ==========
      '{{COMPANY_LOGO}}': companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" style="max-height: 60px;">` : '',
      '{{COMPANY_NAME}}': companyInfo.company_name || '',
      '{{COMPANY_ADDRESS}}': companyInfo.legal_address || '',
      '{{COMPANY_LEGAL_ADDRESS}}': companyInfo.legal_address || '',
      '{{COMPANY_VAT}}': companyInfo.vat_number || '',
      '{{COMPANY_EMAIL}}': companyInfo.email || '',
      '{{COMPANY_PHONE}}': companyInfo.phone || '',
      '{{COMPANY_TAXCODE}}': companyInfo.tax_code || '',
      
      // ========== DATI CONTRATTO ==========
      '{{CONTRACT_TITLE}}': selectedTemplate.title || selectedTemplate.name || 'Contratto',
      '{{CONTRACT_NUMBER}}': generatedContract?.contract_number || `CONTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      '{{CONTRACT_DATE}}': new Date().toLocaleDateString('it-IT'),
      '{{CONTRACT_DURATION}}': durationMonths.toString(),
      '{{CONTRACT_AMOUNT}}': monthlyPrice.toFixed(2),
      '{{CONTRACT_TOTAL}}': totalAmount.toFixed(2),
      '{{NOTES}}': formData.notes || '',
      
      // ========== DATI CLIENTE (Anagrafica) ==========
      '{{CUSTOMER_FULLNAME}}': `${formData.first_name} ${formData.last_name}`.trim(),
      '{{CUSTOMER_FIRST_NAME}}': formData.first_name || '',
      '{{CUSTOMER_LAST_NAME}}': formData.last_name || '',
      '{{CUSTOMER_FISCAL_CODE}}': formData.fiscal_code || '',
      '{{CUSTOMER_FISCALCODE}}': formData.fiscal_code || '',
      
      // ========== DATI CLIENTE (Nascita) ==========
      '{{CUSTOMER_BIRTH_DATE}}': formatDateHelper(formData.birth_date),
      '{{CUSTOMER_BIRTH_PLACE}}': formData.birth_place || '',
      '{{CUSTOMER_BIRTH_PROVINCE}}': formData.birth_province || '',
      
      // ========== DATI CLIENTE (Residenza) - 🔥 CORRETTI ==========
      '{{CUSTOMER_ADDRESS}}': formData.address || '',
      '{{CUSTOMER_CITY}}': formData.city || '',
      '{{CUSTOMER_POSTAL_CODE}}': formData.postal_code || '',
      '{{CUSTOMER_PROVINCE}}': formData.province || '',
      
      // ========== DATI CLIENTE (Contatti) ==========
      '{{CUSTOMER_EMAIL}}': formData.email || '',
      '{{CUSTOMER_PHONE}}': formData.phone || '',
      
      // ========== DOCUMENTO DI RICONOSCIMENTO - 🔥 CORRETTI ==========
      '{{CUSTOMER_DOCUMENT_TYPE}}': formData.document_type || '',
      '{{CUSTOMER_DOCUMENT_NUMBER}}': formData.document_number || '',
      '{{CUSTOMER_DOCUMENT_ISSUING_AUTHORITY}}': formData.document_issuing_authority || '',
      '{{CUSTOMER_DOCUMENT_ISSUE_DATE}}': formatDateHelper(formData.document_issue_date),
      '{{CUSTOMER_DOCUMENT_EXPIRY_DATE}}': formatDateHelper(formData.document_expiry_date),
      
      // ========== VEICOLO (singolo - per retrocompatibilità) ==========
      '{{VEHICLE_PLATE}}': primoVeicolo?.plate || '',
      '{{VEHICLE_MAKE}}': primoVeicolo?.make || '',
      '{{VEHICLE_MODEL}}': primoVeicolo?.model || '',
      '{{VEHICLE_YEAR}}': primoVeicolo?.year || '',
      '{{VEHICLE_COLOR}}': primoVeicolo?.color || '',
      
      // ========== VEICOLI MULTIPLI ==========
      '{{VEHICLES_LIST}}': vehiclesHTML || '<p>Nessun veicolo registrato</p>',
      '{{VEHICLES_COUNT}}': vehicles.filter(v => v.plate).length.toString(),
      
      // ========== TERMINI E CONDIZIONI ==========
      '{{CONTRACT_TERMS}}': term?.content || '',
      '{{TERMS}}': term?.content || '',
      
      // ========== GENERAZIONE DOCUMENTO ==========
      '{{GENERATION_DATE}}': new Date().toLocaleString('it-IT'),
    };

    // Sostituisci TUTTI i placeholder
    console.log("🔍 Placeholder da sostituire:", Object.keys(replacements).length);
    
    Object.entries(replacements).forEach(([key, value]) => {
      if (html.includes(key)) {
        console.log(`✅ Sostituisco: ${key} -> ${value?.substring(0, 50) || '(vuoto)'}`);
      }
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      html = html.replace(regex, value || '');
    });

    return html;
  };

  // 🔥 GENERA CONTRATTO E SALVA NEL DB (VERSIONE COMPLETA CON VEICOLI)
const handleGenerateContract = async () => {
  if (!selectedTemplate || !companyInfo || !tenantId) return;
  
  setLoading(true);
  
  try {
    const contractHTML = generateContractHTML();
    const contractNumber = `CONTR-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}-${Date.now().toString().slice(-6)}`;

    // 1. CREA CLIENTE
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        tenant_id: tenantId,
        type: 'private',
        first_name: formData.first_name,
        last_name: formData.last_name,
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        fiscal_code: formData.fiscal_code || null,
        birth_date: formData.birth_date || null,
        birth_place: formData.birth_place || null,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        province: formData.province || null,
        email: formData.email || null,
        phone: formData.phone || null,
        document_type: formData.document_type || null,
        document_number: formData.document_number || null,
        document_issue_date: formData.document_issue_date || null,
        document_expiry_date: formData.document_expiry_date || null,
        document_issuing_authority: formData.document_issuing_authority || null,
        is_active: true
      })
      .select()
      .single();

    if (customerError) throw customerError;
    console.log("✅ Cliente creato:", customer.id);

    // 2. 🔥 SALVA I VEICOLI NEL DATABASE (VERSIONE CORRETTA)
const vehicleIds: string[] = [];

for (const vehicle of vehicles) {
  if (!vehicle.plate) {
    console.log("⚠️ Veicolo senza targa, saltato");
    continue;
  }
  
  const plate = vehicle.plate.toUpperCase().trim();
  console.log(`🚗 Salvataggio veicolo: ${plate}`);
  console.log(`   Dettagli: make=${vehicle.make}, model=${vehicle.model}, brand_id=${vehicle.brand_id}, model_id=${vehicle.model_id}`);
  console.log(`   monthly_price=${vehicle.monthly_price}, color_id=${vehicle.color_id}, category_id=${vehicle.category_id}`);
  
  try {
    // 2a. CERCA O CREA IL PROFILO VEICOLO
let vehicleProfileId = null;

// Prima cerca se esiste già
const { data: existingProfile, error: searchError } = await supabase
  .from('vehicle_profiles')
  .select('id')
  .eq('tenant_id', tenantId)
  .eq('plate', plate)
  .maybeSingle();

if (searchError) {
  console.error(`❌ Errore ricerca veicolo ${plate}:`, searchError);
} else if (existingProfile) {
  vehicleProfileId = existingProfile.id;
  console.log(`✅ Veicolo già esistente: ${vehicleProfileId}`);
} else {
  // 🔥 INSERIMENTO MINIMALE (solo targa) - quello che ha funzionato
  // Nel tuo handleGenerateContract, modifica la creazione del veicolo:

console.log(`🆕 Creazione nuovo veicolo (minimale) per targa: ${plate}`);

const { data: newProfile, error: profileError } = await supabase
  .from('vehicle_profiles')
  .insert({
    tenant_id: tenantId,
    plate: plate,
    // 🔥 NON INSERIRE brand_id e model_id - solo targa
    updated_at: new Date().toISOString()
  })
  .select()
  .single();

if (profileError) {
  console.error(`❌ Errore creazione veicolo ${plate}:`, profileError);
  continue;
}

vehicleProfileId = newProfile.id;
console.log(`✅ Veicolo creato con ID: ${vehicleProfileId}`);

// 🔥 NON fare l'update con brand_id e model_id
  
  // 🔥 DOPO aver creato il veicolo, aggiorna marca e modello separatamente
  if (vehicle.brand_id || vehicle.model_id || vehicle.color_id || vehicle.category_id) {
    console.log(`🔄 Aggiornamento campi aggiuntivi per ${plate}...`);
    
    const updateData: any = {};
    if (vehicle.brand_id) updateData.brand_id = vehicle.brand_id;
    if (vehicle.model_id) updateData.model_id = vehicle.model_id;
    if (vehicle.color_id) updateData.color_id = vehicle.color_id;
    if (vehicle.category_id) updateData.category_id = vehicle.category_id;
    updateData.updated_at = new Date().toISOString();
    
    const { error: updateError } = await supabase
  .from('vehicle_profiles')
  .update(updateData)
  .eq('id', vehicleProfileId);

if (updateError && updateError.code !== '409') {  // Ignora errore 409 (conflict)
  console.error(`❌ Errore aggiornamento campi veicolo ${plate}:`, updateError);
} else if (updateError && updateError.code === '409') {
  console.log(`⚠️ Aggiornamento saltato (già eseguito dal trigger) per ${plate}`);
} else {
  console.log(`✅ Campi aggiuntivi aggiornati per ${plate}`);
}
  }   
 }
 
 // 2b. ASSOCIA IL VEICOLO AL CLIENTE (tabella customer_vehicles)
    const { error: customerVehicleError } = await supabase
      .from('customer_vehicles')
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        plate: plate,
        brand: vehicle.make || null,
        model: vehicle.model || null,
        color: vehicle.color || null,
        category_id: vehicle.category_id || null,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (customerVehicleError) {
      console.error(`❌ Errore associazione veicolo ${plate} al cliente:`, customerVehicleError);
    } else {
      console.log(`🔗 Veicolo ${plate} associato al cliente`);
    }
    
  } catch (err) {
    console.error(`❌ Errore salvataggio veicolo ${plate}:`, err);
  }
}

console.log(`✅ Totale veicoli salvati: ${vehicleIds.length}`);

    // 3. CREA CONTRATTO
    const validFrom = new Date().toISOString().split('T')[0];
    const validTo = formData.duration_months 
      ? new Date(Date.now() + parseInt(formData.duration_months) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    // 🔥 Calcola il prezzo totale dal canone mensile dei veicoli
    let totalMonthlyPrice = 0;
    for (const vehicle of vehicles) {
      if (vehicle.monthly_price && vehicle.monthly_price !== "") {
        totalMonthlyPrice += parseFloat(vehicle.monthly_price);
      }
    }
    // Se non ci sono prezzi per veicolo, usa il prezzo del contratto
    const finalPrice = totalMonthlyPrice > 0 ? totalMonthlyPrice : (formData.price ? parseFloat(formData.price) : null);
    
    console.log(`💰 Prezzo calcolato: ${finalPrice} (da veicoli: ${totalMonthlyPrice})`);

    const { data: newContract, error: contractError } = await supabase
      .from("contracts")
      .insert({
        tenant_id: tenantId,
        contract_number: contractNumber,
        customer_id: customer.id,
        template_id: selectedTemplate.id,
        signed_at: new Date().toISOString(),
        valid_from: validFrom,
        valid_to: validTo,
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
        price: finalPrice,
        notes: formData.notes || null,
        generated_html: contractHTML,
      })
      .select()
      .single();

    if (contractError) throw contractError;
    console.log("✅ Contratto creato:", newContract.id);

    // 4. 🔥 COLLEGA I VEICOLI AL CONTRATTO
for (const vehicleProfileId of vehicleIds) {
  const { error: contractVehicleError } = await supabase
    .from('contract_vehicles')
    .insert({
      contract_id: newContract.id,
      vehicle_id: vehicleProfileId,
      subscription_id: null,  // sarà aggiornato dopo la creazione della subscription
      fidelity_id: null,
      created_at: new Date().toISOString()
    });
  
  if (contractVehicleError) {
    console.error(`❌ Errore collegamento veicolo ${vehicleProfileId} al contratto:`, contractVehicleError);
  } else {
    console.log(`🔗 Veicolo ${vehicleProfileId} collegato al contratto`);
  }
}

    // 5. 🔥 CREA SUBSCRIPTION PER ABBONAMENTO
    if (selectedType === 'subscription' && finalPrice > 0) {
      console.log("📅 Creazione subscription per abbonamento...");
      
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          tenant_id: tenantId,
          customer_id: customer.id,
          contract_id: newContract.id,
          subscription_type: formData.duration_months && parseInt(formData.duration_months) >= 12 ? 'annual' : 'monthly',
          start_date: validFrom,
          end_date: validTo,
          price: finalPrice,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (subscriptionError) {
        console.error("❌ Errore creazione subscription:", subscriptionError);
      } else {
        console.log("✅ Subscription creata con prezzo:", finalPrice);
      }
    }

    setGeneratedContract(newContract);
    
    // 6. GENERA PDF
    const pdfBlob = await generatePDFFromHTML(contractHTML, `contratto-${contractNumber}.pdf`);
    
    if (formData.send_email && formData.email) {
      await sendContractEmail(
        formData.email,
        contractNumber,
        pdfBlob,
        `${formData.first_name} ${formData.last_name}`
      );
    }
    
    if (formData.print_copy) {
      printHTML(contractHTML);
    }
    
    setStep(4);
    
  } catch (err) {
    console.error("❌ Errore generazione contratto:", err);
    alert("Errore durante la generazione del contratto: " + (err as Error).message);
  } finally {
    setLoading(false);
  }
};

  const handlePrint = () => {
    if (!selectedTemplate || !companyInfo) return;
    printHTML(generateContractHTML());
  };

  const handleDownloadPDF = async () => {
    if (!selectedTemplate || !companyInfo) return;
    
    setPdfGenerating(true);
    try {
      const contractHTML = generateContractHTML();
      const contractNumber = generatedContract?.contract_number || `CONTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
      const pdfBlob = await generatePDFFromHTML(contractHTML, `contratto-${contractNumber}.pdf`);
      downloadPDF(pdfBlob, `contratto-${contractNumber}.pdf`);
    } catch (error) {
      console.error("Errore generazione PDF:", error);
      alert("Errore durante la generazione del PDF");
    } finally {
      setPdfGenerating(false);
    }
  };

  // 🔥 RENDER STEP 1
  const renderStep1 = () => (
    <div>
      <h2 style={{ marginBottom: "20px", color: BLUE }}>Seleziona il tipo di contratto</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        {CONTRACT_TYPES.map(type => (
          <div
            key={type.id}
            onClick={() => handleSelectType(type.id)}
            style={{
              background: BG_DARK,
              padding: "25px",
              borderRadius: "12px",
              border: `2px solid ${type.colore}`,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              textAlign: "center"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <div style={{ color: type.colore, marginBottom: "15px", fontSize: "40px" }}>{type.icon}</div>
            <h3 style={{ color: "#fff", marginBottom: "10px" }}>{type.nome}</h3>
            <p style={{ color: "#9ca3af", fontSize: "13px" }}>{type.descrizione}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // 🔥 RENDER STEP 2
  const renderStep2 = () => (
    <div>
      <h2 style={{ marginBottom: "20px", color: BLUE }}>Scegli il modello di contratto</h2>
      
      {templatesLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
          <div>Caricamento modelli...</div>
        </div>
      ) : templates.length === 0 ? (
        <div style={{ background: BG_DARK, padding: "40px", borderRadius: "12px", textAlign: "center", color: "#9ca3af" }}>
          <p>Nessun modello attivo per questo tipo di contratto.</p>
          <p style={{ fontSize: "12px", marginTop: "10px" }}>Contatta l'amministratore per creare un modello di contratto.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "15px" }}>
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              style={{
                background: BG_DARK,
                padding: "20px",
                borderRadius: "10px",
                border: "1px solid #333",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = BLUE}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "#333"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ color: "#fff", marginBottom: "5px" }}>{template.name}</h3>
                  <p style={{ color: "#9ca3af", fontSize: "13px" }}>{template.title || "Contratto"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {template.default_duration_months && (
                    <div style={{ color: BLUE, fontSize: "14px" }}>📅 {template.default_duration_months} mesi</div>
                  )}
                  {template.default_price && (
                    <div style={{ color: BLUE, fontSize: "14px" }}>💰 € {template.default_price}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 🔥 RENDER STEP 3 - CON CORREZIONI PER RESIDENZA E DOCUMENTO
  const renderStep3 = () => {
    if (availableTabs.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#f59e0b" }}>
          <h3>⚠️ Configurazione contratto incompleta</h3>
          <p>Il modello di contratto selezionato non ha una configurazione valida.</p>
          <button onClick={() => setStep(2)} style={{ marginTop: "20px", padding: "10px 20px", background: BLUE, border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>
            Torna ai modelli
          </button>
        </div>
      );
    }

    return (
      <div>
        <h2 style={{ marginBottom: "20px", color: BLUE }}>Dati del contratto</h2>
        
        <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "1px solid #333", flexWrap: "wrap" }}>
          {availableTabs.map(tab => (
            <TabButton key={tab.id} label={tab.label} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
          ))}
        </div>
        
        <div style={{ background: BG_DARK, padding: "20px", borderRadius: "10px" }}>
          {activeTab === 'anagrafica' && (
            <AnagraficaTab 
              formData={formData} 
              onInputChange={handleInputChange}
              requiredFields={safeRequiredFields.customer || []}
              showAllFields={selectedType === 'subscription'}
            />
          )}
          {activeTab === 'residenza' && (
            <ResidenzaTab 
              formData={formData} 
              onInputChange={handleInputChange}
              requiredFields={['address', 'city', 'postal_code', 'province']}  // 🔥 FORZA I CAMPI RESIDENZA
            />
          )}
          {activeTab === 'documento' && (
            <DocumentoTab 
              formData={formData} 
              onInputChange={handleInputChange}
              showAllFields={true}  // 🔥 FORZA VISUALIZZAZIONE DOCUMENTO
            />
          )}
          {activeTab === 'veicolo' && (
            <VeicoliTab 
              formData={formData} 
              onInputChange={handleInputChange}
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              onAddVehicle={addVehicle}
              onRemoveVehicle={removeVehicle}
              onUpdateVehicle={updateVehicle}
              onAddTariff={addTariff}
              onRemoveTariff={removeTariff}
              onUpdateTariff={updateTariff}
              brands={brands}
              models={models}
              loadingBrands={loadingBrands}
              loadingModels={loadingModels}
              showTariffs={templateConfig?.show_vehicle_tariffs || false}
              tenantId={tenantId}
              contractType={selectedType}
            />
          )}
          {activeTab === 'contratto' && (
            <ContrattoTab 
              formData={formData} 
              onInputChange={handleInputChange}
              defaultDuration={selectedTemplate?.default_duration_months?.toString()}
              defaultPrice={selectedTemplate?.default_price?.toString()}
              showDuration={templateConfig?.show_contract_duration || false}
              showPrice={templateConfig?.show_contract_price || false}
            />
          )}
        </div>
      </div>
    );
  };

  // 🔥 RENDER STEP 4
  const renderStep4 = () => (
    <div>
      <div style={{ background: "#10b981", color: "#fff", padding: "20px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "15px" }}>
        <FaFileContract size={30} />
        <div>
          <h3 style={{ marginBottom: "5px" }}>Contratto generato con successo!</h3>
          <p>Numero contratto: {generatedContract?.contract_number}</p>
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: BG_DARK, padding: "20px", borderRadius: "10px" }}>
          <h4 style={{ color: "#fff", marginBottom: "10px" }}>Riepilogo</h4>
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}><strong>Cliente:</strong> {formData.first_name} {formData.last_name}</p>
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}><strong>Veicoli:</strong> {vehicles.filter(v => v.plate).map(v => v.plate).join(', ') || 'Nessuno'}</p>
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}><strong>Durata:</strong> {formData.duration_months || 0} mesi</p>
          <p style={{ color: "#9ca3af" }}><strong>Importo:</strong> € {formData.price || 0}</p>
        </div>
        
        <div style={{ background: BG_DARK, padding: "20px", borderRadius: "10px" }}>
          <h4 style={{ color: "#fff", marginBottom: "10px" }}>Azioni</h4>
          <button onClick={() => setShowPreview(!showPreview)} style={{ width: "100%", padding: "12px", marginBottom: "10px", background: "transparent", border: `1px solid ${BLUE}`, color: BLUE, borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            {showPreview ? "Nascondi anteprima" : "Mostra anteprima"}
          </button>
          <button onClick={handlePrint} style={{ width: "100%", padding: "12px", marginBottom: "10px", background: BLUE, border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            Stampa contratto
          </button>
          <button onClick={handleDownloadPDF} disabled={pdfGenerating} style={{ width: "100%", padding: "12px", marginBottom: "10px", background: "#10b981", border: "none", color: "#fff", borderRadius: "6px", cursor: pdfGenerating ? "not-allowed" : "pointer", fontWeight: "bold", opacity: pdfGenerating ? 0.5 : 1 }}>
            {pdfGenerating ? "Generazione PDF..." : "Scarica PDF"}
          </button>
          <button onClick={() => navigate("/dashboard")} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>
            Torna alla dashboard
          </button>
        </div>
      </div>
      
      {showPreview && (
        <div style={{ background: "#fff", color: "#000", padding: "30px", borderRadius: "10px", maxHeight: "600px", overflowY: "auto" }}>
          <div dangerouslySetInnerHTML={{ __html: generateContractHTML() }} />
        </div>
      )}
    </div>
  );

  // Errori
  if (!tenantId) {
    return (
      <div style={{ padding: "24px", color: "#fff", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444" }}>Errore</h2>
        <p>Tenant non identificato.</p>
        <button onClick={() => navigate("/")} style={{ marginTop: "20px", padding: "10px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          Torna alla dashboard
        </button>
      </div>
    );
  }

  if (companyInfoError) {
    return (
      <div style={{ padding: "24px", color: "#fff", textAlign: "center" }}>
        <h2 style={{ color: "#f59e0b" }}>⚠️ {companyInfoError}</h2>
        <p>L'admin tenant deve prima configurare i dati aziendali.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: "20px", padding: "10px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
          Torna indietro
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header navigazione */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px", background: BG_DARK, padding: "15px 20px", borderRadius: "10px" }}>
        <button onClick={handleBack} style={{ background: "transparent", border: "none", color: BLUE, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "14px" }}>
          ← Indietro
        </button>
        
        <div style={{ display: "flex", gap: "10px", flex: 1 }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: "4px", background: s <= step ? BLUE : "#333", borderRadius: "2px" }} />
          ))}
        </div>
        
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>Passo {step} di 4</div>
      </div>

      {/* Contenuto step */}
      <div style={{ background: BG_DARK, padding: "30px", borderRadius: "12px", minHeight: "500px" }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Bottoni step 3 */}
      {step === 3 && (
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => setStep(2)} style={{ padding: "12px 24px", background: "transparent", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>
            Indietro
          </button>
          <button
            onClick={handleGenerateContract}
            disabled={loading || !formData.first_name || !formData.last_name}
            style={{
              padding: "12px 24px",
              background: BLUE,
              border: "none",
              color: "#fff",
              borderRadius: "6px",
              cursor: "pointer",
              opacity: loading || !formData.first_name || !formData.last_name ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <FaFileContract /> Genera contratto
          </button>
        </div>
      )}
    </div>
  );
}
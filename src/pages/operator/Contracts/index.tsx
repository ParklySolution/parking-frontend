// src/pages/operator/Contracts/index.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaFileContract } from "react-icons/fa";

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

  // Determina le sezioni disponibili in base alla configurazione del template
  const templateConfig = (selectedTemplate?.config as TemplateConfig) || {
    sections: ['anagrafica', 'residenza', 'documento', 'veicolo', 'contratto'],
    required_fields: {
      customer: ['first_name', 'last_name', 'fiscal_code', 'birth_date', 'birth_place', 'address', 'city', 'email', 'phone'],
      vehicle: ['plate', 'make', 'model']
    },
    show_vehicle_tariffs: true,
    show_contract_duration: true,
    show_contract_price: true,
    layout: 'completo'
  };

  const availableTabs = [
    { id: 'anagrafica', label: 'Anagrafica', show: templateConfig.sections.includes('anagrafica') },
    { id: 'residenza', label: 'Residenza', show: templateConfig.sections.includes('residenza') },
    { id: 'documento', label: 'Documento', show: templateConfig.sections.includes('documento') },
    { id: 'veicolo', label: 'Veicolo', show: templateConfig.sections.includes('veicolo') },
    { id: 'contratto', label: 'Contratto', show: templateConfig.sections.includes('contratto') }
  ].filter(tab => tab.show);

  // Se il tab attivo non è più disponibile, seleziona il primo disponibile
  useEffect(() => {
    if (selectedTemplate && !availableTabs.find(tab => tab.id === activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [selectedTemplate, availableTabs, activeTab]);

  // Handlers
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateContractHTML = (): string => {
    if (!selectedTemplate || !companyInfo) return "";

    let html = selectedTemplate.content;
    const term = selectedTemplate.terms_id ? terms[selectedTemplate.terms_id] : null;

    console.log("📄 TEMPLATE ORIGINALE:", html.substring(0, 200) + "...");

    // Pulisci eventuali {' '} dal template se presenti
    html = html.replace(/\{'\{/g, '{').replace(/\}'\}/g, '}');

    // Genera HTML per veicoli multipli
    const vehiclesHTML = vehicles.map(v => {
      const tariffItems = v.tariffs
        .filter(t => t.price && t.price !== "")
        .map(t => `
          <li>
            <strong>${t.type}:</strong> ${t.description} - €${t.price}
            ${t.valid_from ? ` (dal ${formatDate(t.valid_from)}` : ''}
            ${t.valid_to ? ` al ${formatDate(t.valid_to)})` : ''}
          </li>
        `).join('');

      return `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
          <h4 style="margin-top: 0; color: #4f8cff;">Veicolo: ${v.make} ${v.model}</h4>
          <p><strong>Targa:</strong> ${v.plate}</p>
          <p><strong>Anno:</strong> ${v.year || 'N/D'} - <strong>Colore:</strong> ${v.color || 'N/D'}</p>
          
          ${tariffItems ? `
            <p><strong>Tariffe applicate:</strong></p>
            <ul style="margin-top: 5px;">
              ${tariffItems}
            </ul>
          ` : '<p><em>Nessuna tariffa specificata</em></p>'}
        </div>
      `;
    }).join('');

    // Genera tabella riepilogo tariffe (solo se richiesto)
    const allTariffs = vehicles.flatMap(v => 
      v.tariffs
        .filter(t => t.price && t.price !== "")
        .map(t => ({
          ...t,
          vehicle: `${v.make} ${v.model} (${v.plate})`
        }))
    );

    const tariffsTable = (templateConfig.show_vehicle_tariffs && allTariffs.length > 0) ? `
      <h3>Riepilogo Tariffe</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #4f8cff; color: white;">
            <th style="padding: 10px; border: 1px solid #333;">Veicolo</th>
            <th style="padding: 10px; border: 1px solid #333;">Tipo</th>
            <th style="padding: 10px; border: 1px solid #333;">Descrizione</th>
            <th style="padding: 10px; border: 1px solid #333;">Prezzo</th>
            <th style="padding: 10px; border: 1px solid #333;">Validità</th>
           </tr>
        </thead>
        <tbody>
          ${allTariffs.map(t => `
             <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.vehicle}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.type}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.description}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">€${t.price}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                ${t.valid_from ? formatDate(t.valid_from) : ''} 
                ${t.valid_to ? ` - ${formatDate(t.valid_to)}` : ''}
              </td>
             </tr>
          `).join('')}
        </tbody>
       </table>
    ` : '';

    console.log("🚗 vehiclesHTML generato:", vehiclesHTML ? "OK" : "VUOTO");
    console.log("💰 tariffsTable generata:", tariffsTable ? "OK" : "VUOTA");
    console.log("📊 vehicles count:", vehicles.length);
    console.log("💰 tariffe totali:", allTariffs.length);

    const replacements: Record<string, string> = {
      // DATI AZIENDA
      '{{COMPANY_NAME}}': companyInfo.company_name || '',
      '{{COMPANY_LEGAL_ADDRESS}}': companyInfo.legal_address || '',
      '{{COMPANY_OPERATIONAL_ADDRESS}}': companyInfo.operational_address || companyInfo.legal_address || '',
      '{{COMPANY_VAT}}': companyInfo.vat_number || '',
      '{{COMPANY_TAXCODE}}': companyInfo.tax_code || '',
      '{{COMPANY_EMAIL}}': companyInfo.email || '',
      '{{COMPANY_PEC}}': companyInfo.pec || '',
      '{{COMPANY_PHONE}}': companyInfo.phone || '',
      '{{COMPANY_MOBILE}}': companyInfo.mobile || '',
      '{{COMPANY_FAX}}': companyInfo.fax || '',
      '{{COMPANY_WEBSITE}}': companyInfo.website || '',
      '{{COMPANY_LOGO}}': companyInfo.logo_url ? `<img src="${companyInfo.logo_url}" style="max-height: 60px;">` : '',
      '{{COMPANY_ADDRESS}}': companyInfo.legal_address || '',
      
      // DATI CONTRATTO
      '{{CONTRACT_TITLE}}': selectedTemplate.title || '',
      '{{CONTRACT_NUMBER}}': generatedContract?.contract_number || `CONTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      '{{CONTRACT_DATE}}': new Date().toLocaleDateString('it-IT'),
      '{{CONTRACT_DURATION}}': templateConfig.show_contract_duration ? (formData.duration_months || '') : '',
      '{{CONTRACT_AMOUNT}}': templateConfig.show_contract_price ? (formData.price || '') : '',
      '{{CONTRACT_TOTAL}}': templateConfig.show_contract_price && formData.duration_months && formData.price 
        ? (parseFloat(formData.duration_months) * parseFloat(formData.price)).toFixed(2) 
        : '',
      '{{PAYMENT_FREQUENCY}}': formData.payment_frequency || '',
      '{{RENEWAL_AUTOMATIC}}': formData.renewal_automatic ? 'Sì' : 'No',
      '{{NOTES}}': formData.notes || '',
      '{{GENERATION_DATE}}': new Date().toLocaleString('it-IT'),
      
      // DATI CLIENTE
      '{{CUSTOMER_FIRST_NAME}}': formData.first_name || '',
      '{{CUSTOMER_LAST_NAME}}': formData.last_name || '',
      '{{CUSTOMER_FULLNAME}}': `${formData.first_name} ${formData.last_name}`.trim(),
      '{{CUSTOMER_FISCAL_CODE}}': formData.fiscal_code || '',
      '{{CUSTOMER_FISCALCODE}}': formData.fiscal_code || '',
      '{{CUSTOMER_BIRTH_DATE}}': formatDate(formData.birth_date),
      '{{CUSTOMER_BIRTH_PLACE}}': formData.birth_place || '',
      '{{CUSTOMER_BIRTH_PROVINCE}}': formData.birth_province || '',
      '{{CUSTOMER_ADDRESS}}': formData.address || '',
      '{{CUSTOMER_CITY}}': formData.city || '',
      '{{CUSTOMER_POSTAL_CODE}}': formData.postal_code || '',
      '{{CUSTOMER_PROVINCE}}': formData.province || '',
      '{{CUSTOMER_EMAIL}}': formData.email || '',
      '{{CUSTOMER_PHONE}}': formData.phone || '',
      
      // DOCUMENTO
      '{{CUSTOMER_DOCUMENT_TYPE}}': formData.document_type || '',
      '{{CUSTOMER_DOCUMENT_NUMBER}}': formData.document_number || '',
      '{{CUSTOMER_DOCUMENT_ISSUE_DATE}}': formatDate(formData.document_issue_date),
      '{{CUSTOMER_DOCUMENT_EXPIRY_DATE}}': formatDate(formData.document_expiry_date),
      '{{CUSTOMER_DOCUMENT_ISSUING_AUTHORITY}}': formData.document_issuing_authority || '',
      
      // VECCHI PLACEHOLDER (per compatibilità)
      '{{VEHICLE_PLATE}}': vehicles[0]?.plate || formData.vehicle_plate || '',
      '{{VEHICLE_MAKE}}': vehicles[0]?.make || formData.vehicle_make || '',
      '{{VEHICLE_MODEL}}': vehicles[0]?.model || formData.vehicle_model || '',
      
      // NUOVI PLACEHOLDER per veicoli multipli
      '{{VEHICLES_LIST}}': vehiclesHTML || '<p>Nessun veicolo registrato</p>',
      '{{VEHICLES_COUNT}}': vehicles.length.toString(),
      '{{TARIFFS_TABLE}}': tariffsTable,
      '{{TOTAL_TARIFFS}}': allTariffs.length.toString(),
      
      // TERMINI
      '{{CONTRACT_TERMS}}': term?.content || '',
      '{{TERMS}}': term?.content || '',
    };

    console.log("🔄 Placeholder disponibili per sostituzione:", Object.keys(replacements).length);
    
    // Conta quante sostituzioni vengono fatte
    let sostituzioniEseguite = 0;
    const sostituzioniTrovate: string[] = [];
    
    Object.entries(replacements).forEach(([key, value]) => {
      if (html.includes(key)) {
        sostituzioniEseguite++;
        sostituzioniTrovate.push(key);
        console.log(`✅ Trovato placeholder: ${key}`);
      }
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      html = html.replace(regex, value);
    });

    console.log("🔑 Placeholder trovati nel template:", sostituzioniTrovate);
    console.log(`📊 Sostituzioni eseguite: ${sostituzioniEseguite} su ${Object.keys(replacements).length} disponibili`);

    return html;
  };

  // Handle generazione contratto
  const handleGenerateContract = async () => {
    if (!selectedTemplate || !companyInfo || !tenantId) return;
    
    setLoading(true);
    
    try {
      const contractHTML = generateContractHTML();
      
      // Genera numero contratto
      const now = new Date();
      const contractNumber = `CONTR-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;

      // ============================================
      // GESTIONE VEICOLI MULTIPLI E TARIFFE (VERSIONE CORRETTA)
      // ============================================
      const vehicleIds: string[] = [];
      const vehicleProfiles: any[] = [];

      for (const vehicle of vehicles) {
        if (!vehicle.plate) continue; // Salta veicoli senza targa
        
        const plate = vehicle.plate.toUpperCase().trim();
        console.log(`🚗 Elaborazione veicolo: ${plate}`);
        
        try {
          // 1️⃣ CERCA O CREA PROFILO VEICOLO
          let vehicleProfileId = null;
          
          const { data: existingProfile } = await supabase
            .from('vehicle_profiles')
            .select('id, brand_id, model_id, color_id, category_id')
            .eq('tenant_id', tenantId)
            .eq('plate', plate)
            .maybeSingle();

          if (existingProfile) {
            console.log(`✅ Veicolo esistente trovato con ID: ${existingProfile.id}`);
            vehicleProfileId = existingProfile.id;
            
            // Aggiorna eventuali campi mancanti
            const updates: any = {};
            if (vehicle.brand_id && !existingProfile.brand_id) updates.brand_id = vehicle.brand_id;
            if (vehicle.model_id && !existingProfile.model_id) updates.model_id = vehicle.model_id;
            if (vehicle.color_id && !existingProfile.color_id) updates.color_id = vehicle.color_id;
            if (vehicle.category_id && !existingProfile.category_id) updates.category_id = vehicle.category_id;
            
            if (Object.keys(updates).length > 0) {
              // ⭐ AGGIUNGI updated_at ALL'AGGIORNAMENTO (vehicle_profiles HA questa colonna)
              const { error: updateError } = await supabase
                .from('vehicle_profiles')
                .update({
                  ...updates,
                  updated_at: new Date().toISOString()
                })
                .eq('id', vehicleProfileId);
              
              if (updateError) {
                console.error(`❌ Errore aggiornamento veicolo ${plate}:`, updateError);
              } else {
                console.log(`✅ Veicolo ${plate} aggiornato con successo`);
              }
            }
          } else {
            console.log(`🆕 Creazione nuovo profilo veicolo per targa: ${plate}`);
            
            // ⭐ INSERIMENTO CON updated_at (vehicle_profiles HA questa colonna)
            const { data: newProfile, error: profileError } = await supabase
              .from('vehicle_profiles')
              .insert({
                tenant_id: tenantId,
                plate: plate,
                brand_id: vehicle.brand_id || null,
                model_id: vehicle.model_id || null,
                color_id: vehicle.color_id || null,
                category_id: vehicle.category_id || null,
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (profileError) {
              console.error(`❌ Errore inserimento veicolo ${plate}:`, profileError);
              throw profileError;
            }
            
            vehicleProfileId = newProfile.id;
            console.log(`✅ Nuovo veicolo creato con ID: ${vehicleProfileId}`);
          }

          vehicleIds.push(vehicleProfileId);
          vehicleProfiles.push({
            ...vehicle,
            profile_id: vehicleProfileId
          });
          
        } catch (err) {
          console.error(`❌ Errore nella gestione del veicolo ${plate}:`, err);
          throw err;
        }
      }

      console.log(`✅ Totale veicoli processati: ${vehicleIds.length}`);

      // Creazione cliente
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
          notes: `Veicoli: ${vehicles.map(v => v.plate).filter(Boolean).join(', ') || 'N/D'}`,
          is_active: true
        })
        .select()
        .single();

      if (customerError) {
        console.error("❌ Errore creazione cliente:", customerError);
        throw customerError;
      }

      // ⭐ ASSOCIAZIONE VEICOLI AL CLIENTE - SENZA updated_at (customer_vehicles NON ha questa colonna!)
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        if (!vehicle.plate) continue;
        
        const plate = vehicle.plate.toUpperCase().trim();
        
        // ⭐ ASSOCIAZIONE PULITA - SENZA updated_at
        const { error: customerVehicleError } = await supabase
          .from('customer_vehicles')
          .insert({
            tenant_id: tenantId,
            customer_id: customer.id,
            plate: plate,
            is_active: true,
            created_at: new Date().toISOString()
            // ⭐ NESSUN UPDATED_AT - la tabella customer_vehicles NON ha questa colonna!
          });

        if (customerVehicleError) {
          console.error(`❌ Errore associazione veicolo ${plate} al cliente:`, customerVehicleError);
        } else {
          console.log(`🔗 Veicolo ${plate} associato al cliente (tramite targa)`);
        }

        // Salva le tariffe per questo veicolo (solo se richiesto dal template)
        if (templateConfig.show_vehicle_tariffs) {
          const vehicleProfileId = vehicleIds[i];
          
          for (const tariff of vehicle.tariffs) {
            if (!tariff.price) continue; // Salta tariffe senza prezzo
            
            const tariffData = {
              tenant_id: tenantId,
              vehicle_profile_id: vehicleProfileId,
              type: tariff.type,
              description: tariff.description || '',
              price: parseFloat(tariff.price),
              valid_from: tariff.valid_from || null,
              valid_to: tariff.valid_to || null,
              is_active: true
            };

            const { error: tariffError } = await supabase
              .from('vehicle_tariffs')
              .insert(tariffData);

            if (tariffError) {
              console.error(`❌ Errore salvataggio tariffa:`, tariffError);
            } else {
              console.log(`💰 Tariffa salvata: ${tariff.type} - €${tariff.price}`);
            }
          }
        }
      }

      // Creazione contratto
      const validFrom = new Date().toISOString().split('T')[0];
      const validTo = formData.duration_months 
        ? new Date(Date.now() + parseInt(formData.duration_months) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;

      // Prendi il primo veicolo per i dati (se presente)
      const primoVeicolo = vehicles.find(v => v.plate);

      // Salva l'HTML generato nel contratto
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
          price: formData.price ? parseFloat(formData.price) : null,
          notes: formData.notes || null,
          generated_html: contractHTML,
          generated_pdf_url: `contratto-${contractNumber}.pdf`,
          
          // NUOVI CAMPI PER IL VEICOLO
          vehicle_plate: primoVeicolo?.plate || null,
          vehicle_brand: primoVeicolo?.make || null,
          vehicle_model: primoVeicolo?.model || null,
          vehicle_color: primoVeicolo?.color || null,
          vehicle_category_id: primoVeicolo?.category_id || null
        })
        .select()
        .single();

      if (contractError) {
        console.error("❌ Errore creazione contratto:", contractError);
        throw contractError;
      }

      console.log("✅ Contratto salvato con HTML di lunghezza:", contractHTML.length);
      console.log("✅ Dati veicolo salvati:", {
        plate: primoVeicolo?.plate,
        brand: primoVeicolo?.make,
        model: primoVeicolo?.model,
        color: primoVeicolo?.color,
        category_id: primoVeicolo?.category_id
      });

      // ⭐ CREAZIONE SUBSCRIPTION PER ABBONAMENTI
      let newSubscription = null;
      if (selectedType === 'subscription') {
        console.log("📅 Creazione subscription per abbonamento...");
        
        const { data, error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert({
            tenant_id: tenantId,
            customer_id: customer.id,
            contract_id: newContract.id,
            subscription_type: formData.duration_months && parseInt(formData.duration_months) >= 12 ? 'annual' : 'monthly',
            start_date: validFrom,
            end_date: validTo,
            price: formData.price ? parseFloat(formData.price) : null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error("❌ Errore creazione subscription:", subscriptionError);
        } else {
          console.log("✅ Subscription creata con ID:", data.id);
          newSubscription = data;
        }
      }

      // ⭐ CREAZIONE FEDELTÀ PER CONTRATTI FEDELTÀ LAVAGGIO
      let newFidelity = null;
      if (selectedType === 'wash_fidelity') {
        console.log("🎁 Creazione programma fedeltà...");
        
        try {
          // Trova un programma fedeltà attivo
          const { data: program } = await supabase
            .from('fidelity_programs')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          // Inserisci in customer_fidelity
          const fidelityData = {
            tenant_id: tenantId,
            customer_id: customer.id,
            fidelity_program_id: program?.id || null,
            current_count: 0,
            reward_available: false,
            updated_at: new Date().toISOString()
          };
          
          console.log("📦 Dati fedeltà da inserire:", fidelityData);
          
          const { data, error: fidelityError } = await supabase
            .from("customer_fidelity")
            .insert(fidelityData)
            .select()
            .single();

          if (fidelityError) {
            console.error("❌ Errore creazione fedeltà:", fidelityError);
          } else {
            console.log("✅ Fedeltà creata con ID:", data.id);
            newFidelity = data;
            
            // Se ci sono più veicoli, associali anche a vehicle_fidelity
            for (let i = 0; i < vehicles.length; i++) {
              const vehicle = vehicles[i];
              if (!vehicle.plate) continue;
              
              const vehicleProfileId = vehicleIds[i];
              
              await supabase
                .from('vehicle_fidelity')
                .insert({
                  tenant_id: tenantId,
                  vehicle_id: vehicleProfileId,
                  fidelity_id: data.id,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
              
              console.log(`🎁 Veicolo ${vehicle.plate} associato al programma fedeltà`);
            }
          }
        } catch (err) {
          console.error("❌ Eccezione creazione fedeltà:", err);
        }
      }

      // ⭐ COLLEGA I VEICOLI AL CONTRATTO
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        if (!vehicle.plate) continue;
        
        const vehicleProfileId = vehicleIds[i];
        
        await supabase
          .from('contract_vehicles')
          .insert({
            contract_id: newContract.id,
            vehicle_id: vehicleProfileId,
            subscription_id: newSubscription?.id || null,
            fidelity_id: newFidelity?.id || null,
            created_at: new Date().toISOString()
          });

        console.log(`🔗 Veicolo ${vehicle.plate} collegato al contratto (ID profilo: ${vehicleProfileId})`);
      }

      setGeneratedContract(newContract);
      
      // Generazione PDF
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
      alert("Errore durante la generazione del contratto");
    } finally {
      setLoading(false);
    }
  };

  // Handle stampa
  const handlePrint = () => {
    if (!selectedTemplate || !companyInfo) return;
    printHTML(generateContractHTML());
  };

  // Handle download PDF
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

  // Render step 1
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
          >
            <div style={{ color: type.colore, marginBottom: "15px" }}>{type.icon}</div>
            <h3 style={{ color: "#fff", marginBottom: "10px" }}>{type.nome}</h3>
            <p style={{ color: "#9ca3af", fontSize: "13px" }}>{type.descrizione}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // Render step 2
  const renderStep2 = () => (
    <div>
      <h2 style={{ marginBottom: "20px", color: BLUE }}>Scegli il modello di contratto</h2>
      
      {templatesLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
          Caricamento modelli...
        </div>
      ) : templates.length === 0 ? (
        <div style={{ background: BG_DARK, padding: "40px", borderRadius: "12px", textAlign: "center", color: "#9ca3af" }}>
          Nessun modello attivo per questo tipo di contratto.
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
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ color: "#fff", marginBottom: "5px" }}>{template.name}</h3>
                  <p style={{ color: "#9ca3af", fontSize: "13px" }}>{template.title}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {template.default_duration_months && (
                    <div style={{ color: BLUE, fontSize: "14px" }}>
                      📅 {template.default_duration_months} mesi
                    </div>
                  )}
                  {template.default_price && (
                    <div style={{ color: BLUE, fontSize: "14px" }}>
                      💰 € {template.default_price}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render step 3
  const renderStep3 = () => (
    <div>
      <h2 style={{ marginBottom: "20px", color: BLUE }}>Dati del contratto</h2>
      
      <div style={{ display: "flex", gap: "5px", marginBottom: "20px", borderBottom: "1px solid #333", flexWrap: "wrap" }}>
        {availableTabs.map(tab => (
          <TabButton 
            key={tab.id}
            label={tab.label} 
            active={activeTab === tab.id} 
            onClick={() => setActiveTab(tab.id)} 
          />
        ))}
      </div>
      
      <div style={{ background: BG_DARK, padding: "20px", borderRadius: "10px" }}>
        {activeTab === 'anagrafica' && (
          <AnagraficaTab 
            formData={formData} 
            onInputChange={handleInputChange}
            requiredFields={templateConfig.required_fields?.customer || []}
            showAllFields={templateConfig.type === 'subscription'}
          />
        )}
        {activeTab === 'residenza' && (
          <ResidenzaTab 
            formData={formData} 
            onInputChange={handleInputChange}
            requiredFields={templateConfig.required_fields?.customer || []}
          />
        )}
        {activeTab === 'documento' && (
          <DocumentoTab 
            formData={formData} 
            onInputChange={handleInputChange}
            showAllFields={templateConfig.type === 'subscription'}
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
            showTariffs={templateConfig.show_vehicle_tariffs}
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
            showDuration={templateConfig.show_contract_duration}
            showPrice={templateConfig.show_contract_price}
          />
        )}
      </div>
    </div>
  );

  // Render step 4
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
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}>
            <strong>Cliente:</strong> {formData.first_name} {formData.last_name}
          </p>
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}>
            <strong>Veicoli:</strong> {vehicles.filter(v => v.plate).map(v => v.plate).join(', ') || 'Nessuno'}
          </p>
          <p style={{ color: "#9ca3af", marginBottom: "5px" }}>
            <strong>Durata:</strong> {formData.duration_months || 0} mesi
          </p>
          <p style={{ color: "#9ca3af" }}>
            <strong>Importo:</strong> € {formData.price || 0}
          </p>
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
          
          <button onClick={() => navigate(-1)} style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid #333", color: "#fff", borderRadius: "6px", cursor: "pointer" }}>
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
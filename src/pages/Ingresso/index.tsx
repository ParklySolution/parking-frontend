// src/pages/ingresso/index.tsx

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";

import "@/styles/ingresso.css";

import ClientRecognitionBar from "@/components/ingress/ClientRecognitionBar";
import { lookupCustomerByPlate } from "@/services/customerLookupService";
import type { CustomerLookupResult } from "@/services/customerLookupService";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { fetchVehicleProfileByPlate } from "@/services/vehicleProfileService";
import type { VehicleProfileByPlate } from "@/types/vehicleProfile";
import type { WashServiceSelection, WashServicePriceUI } from "@/types/vehicleProfile";

import {
  searchVehicleModels,
  type VehicleModelSearchResult,
} from "@/services/vehicleModelSearch";

// NUOVI IMPORT (dopo la refactor)
import { getAvailableWashServices } from "@/services/washService";
import { calculatePriceWithWashBonus, calculateBaseTariff, getTariffaCompleta } from "@/services/pricing/pricingEngine";
import { getTariffaBase } from "@/services/pricingService";

import { createParkingSessionVehicleSnapshot } from "@/services/parkingSessionVehicleService";

import {
  createParkingSessionEntry,
  createParkingSessionWithWash,
} from "@/services/parkingSessionService";

// 📦 Servizio di stampa ticket
import { printTicket } from "@/services/ticketPrintService";

// 📦 Import icone professionali
import { 
  FaCar, 
  FaCarSide, 
  FaMoneyBillWave, 
  FaTag, 
  FaTimes, 
  FaPrint,
  FaSoap,
  FaFileContract,
  FaClock,
  FaUser,
  FaIdCard,
  FaCalendarAlt,
  FaCheckCircle,
  FaShoppingCart,
  FaPalette,
  FaChevronDown,
  FaParking,
  FaGift
} from "react-icons/fa";

// ⭐ Colori disponibili per il selettore
const AVAILABLE_COLORS = [
  { name: "Bianco", code: "#FFFFFF", textColor: "#000" },
  { name: "Nero", code: "#000000", textColor: "#fff" },
  { name: "Grigio", code: "#808080", textColor: "#fff" },
  { name: "Argento", code: "#C0C0C0", textColor: "#000" },
  { name: "Blu", code: "#0000FF", textColor: "#fff" },
  { name: "Blu Scuro", code: "#00008B", textColor: "#fff" },
  { name: "Rosso", code: "#FF0000", textColor: "#fff" },
  { name: "Verde", code: "#008000", textColor: "#fff" },
  { name: "Giallo", code: "#FFFF00", textColor: "#000" },
  { name: "Arancione", code: "#FFA500", textColor: "#000" },
  { name: "Marrone", code: "#8B4513", textColor: "#fff" },
  { name: "Beige", code: "#F5F5DC", textColor: "#000" },
];

function nowLabel() {
  const d = new Date();
  return {
    time: d.toLocaleTimeString("it-IT"),
    date: d.toLocaleDateString("it-IT"),
  };
}

export default function Ingresso() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🔑 TENANT ID DINAMICO
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  // 🔑 TARGA
  const initialPlate = location.state?.plate ?? "";
  const [plate, setPlate] = useState(initialPlate);
  const plateDebounced = useDebouncedValue(plate, 450);

  const plateUpper = useMemo(
    () => plate.replace(/\s+/g, "").toUpperCase(),
    [plate]
  );

  // 👤 CLIENTE
  const [lookup, setLookup] = useState<CustomerLookupResult>({
    status: "idle",
  });

  // 🚗 PROFILO VEICOLO ESISTENTE
  const [vehicleProfile, setVehicleProfile] = useState<VehicleProfileByPlate | null>(null);

  // 🆕 AUTOCOMPLETE MODELLO
  const [modelInput, setModelInput] = useState("");
  const [modelResults, setModelResults] = useState<VehicleModelSearchResult[]>([]);
  const [selectedModel, setSelectedModel] = useState<VehicleModelSearchResult | null>(null);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  // 🎨 SELEZIONE COLORE
  const [selectedColor, setSelectedColor] = useState<{ name: string; code: string; textColor: string } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // 💰 TARIFFA BASE
  const [tariff, setTariff] = useState<number | null>(null);

  // 🧼 AUTOLAVAGGIO
  const [washServices, setWashServices] = useState<WashServiceSelection[]>([]);
  const [availableWashServices, setAvailableWashServices] = useState<WashServicePriceUI[]>([]);
  const [washTotal, setWashTotal] = useState<number>(0);
  const [combinedTotal, setCombinedTotal] = useState<number>(0);
  const [washBonus, setWashBonus] = useState<{
    hasBonus: boolean;
    bonusHours: number;
    bonusDiscount: number;
  }>({ hasBonus: false, bonusHours: 0, bonusDiscount: 0 });

  // 🎟️ TICKET CREATO
  const [createdTicket, setCreatedTicket] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  // 📜 CONVENZIONI
  const [availableConventions, setAvailableConventions] = useState<any[]>([]);
  const [selectedConventionId, setSelectedConventionId] = useState<string | null>(null);
  const [selectedConvention, setSelectedConvention] = useState<any | null>(null);

  // 📝 NOTE
  const [notes, setNotes] = useState("");

  // 🕒 CLOCK - FISSO AL MOMENTO DEL CARICAMENTO
  const [entryTime] = useState(() => nowLabel());

  /* ===============================
     RECUPERA TENANT ID
     =============================== */
  useEffect(() => {
    async function loadTenant() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Sessione recuperata:', session?.user?.email);
        
        if (!session) {
          console.error('❌ Nessuna sessione attiva');
          setLoadingTenant(false);
          return;
        }

        let id = session?.user?.user_metadata?.tenant_id ||
                session?.user?.app_metadata?.tenant_id ||
                null;

        if (!id && session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();
          id = profile?.tenant_id || null;
        }
        
        console.log('🏢 Tenant ID finale:', id);
        setTenantId(id);
      } catch (err) {
        console.error('❌ Errore recupero tenant ID:', err);
      } finally {
        setLoadingTenant(false);
      }
    }
    
    loadTenant();
  }, []);

  /* ===============================
     TUTTI GLI ALTRI useEffect
     =============================== */
  useEffect(() => {
    let active = true;

    const run = async () => {
      const clean = plateDebounced.replace(/\s+/g, "").toUpperCase();
      if (clean.length < 5 || !tenantId) {
        setLookup({ status: "idle" });
        return;
      }

      setLookup({ status: "loading" });
      const res = await lookupCustomerByPlate(clean);
      if (!active) return;
      setLookup(res);
    };

    run();
    return () => {
      active = false;
    };
  }, [plateDebounced, tenantId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (plateUpper.length < 5 || !tenantId) {
        setVehicleProfile(null);
        return;
      }

      const profile = await fetchVehicleProfileByPlate(
        plateUpper,
        tenantId
      );

      if (!active) return;

      setVehicleProfile(profile);

      if (profile) {
        setSelectedModel(null);
        setModelInput("");
        setModelResults([]);
        setShowModelSuggestions(false);
        
        // ⭐ Se il profilo ha un colore, selezionalo automaticamente
        if (profile.color) {
          const color = AVAILABLE_COLORS.find(c => c.name === profile.color?.name);
          if (color) setSelectedColor(color);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [plateUpper, tenantId]);

  // ⭐ Focus automatico sul campo modello dopo targa valida
  useEffect(() => {
    if (plateUpper.length >= 5) {
      setTimeout(() => {
        const modelInput = document.querySelector<HTMLInputElement>('input[placeholder="Inizia a digitare..."]');
        if (modelInput) modelInput.focus();
      }, 100);
    }
  }, [plateUpper]);

  // ⭐ Auto-selezione modello se esiste profilo veicolo
  useEffect(() => {
    if (vehicleProfile && vehicleProfile.model?.name) {
      setModelInput(vehicleProfile.model.name);
      setSelectedModel({
        model_id: vehicleProfile.model.id,
        model_name: vehicleProfile.model.name,
        brand_id: vehicleProfile.brand?.id || '',
        brand_name: vehicleProfile.brand?.name || '',
        category_id: vehicleProfile.category?.id || '',
        category_name: vehicleProfile.category?.name || ''
      });
      setShowModelSuggestions(false);
    }
  }, [vehicleProfile]);

  // ⭐ Shortcut INVIO per stampare (solo parcheggio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !createdTicket) {
        if (plateUpper.length >= 5 && (vehicleProfile || selectedModel)) {
          handlePrintParkingTicket();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plateUpper, vehicleProfile, selectedModel, createdTicket]);

  // ⭐ Auto-return dopo stampa ticket
  useEffect(() => {
    if (createdTicket !== null) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        resetForm();
      }, 1000);
    }
  }, [createdTicket]);

  // ⭐ useEffect per la ricerca dei modelli
  useEffect(() => {
    if (vehicleProfile || selectedModel || !tenantId) {
      setModelResults([]);
      setShowModelSuggestions(false);
      return;
    }
    
    if (modelInput.length < 2) {
      setModelResults([]);
      setShowModelSuggestions(false);
      return;
    }

    const run = async () => {
      const res = await searchVehicleModels(
        modelInput,
        tenantId,
        10
      );
      setModelResults(res);
      setShowModelSuggestions(res.length > 0);
    };

    run();
  }, [modelInput, vehicleProfile, tenantId, selectedModel]);

  useEffect(() => {
    let active = true;

    const categoryId =
      vehicleProfile?.category?.id ?? selectedModel?.category_id;

    if (!categoryId || !tenantId) {
      setTariff(null);
      return;
    }

    const run = async () => {
      const tariffInfo = await calculateBaseTariff(
        tenantId,
        categoryId
      );

      if (!active) return;
      
      if (tariffInfo?.firstHour) {
        setTariff(tariffInfo.firstHour);
      } else if (tariffInfo?.hourly) {
        setTariff(tariffInfo.hourly);
      } else {
        setTariff(null);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [vehicleProfile, selectedModel, tenantId]);

  useEffect(() => {
    const loadWashServices = async () => {
      const categoryId = vehicleProfile?.category?.id ?? selectedModel?.category_id;
      
      console.log("🔍 Caricamento servizi per categoria:", {
        categoryId,
        categoryName: vehicleProfile?.category?.name || selectedModel?.category_name,
        tenantId
      });
      
      if (!categoryId || !tenantId) {
        setAvailableWashServices([]);
        return;
      }

      try {
        const services = await getAvailableWashServices(tenantId, categoryId);
        console.log("✅ Servizi trovati:", services);
        setAvailableWashServices(services);
      } catch (error) {
        console.error("Errore caricamento servizi lavaggio:", error);
        setAvailableWashServices([]);
      }
    };

    loadWashServices();
  }, [vehicleProfile, selectedModel, tenantId]);

  useEffect(() => {
    const loadConventions = async () => {
      console.log("🔍 Caricamento convenzioni per tenant:", tenantId);
      if (!tenantId) return;
      
      const { data, error } = await supabase
        .from('conventions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error("❌ Errore caricamento convenzioni:", error);
      } else {
        console.log("✅ Convenzioni trovate:", data);
        setAvailableConventions(data || []);
      }
    };
    
    loadConventions();
  }, [tenantId]);

  // ⭐ useEffect per monitorare washServices
  useEffect(() => {
    console.log("🔄 washServices AGGIORNATO:", washServices);
    console.log("🔄 washServices length:", washServices.length);
  }, [washServices]);

  useEffect(() => {
    const calculateTotal = async () => {
      const categoryId = vehicleProfile?.category?.id ?? selectedModel?.category_id;
      
      if (!categoryId || tariff === null || !tenantId) {
        setWashTotal(0);
        setCombinedTotal(0);
        setWashBonus({ hasBonus: false, bonusHours: 0, bonusDiscount: 0 });
        return;
      }

      try {
        const result = await calculatePriceWithWashBonus(
          tenantId,
          categoryId,
          0,
          washServices
        );

        setWashTotal(result.washTotal);
        setCombinedTotal(result.totalAmount);
        setWashBonus({
          hasBonus: result.calculationBreakdown?.washBonusApplied || false,
          bonusHours: result.bonusHours || 0,
          bonusDiscount: result.bonusDiscount || 0,
        });
      } catch (error) {
        console.error("Errore calcolo totale con lavaggio:", error);
        setWashTotal(0);
        setCombinedTotal(tariff || 0);
        setWashBonus({ hasBonus: false, bonusHours: 0, bonusDiscount: 0 });
      }
    };

    calculateTotal();
  }, [tariff, vehicleProfile, selectedModel, washServices, tenantId]);

  function handleConventionChange(conventionId: string) {
    setSelectedConventionId(conventionId || null);
    const convention = availableConventions.find(c => c.id === conventionId);
    setSelectedConvention(convention || null);
    
    if (convention) {
      console.log("Convenzione selezionata:", convention);
    }
  }

  const handlePrintParkingTicket = async () => {
    const categoryId = vehicleProfile?.category?.id ?? selectedModel?.category_id;
    
    if (!categoryId || tariff === null || !tenantId) {
      alert("Dati veicolo incompleti");
      return;
    }

    try {
      // ⭐ LOG 1: Stiamo per recuperare le tariffe
      console.log("🔍 RECUPERO TARIFFE per categoria:", categoryId);
      console.log("📋 tenantId:", tenantId);
      
      // ⭐ RECUPERA LE TARIFFE COMPLETE
      const tariffaCompleta = await getTariffaCompleta(tenantId, categoryId);
      
      // ⭐ LOG 2: Cosa abbiamo ricevuto dal database
      console.log("🎯 tariffaCompleta RICEVUTA DAL DB:", tariffaCompleta);
      
      // ⭐ LOG 3: Valori specifici che ci interessano
      console.log("💰 DETTAGLIO TARIFFE:", {
        firstHour: tariffaCompleta?.firstHour,
        nextHours: tariffaCompleta?.nextHours,
        hourly: tariffaCompleta?.hourly,
        maxDaily: tariffaCompleta?.maxDaily,
        nightTariff: tariffaCompleta?.nightTariff,
        overnightFixed: tariffaCompleta?.overnightFixed
      });

      const brandName = vehicleProfile?.brand?.name ?? selectedModel?.brand_name ?? "";
      const modelName = vehicleProfile?.model?.name ?? selectedModel?.model_name ?? "";
      const categoryName = vehicleProfile?.category?.name ?? selectedModel?.category_name ?? "";
      const color = selectedColor?.name ?? vehicleProfile?.color?.name ?? null;
      const vehicleProfileId = vehicleProfile?.id ?? null;

      // 🆕 NUOVA CHIAMATA CON createParkingSessionEntry
      const result = await createParkingSessionEntry({
        tenantId,
        categoryId,
        plate: plateUpper,
        brandName: vehicleProfile?.brand?.name ?? selectedModel?.brand_name ?? null,
        modelName: vehicleProfile?.model?.name ?? selectedModel?.model_name ?? null,
        categoryName: vehicleProfile?.category?.name ?? selectedModel?.category_name ?? null,
        color: selectedColor?.name ?? vehicleProfile?.color?.name ?? null,
        customerId: lookup.status === "found" ? lookup.customer.id : null,
        subscriptionId: lookup.subscription?.id ?? null,
        conventionId: selectedConventionId,
        priceListId: null,
        vehicleProfileId: vehicleProfile?.id ?? null,
        washServices: [], // Nessun lavaggio per il parcheggio semplice
        calculatedAmount: tariff || 0,
        notes: notes || null
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      await createParkingSessionVehicleSnapshot({
        parkingSessionId: result.session!.id,
        plate: plateUpper,
        brandName,
        modelName,
        categoryName,
        tariff: tariff || 0,
        color,
        vehicleProfileId,
      });

      setCreatedTicket(result.session!.ticket_number);
      
      // Recupera dati azienda
      const { data: companyData } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // ⭐ LOG 4: Prepariamo i dati da inviare a printTicket
      const tariffInfoToSend = tariffaCompleta ? {
        firstHour: tariffaCompleta.firstHour,
        hourly: tariffaCompleta.hourly,
        nextHours: tariffaCompleta.nextHours,
        maxDaily: tariffaCompleta.maxDaily,
        nightTariff: tariffaCompleta.nightTariff,
        overnightFixed: tariffaCompleta.overnightFixed
      } : {
        firstHour: tariff,
        hourly: tariff,
      };
      
      console.log("📦 tariffInfo INVIATO A PRINTTICKET:", tariffInfoToSend);

      // 🖨️ STAMPA IL TICKET PARCHEGGIO CON TARIFFE COMPLETE
      await printTicket({
        ticketNumber: result.session!.ticket_number,
        plate: plateUpper,
        entryTime: new Date(),
        brand: brandName,
        model: modelName,
        category: categoryName,
        company: {
          company_name: companyData?.company_name,
          legal_address: companyData?.legal_address,
          phone: companyData?.phone,
          email: companyData?.email,
          website: companyData?.website,
          vat_number: companyData?.vat_number
        },
        tariffInfo: tariffInfoToSend,
        qrData: JSON.stringify({
          ticket: result.session!.ticket_number,
          plate: plateUpper,
          sessionId: result.session!.id,
          type: 'parking'
        }),
        notes: notes ? [notes] : undefined
      });

      console.log("✅ Ticket parcheggio stampato con successo");

    } catch (err) {
      console.error("❌ Errore durante la creazione del ticket:", err);
      alert("Errore durante la creazione del ticket");
    }
  };

  const handlePrintWashTicket = async () => {
    console.log("🚨 handlePrintWashTicket chiamato");
    console.log("🚨 washServices corrente:", washServices);
    console.log("🚨 washServices length:", washServices.length);
    console.log("🚨 washServices IDs:", washServices.map(ws => ws.washServiceId));
    
    const categoryId = vehicleProfile?.category?.id ?? selectedModel?.category_id;
    
    if (!categoryId || tariff === null || !tenantId) {
      alert("Dati veicolo incompleti");
      return;
    }

    if (washServices.length === 0) {
      alert("Seleziona almeno un servizio lavaggio");
      return;
    }

    try {
      // ⭐ RECUPERA LE TARIFFE COMPLETE (per riferimento)
      const tariffaCompleta = await getTariffaCompleta(tenantId, categoryId);
      console.log("💰 Tariffe complete per ticket lavaggio:", tariffaCompleta);

      const brandName = vehicleProfile?.brand?.name ?? selectedModel?.brand_name ?? "";
      const modelName = vehicleProfile?.model?.name ?? selectedModel?.model_name ?? "";
      const categoryName = vehicleProfile?.category?.name ?? selectedModel?.category_name ?? "";
      const color = selectedColor?.name ?? vehicleProfile?.color?.name ?? null;
      const vehicleProfileId = vehicleProfile?.id ?? null;

      // 🔍 LOG 1: Verifica washServices
      console.log("🧼 washServices RAW:", washServices);
      console.log("🧼 washServices length:", washServices.length);
      console.log("🧼 availableWashServices:", availableWashServices);

      // Prepara lista servizi lavaggio con dettagli
      const washServicesDetails = washServices.map(ws => {
        const service = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
        console.log(`🔍 Cerca servizio con ID: ${ws.washServiceId}`, service);
        return {
          name: service?.serviceName || "Servizio",
          price: service?.price || 0,
          duration: service?.durationMinutes || 0,
          points: service?.fidelityPoints || 0
        };
      });

      console.log("📊 washServicesDetails:", washServicesDetails);

      // 🔍 LOG 2: Verifica parametri prima della chiamata
      console.log("🚿 Parametri per createParkingSessionWithWash:", {
        tenantId,
        categoryId,
        customerId: lookup.status === "found" ? lookup.customer.id : null,
        subscriptionId: lookup.subscription?.id ?? null,
        conventionId: selectedConventionId,
        washServices: washServices.map(ws => ws.washServiceId), // ✅ CORRETTO
        plate: plateUpper,
        brandName,
        modelName,
        categoryName,
        color,
        vehicleProfileId,
        calculatedAmount: combinedTotal,
        notes: notes || undefined,
      });

      const result = await createParkingSessionWithWash({
        tenantId,
        categoryId,
        customerId: lookup.status === "found" ? lookup.customer.id : null,
        subscriptionId: lookup.subscription?.id ?? null,
        conventionId: selectedConventionId,
        washServices,
        plate: plateUpper,
        brandName,
        modelName,
        categoryName,
        color,
        vehicleProfileId,
        calculatedAmount: combinedTotal,
        notes: notes || undefined,
      });

      // 🔍 LOG 3: Verifica risultato
      console.log("✅ Risultato createParkingSessionWithWash:", result);
      console.log("🧼 washServices nel risultato:", result.washServices);
      console.log("🎁 bonusApplied:", result.bonusApplied);
      console.log("⏱️ bonusHours:", result.bonusHours);

      setCreatedTicket(result.session.ticket_number);
      
      // Recupera dati azienda
      const { data: companyData } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // 🖨️ STAMPA IL TICKET LAVAGGIO
      await printTicket({
        ticketNumber: result.session.ticket_number,
        plate: plateUpper,
        entryTime: new Date(),
        brand: brandName,
        model: modelName,
        category: categoryName,
        company: {
          company_name: companyData?.company_name,
          legal_address: companyData?.legal_address,
          phone: companyData?.phone,
          email: companyData?.email,
          website: companyData?.website,
          vat_number: companyData?.vat_number
        },
        tariffInfo: tariffaCompleta ? {
          firstHour: tariffaCompleta.firstHour,
          hourly: tariffaCompleta.hourly,
          nextHours: tariffaCompleta.nextHours,
          maxDaily: tariffaCompleta.maxDaily,
          nightTariff: tariffaCompleta.nightTariff,
          overnightFixed: tariffaCompleta.overnightFixed
        } : undefined,
        qrData: JSON.stringify({
          ticket: result.session.ticket_number,
          plate: plateUpper,
          sessionId: result.session.id,
          type: 'wash',
          services: washServicesDetails.map(s => s.name)
        }),
        hasWashServices: true,
        washServices: washServicesDetails.map(s => `${s.name} (€${s.price.toFixed(2)})`),
        washTotal: washTotal,
        bonusHours: result.bonusHours,
        notes: notes ? [notes] : undefined
      });

    } catch (err) {
      console.error(err);
      alert("Errore durante la creazione del ticket lavaggio");
    }
  };

  const handlePrintConventionTicket = async () => {
    const categoryId = vehicleProfile?.category?.id ?? selectedModel?.category_id;
    
    if (!categoryId || tariff === null || !tenantId) {
      alert("Dati veicolo incompleti");
      return;
    }

    if (!selectedConvention) {
      alert("Seleziona una convenzione");
      return;
    }

    try {
      // ⭐ RECUPERA LE TARIFFE COMPLETE
      const tariffaCompleta = await getTariffaCompleta(tenantId, categoryId);
      console.log("💰 Tariffe complete per ticket convenzione:", tariffaCompleta);

      const brandName = vehicleProfile?.brand?.name ?? selectedModel?.brand_name ?? "";
      const modelName = vehicleProfile?.model?.name ?? selectedModel?.model_name ?? "";
      const categoryName = vehicleProfile?.category?.name ?? selectedModel?.category_name ?? "";
      const color = selectedColor?.name ?? vehicleProfile?.color?.name ?? null;
      const vehicleProfileId = vehicleProfile?.id ?? null;

      // 🆕 NUOVA CHIAMATA CON createParkingSessionEntry per convenzione
      const result = await createParkingSessionEntry({
        tenantId,
        categoryId,
        plate: plateUpper,
        brandName: vehicleProfile?.brand?.name ?? selectedModel?.brand_name ?? null,
        modelName: vehicleProfile?.model?.name ?? selectedModel?.model_name ?? null,
        categoryName: vehicleProfile?.category?.name ?? selectedModel?.category_name ?? null,
        color: selectedColor?.name ?? vehicleProfile?.color?.name ?? null,
        customerId: lookup.status === "found" ? lookup.customer.id : null,
        subscriptionId: lookup.subscription?.id ?? null,
        conventionId: selectedConventionId,
        priceListId: null,
        vehicleProfileId: vehicleProfile?.id ?? null,
        washServices: [], // Nessun lavaggio per la convenzione
        calculatedAmount: tariff || 0,
        notes: notes || null
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      await createParkingSessionVehicleSnapshot({
        parkingSessionId: result.session!.id,
        plate: plateUpper,
        brandName,
        modelName,
        categoryName,
        tariff: tariff || 0,
        color,
        vehicleProfileId,
      });

      setCreatedTicket(result.session!.ticket_number);
      
      // Recupera dati azienda
      const { data: companyData } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // 🖨️ STAMPA IL TICKET CONVENZIONE
      await printTicket({
        ticketNumber: result.session!.ticket_number,
        plate: plateUpper,
        entryTime: new Date(),
        brand: brandName,
        model: modelName,
        category: categoryName,
        company: {
          company_name: companyData?.company_name,
          legal_address: companyData?.legal_address,
          phone: companyData?.phone,
          email: companyData?.email,
          website: companyData?.website,
          vat_number: companyData?.vat_number
        },
        tariffInfo: tariffaCompleta ? {
          firstHour: tariffaCompleta.firstHour,
          hourly: tariffaCompleta.hourly,
          nextHours: tariffaCompleta.nextHours,
          maxDaily: tariffaCompleta.maxDaily,
          nightTariff: tariffaCompleta.nightTariff,
          overnightFixed: tariffaCompleta.overnightFixed
        } : {
          firstHour: tariff,
          hourly: tariff,
        },
        qrData: JSON.stringify({
          ticket: result.session!.ticket_number,
          plate: plateUpper,
          sessionId: result.session!.id,
          convention: selectedConvention.name
        }),
        conventionName: selectedConvention.name,
        notes: notes ? [notes] : undefined
      });

    } catch (err) {
      console.error(err);
      alert("Errore durante la creazione del ticket convenzione");
    }
  };

  const resetForm = () => {
  // Resetta gli state
  setPlate("");
  setModelInput("");
  setSelectedModel(null);
  setVehicleProfile(null);
  setSelectedColor(null);
  setWashServices([]);
  setSelectedConventionId(null);
  setSelectedConvention(null);
  setLookup({ status: "idle" });
  setCreatedTicket(null);
  setShowToast(false);
  setShowModelSuggestions(false);
  setNotes("");
  
  // Aspetta che il toast venga mostrato prima di reindirizzare
  setTimeout(() => {
    navigate("/dashboard");
  }, 1500);
};

  /* ===============================
     RENDER CONDIZIONALE
     =============================== */
  if (loadingTenant) {
    return (
      <div className="ingresso-container">
        <div className="loading">Caricamento tenant...</div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="ingresso-container">
        <div className="error">Errore: Tenant non identificato</div>
      </div>
    );
  }

  return (
    <div className="ingresso-container">
      <div className="ingresso">
        <header className="ingresso-header" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "15px 20px",
          background: "#1e1e2e",
          borderBottom: "2px solid #4f8cff"
        }}>
          <div className="header-left" style={{ color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaClock style={{ color: "#4f8cff" }} />
            <span>ENTRATA: <strong style={{ color: "#4f8cff" }}>{entryTime.time}</strong> {entryTime.date}</span>
          </div>
          <div className="header-center" style={{ color: "#4f8cff", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCar />
            <span>REGISTRAZIONE INGRESSO</span>
          </div>
          <div className="header-right" style={{ color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCarSide />
            <span>USCITA: <span style={{ color: "#9ca3af" }}>--:--:--</span></span>
          </div>
        </header>

        <ClientRecognitionBar result={lookup} />

        {/* GRILLE PRINCIPALE - 3 colonne con pesi diversi */}
        <main style={{ 
          display: "grid", 
          gridTemplateColumns: "1.2fr 2.5fr 1.2fr", 
          gap: "20px",
          padding: "20px"
        }}>
          
          {/* Colonna sinistra - Dati veicolo */}
          <section style={{ 
            background: "#1e1e2e", 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333"
          }}>
            <h3 style={{ color: "#4f8cff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCar style={{ color: "#4f8cff" }} /> Dati veicolo
            </h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaIdCard size={12} style={{ color: "#4f8cff" }} /> Targa
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="ES. AA123BB"
                  maxLength={10}
                  style={{ 
                    background: "#1a1f25", 
                    color: "#fff", 
                    border: plate ? "2px solid #4f8cff" : "1px solid #333",
                    padding: "12px",
                    paddingLeft: "40px",
                    borderRadius: "8px", 
                    width: "100%",
                    fontSize: "18px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    transition: "all 0.2s ease",
                    boxShadow: plate ? "0 0 10px rgba(79, 140, 255, 0.3)" : "none"
                  }} 
                />
                <FaCar 
                  style={{ 
                    position: "absolute", 
                    left: "12px", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    color: plate ? "#4f8cff" : "#666",
                    fontSize: "16px"
                  }} 
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px", position: "relative" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaCar size={12} style={{ color: "#4f8cff" }} /> Modello
              </label>
              <input
                value={
                  vehicleProfile
                    ? vehicleProfile.model?.name ?? ""
                    : selectedModel?.model_name ?? modelInput
                }
                onChange={(e) => {
                  setModelInput(e.target.value);
                  setSelectedModel(null);
                  setShowModelSuggestions(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowModelSuggestions(false), 200);
                }}
                onFocus={() => {
                  if (modelResults.length > 0 && !selectedModel) {
                    setShowModelSuggestions(true);
                  }
                }}
                disabled={!!vehicleProfile}
                placeholder="Inizia a digitare..."
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />

              {showModelSuggestions && modelResults.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#2d2d3a",
                  border: "1px solid #4f8cff",
                  borderRadius: "6px",
                  marginTop: "5px",
                  zIndex: 1000,
                  maxHeight: "200px",
                  overflowY: "auto"
                }}>
                  {modelResults.map((m) => (
                    <div
                      key={m.model_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        console.log("🔵 Modello selezionato:", m);
                        setSelectedModel(m);
                        setModelInput(m.model_name);
                        setModelResults([]);
                        setShowModelSuggestions(false);
                      }}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        color: "#fff",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#3d3d4a"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <FaCar size={12} style={{ color: "#4f8cff" }} />
                      <span>{m.model_name} — {m.brand_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaCarSide size={12} style={{ color: "#4f8cff" }} /> Marca
              </label>
              <input
                value={
                  vehicleProfile
                    ? vehicleProfile.brand?.name ?? ""
                    : selectedModel?.brand_name ?? ""
                }
                disabled
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaTag size={12} style={{ color: "#4f8cff" }} /> Categoria
              </label>
              <input
                value={
                  vehicleProfile
                    ? vehicleProfile.category?.name ?? ""
                    : selectedModel?.category_name ?? ""
                }
                disabled
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />
            </div>

            {/* Selettore colore */}
            <div style={{ marginBottom: "15px", position: "relative" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaPalette size={12} style={{ color: "#4f8cff" }} /> Colore
              </label>
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{
                    background: "#2d2d3a",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer"
                  }}
                >
                  {selectedColor ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: selectedColor.code,
                        borderRadius: "4px",
                        border: "1px solid #666"
                      }} />
                      <span style={{ color: "#fff" }}>{selectedColor.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>Seleziona colore</span>
                  )}
                  <FaChevronDown style={{ color: "#9ca3af" }} />
                </div>

                {showColorPicker && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "#2d2d3a",
                    border: "1px solid #4f8cff",
                    borderRadius: "6px",
                    marginTop: "5px",
                    padding: "10px",
                    zIndex: 1000,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    maxHeight: "200px",
                    overflowY: "auto"
                  }}>
                    {AVAILABLE_COLORS.map((color) => (
                      <div
                        key={color.code}
                        onClick={() => {
                          setSelectedColor(color);
                          setShowColorPicker(false);
                        }}
                        style={{
                          width: "30px",
                          height: "30px",
                          backgroundColor: color.code,
                          borderRadius: "4px",
                          border: selectedColor?.code === color.code ? "2px solid #4f8cff" : "1px solid #666",
                          cursor: "pointer",
                          transition: "transform 0.2s"
                        }}
                        title={color.name}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaMoneyBillWave size={12} style={{ color: "#4f8cff" }} /> Tariffa base
              </label>
              <input
                value={tariff !== null ? `€ ${tariff} / h` : "—"}
                disabled
                style={{
                  background: "#2d2d3a",
                  color: "#4f8cff",
                  fontWeight: "bold",
                  fontSize: "18px",
                  border: "2px solid #4f8cff",
                  padding: "10px",
                  borderRadius: "6px",
                  width: "100%"
                }}
              />
            </div>
          </section>

          {/* Colonna centrale - Foto e servizi */}
          <section style={{ 
            background: "#1e1e2e", 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333"
          }}>
            <h3 style={{ color: "#4f8cff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCar style={{ color: "#4f8cff" }} /> Foto veicolo
            </h3>
            
            {/* Foto veicolo - placeholder */}
            <div style={{ 
              background: "#2d2d3a", 
              border: "2px dashed #4f8cff", 
              minHeight: "180px", 
              display: "flex", 
              flexDirection: "column",
              alignItems: "center", 
              justifyContent: "center", 
              color: "#9ca3af", 
              borderRadius: "8px", 
              marginBottom: "20px",
              padding: "15px",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: "80px", opacity: 0.3, marginBottom: "10px" }}>🚗</div>
              
              <div style={{
                background: "#1a1f25",
                border: "2px solid #4f8cff",
                borderRadius: "8px",
                padding: "8px 20px",
                display: "inline-block",
                boxShadow: "0 0 20px rgba(79, 140, 255, 0.3)"
              }}>
                <span style={{ 
                  color: "#fff", 
                  fontSize: "24px", 
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  fontFamily: "monospace"
                }}>
                  {plateUpper || "AA123BB"}
                </span>
              </div>
              
              {selectedColor && (
                <div style={{
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  color: "#9ca3af"
                }}>
                  <span>Colore:</span>
                  <div style={{
                    width: "16px",
                    height: "16px",
                    backgroundColor: selectedColor.code,
                    borderRadius: "4px",
                    border: "1px solid #666"
                  }} />
                  <span>{selectedColor.name}</span>
                </div>
              )}
              
              <div style={{ marginTop: "5px", fontSize: "12px", color: "#4f8cff" }}>
                Foto veicolo (placeholder)
              </div>
            </div>

            {/* 4 colonne per servizi e convenzioni */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              
              {/* PRIME DUE COLONNE - SERVIZI LAVAGGIO */}
              <div style={{ gridColumn: "span 2" }}>
                <h4 style={{ color: "#4f8cff", marginBottom: "10px", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FaSoap style={{ color: "#4f8cff" }} /> Servizi Lavaggio
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {availableWashServices.map((service) => {
                    const isSelected = washServices.some(ws => ws.washServiceId === service.washServiceId);
                    return (
                      <div
                        key={service.washServiceId}
                        onClick={() => {
                          console.log("🖱️ Cliccato servizio:", service.serviceName, "ID:", service.washServiceId);
                          console.log("🖱️ wasSelected:", isSelected);
                          
                          if (isSelected) {
                            setWashServices(prev => {
                              const newArray = prev.filter(ws => ws.washServiceId !== service.washServiceId);
                              console.log("🖱️ Nuovo washServices (rimosso):", newArray);
                              return newArray;
                            });
                          } else {
                            setWashServices(prev => {
                              const newArray = [...prev, { 
                                washServiceId: service.washServiceId,
                                quantity: 1 
                              }];
                              console.log("🖱️ Nuovo washServices (aggiunto):", newArray);
                              return newArray;
                            });
                          }
                        }}
                        style={{
                          padding: "8px",
                          background: isSelected ? "#2d4a8a" : "#2d2d3a",
                          border: `1px solid ${isSelected ? "#4f8cff" : "#444"}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>{service.serviceName}</span>
                          <span style={{ color: "#4f8cff", fontSize: "11px" }}>€{service.price.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: "9px", color: "#9ca3af", display: "flex", gap: "6px" }}>
                          <span>⏱ {service.durationMinutes}min</span>
                          <span>🎯 {service.fidelityPoints}pt</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ULTIME DUE COLONNE - CONVENZIONI */}
              <div style={{ gridColumn: "span 2" }}>
                <h4 style={{ color: "#4f8cff", marginBottom: "10px", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FaFileContract style={{ color: "#4f8cff" }} /> Convenzioni
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  {availableConventions.map((conv) => {
                    const isSelected = selectedConventionId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleConventionChange(isSelected ? null : conv.id)}
                        style={{
                          padding: "8px",
                          background: isSelected ? "#2d4a8a" : "#2d2d3a",
                          border: `1px solid ${isSelected ? "#4f8cff" : "#444"}`,
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ marginBottom: "4px" }}>
                          <span style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>{conv.name}</span>
                        </div>
                        <div style={{ fontSize: "9px", color: "#9ca3af" }}>
                          {conv.discount_type === 'percentage' && `${conv.discount_value}% sconto`}
                          {conv.discount_type === 'fixed' && `€${conv.discount_value} fissi`}
                          {conv.discount_type === 'free_minutes' && `${conv.discount_value}min gratis`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Riepilogo extra */}
{(washServices.length > 0 || selectedConvention) && (
  <div style={{
    marginTop: "20px",
    padding: "12px",
    background: "#1e293b",  // 🔥 CAMBIATO: sfondo più chiaro
    borderRadius: "6px",
    border: "1px solid #4f8cff"
  }}>
    <h5 style={{ color: "#4f8cff", marginBottom: "8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
      <FaShoppingCart style={{ color: "#4f8cff" }} /> Extra selezionati
    </h5>
    
    {washServices.length > 0 && (
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", color: "#cbd5e1", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          <FaSoap style={{ color: "#4f8cff" }} /> Servizi lavaggio:
        </div>
        {washServices.map((ws, idx) => {
          const service = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
          return (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px", paddingLeft: "8px" }}>
              <span style={{ color: "#f1f5f9" }}>{service?.serviceName || "Servizio"}</span>  {/* 🔥 TESTO BIANCO */}
              <span style={{ color: "#4f8cff" }}>+€{service?.price.toFixed(2)}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "4px", borderTop: "1px solid #475569", paddingTop: "4px" }}>
          <span style={{ fontWeight: "bold", color: "#f1f5f9" }}>Totale lavaggi:</span>
          <span style={{ color: "#4f8cff", fontWeight: "bold" }}>€{washTotal.toFixed(2)}</span>
        </div>
      </div>
    )}
    
    {selectedConvention && (
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        fontSize: "11px", 
        paddingTop: washServices.length > 0 ? "8px" : "0", 
        borderTop: washServices.length > 0 ? "1px solid #475569" : "none" 
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f1f5f9" }}>
          <FaFileContract style={{ color: "#4f8cff" }} /> {selectedConvention.name}
        </span>
        <span style={{ color: "#10b981" }}>
          {selectedConvention.discount_type === 'percentage' && `-${selectedConvention.discount_value}%`}
          {selectedConvention.discount_type === 'fixed' && `-€${selectedConvention.discount_value}`}
          {selectedConvention.discount_type === 'free_minutes' && `-${selectedConvention.discount_value}min`}
        </span>
      </div>
    )}
  </div>
)}
          </section>

          {/* Colonna destra - Azioni */}
          <section style={{ 
            background: "#1e1e2e", 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333"
          }}>
            <h3 style={{ color: "#4f8cff", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaParking style={{ color: "#4f8cff" }} /> Azioni
            </h3>

            {/* CAMPO NOTE */}
            <div style={{ 
              marginBottom: "20px",
              background: "#2d2d3a",
              padding: "12px",
              borderRadius: "6px",
              border: "1px solid #333"
            }}>
              <label style={{ 
                color: "#9ca3af", 
                fontSize: "12px", 
                display: "flex", 
                alignItems: "center", 
                gap: "4px", 
                marginBottom: "8px" 
              }}>
                <FaFileContract style={{ color: "#4f8cff" }} /> Note
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eventuali note..."
                rows={2}
                style={{
                  width: "100%",
                  background: "#1a1f25",
                  color: "#fff",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  padding: "8px",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  resize: "vertical"
                }}
              />
            </div>

            {/* PULSANTI AZIONE */}
            <button 
              onClick={handlePrintParkingTicket}
              disabled={!plateUpper || plateUpper.length < 5 || (!vehicleProfile && !selectedModel)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px",
                background: "#4f8cff",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s",
                opacity: (!plateUpper || plateUpper.length < 5 || (!vehicleProfile && !selectedModel)) ? 0.5 : 1
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#2563eb"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#4f8cff"}
            >
              <FaParking /> Stampa Ticket Parcheggio
            </button>

            <button 
              onClick={handlePrintWashTicket}
              disabled={washServices.length === 0 || !plateUpper || plateUpper.length < 5 || (!vehicleProfile && !selectedModel)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "10px",
                background: washServices.length > 0 ? "#10b981" : "#2d2d3a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: washServices.length > 0 ? "pointer" : "not-allowed",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s",
                opacity: washServices.length > 0 ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (washServices.length > 0) e.currentTarget.style.background = "#059669";
              }}
              onMouseLeave={(e) => {
                if (washServices.length > 0) e.currentTarget.style.background = "#10b981";
              }}
            >
              <FaSoap /> Stampa Ticket Lavaggio
            </button>

            <button 
              onClick={handlePrintConventionTicket}
              disabled={!selectedConvention || !plateUpper || plateUpper.length < 5 || (!vehicleProfile && !selectedModel)}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "20px",
                background: selectedConvention ? "#f59e0b" : "#2d2d3a",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: selectedConvention ? "pointer" : "not-allowed",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s",
                opacity: selectedConvention ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (selectedConvention) e.currentTarget.style.background = "#d97706";
              }}
              onMouseLeave={(e) => {
                if (selectedConvention) e.currentTarget.style.background = "#f59e0b";
              }}
            >
              <FaGift /> Stampa Ticket Convenzione
            </button>

            <button 
              onClick={() => navigate(-1)}
              style={{
                width: "100%",
                padding: "12px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#b91c1c"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#dc2626"}
            >
              <FaTimes /> Annulla
            </button>

            <div style={{
              marginTop: "20px",
              background: "#2d2d3a",
              padding: "15px",
              borderRadius: "6px",
              color: "#fff"
            }}>
              <strong style={{ color: "#4f8cff", display: "flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
                <FaShoppingCart style={{ color: "#4f8cff" }} /> Riepilogo
              </strong>
              
              <div style={{ marginBottom: "5px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaIdCard style={{ color: "#4f8cff" }} /> {plateUpper || "Nessuna targa"}
              </div>
              <div style={{ marginBottom: "5px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaUser style={{ color: "#4f8cff" }} /> {lookup.status === "found" ? lookup.customer.name : "Occasionale"}
              </div>
              <div style={{ marginBottom: "5px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaCar style={{ color: "#4f8cff" }} /> {vehicleProfile
                  ? `${vehicleProfile.brand?.name ?? ""} ${vehicleProfile.model?.name ?? ""}`
                  : selectedModel
                  ? `${selectedModel.brand_name} ${selectedModel.model_name}`
                  : "Nuovo veicolo"}
              </div>
              {selectedColor && (
                <div style={{ marginBottom: "5px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FaPalette style={{ color: "#4f8cff" }} /> 
                  <div style={{
                    width: "12px",
                    height: "12px",
                    backgroundColor: selectedColor.code,
                    borderRadius: "2px",
                    border: "1px solid #666"
                  }} />
                  <span>{selectedColor.name}</span>
                </div>
              )}
              <div style={{ marginBottom: "10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaMoneyBillWave style={{ color: "#4f8cff" }} /> Tariffa base: <span style={{ color: "#4f8cff", fontWeight: "bold" }}>{tariff !== null ? `€${tariff}/h` : "—"}</span>
              </div>
              
              <div style={{ borderTop: "1px solid #333", paddingTop: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <FaCheckCircle style={{ color: "#4f8cff" }} /> TOTALE:
                  </span>
                  <span style={{ color: "#4f8cff", fontSize: "16px" }}>€{combinedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Toast di notifica */}
      {showToast && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "#10b981",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 1000,
          animation: "slideIn 0.3s ease"
        }}>
          <FaCheckCircle />
          <span>Ticket {createdTicket} stampato con successo</span>
        </div>
      )}
    </div>
  );
}
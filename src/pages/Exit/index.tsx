// src/pages/exit/index.tsx - VERSIONE COMPLETA CON TUTTE LE FUNZIONALITÀ

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";

import "@/styles/ingresso.css";

import ClientRecognitionBar from "@/components/ingress/ClientRecognitionBar";

import {
  fetchOpenSessionByTicket,
  closeParkingSession,
} from "@/services/parkingSessionService";

import { getAvailableWashServices } from "@/services/washService";
import { createPayment } from "@/services/paymentsService";
import type { WashServiceSelection, WashServicePriceUI } from "@/types/vehicleProfile";

import TicketExitModal from "@/components/exit/TicketExitModal";
import { calculatePrice } from "@/services/pricing/pricingEngine";
import { getExitButtons } from "@/services/exitButtonService";
import type { ExitButton } from "@/services/exitButtonService";
import { getTariffaCompleta } from "@/services/pricingService";
import { lookupCustomerByPlate } from "@/services/customerLookupService";
import type { CustomerLookupResult } from "@/services/customerLookupService";

// 📦 Servizio di stampa ticket
import { printTicket } from "@/services/ticketPrintService";

// 📦 Import icone
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
  FaGift,
  FaTicketAlt,
  FaExclamationTriangle,
  FaPlus,
  FaMinus,
  FaArrowLeft,
  FaEdit,
  FaBed
} from "react-icons/fa";

// Colori
const BLUE = "#4f8cff";
const BG_DARK = "#1a1f25";
const BG_LIGHTER = "#2d2d3a";

type ExitStatus = "idle" | "loading" | "ready" | "paid" | "error";

interface OutstandingDebt {
  id: string;
  session_id: string;
  amount: number;
  date: string;
  description?: string;
  source_type?: string;
}

interface FidelityData {
  id: string;
  program_id: string;
  points: number;
  washes_count: number;
  free_washes_available: number;
  program: {
    name: string;
    type: string;
    threshold: number;
    reward: string;
  };
}

interface ConventionData {
  id: string;
  contract_number: string;
  valid_from: string;
  valid_to: string | null;
  template_name: string;
  discount_type?: string;
  discount_value?: number;
}

// Funzioni helper per formattazione
const formattaOrario = (dataString: string | null | undefined) => {
  if (!dataString) return "--:--:--";
  const data = new Date(dataString);
  return data.toLocaleTimeString('it-IT');
};

const formattaData = (dataString: string | null | undefined) => {
  if (!dataString) return "--/--/----";
  const data = new Date(dataString);
  return data.toLocaleDateString('it-IT');
};

// Calcola ore di sosta
const calculateOreSosta = (dataIngresso: string | null | undefined) => {
  if (!dataIngresso) return 0;
  
  const ingresso = new Date(dataIngresso);
  const now = new Date();
  const diffMs = now.getTime() - ingresso.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 10) return 0;
  if (diffMinutes <= 60) return 1;
  
  const oreComplete = Math.floor(diffMinutes / 60);
  const minutiResidui = diffMinutes % 60;
  
  return minutiResidui > 10 ? oreComplete + 1 : oreComplete;
};

function nowLabel() {
  const d = new Date();
  return {
    time: d.toLocaleTimeString("it-IT"),
    date: d.toLocaleDateString("it-IT"),
  };
}

export default function Exit() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🔑 TENANT ID
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);

  // 🕒 CLOCK
  const [entryTime] = useState(() => nowLabel());
  const [exitTime] = useState(() => nowLabel());

  /* =========================================
     TICKET - Gestione arrivo da Ingresso
     ========================================= */
  const initialTicket = typeof location.state?.ticket === "number" ? String(location.state.ticket) : "";
  const initialSessionId = location.state?.sessionId;
  const fromIngress = location.state?.fromIngress;
  
  const [ticket, setTicket] = useState(initialTicket);
  const ticketNumber = useMemo(() => Number(ticket), [ticket]);

  const [status, setStatus] = useState<ExitStatus>("idle");
  const [session, setSession] = useState<any>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [adjustedAmount, setAdjustedAmount] = useState<number | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  
  // 🔍 LOOKUP CLIENTE
  const [lookupResult, setLookupResult] = useState<CustomerLookupResult>({ status: "idle" });
  
  // DATI PER IL CALCOLO
  const [tariffaOraria, setTariffaOraria] = useState<number>(0);
  const [oreSosta, setOreSosta] = useState<number>(0);
  const [categoriaNome, setCategoriaNome] = useState<string>("");
  
  // SCONTO/MAGGIORAZIONE UNIFICATO
  const [scontoManuale, setScontoManuale] = useState<number>(0);
  
  // NOTE
  const [notes, setNotes] = useState("");

  /* =========================================
     SERVIZI LAVAGGIO
     ========================================= */
  const [washServices, setWashServices] = useState<WashServiceSelection[]>([]);
  const [availableWashServices, setAvailableWashServices] = useState<WashServicePriceUI[]>([]);
  const [washTotal, setWashTotal] = useState<number>(0);
  const [washServicesLoaded, setWashServicesLoaded] = useState(false);

  /* =========================================
     CONVENZIONI
     ========================================= */
  const [availableConventions, setAvailableConventions] = useState<ConventionData[]>([]);
  const [selectedConvention, setSelectedConvention] = useState<ConventionData | null>(null);
  const [totaleConvenzione, setTotaleConvenzione] = useState<number>(0);

  /* =========================================
     PROGRAMMA FEDELTÀ
     ========================================= */
  const [fidelityData, setFidelityData] = useState<FidelityData | null>(null);
  const [useFreeWash, setUseFreeWash] = useState(false);

  /* =========================================
     METODO PAGAMENTO
     ========================================= */
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  /* =========================================
     GESTIONE INSOLUTI
     ========================================= */
  const [outstandingDebts, setOutstandingDebts] = useState<OutstandingDebt[]>([]);
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);
  const [totalePendenti, setTotalePendenti] = useState<number>(0);

  /* =========================================
     STATI VARIE
     ========================================= */
  const [isProcessing, setIsProcessing] = useState(false);
  const [stampaAbilitata, setStampaAbilitata] = useState(false);
  const [modalitaNotte, setModalitaNotte] = useState(false);
  
  // 🔥 FLAG PER EVITARE RACE CONDITION
  const [isExiting, setIsExiting] = useState(false);

  /* =========================================
     PULSANTI EXTRA
     ========================================= */
  const [availableButtons, setAvailableButtons] = useState<ExitButton[]>([]);
  const [appliedButtons, setAppliedButtons] = useState<{ id: string; label: string; amount: number }[]>([]);
  const [overrideButton, setOverrideButton] = useState<{ id: string; label: string; amount: number } | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [priceRules, setPriceRules] = useState<any>(null);
  
  // 🔥 DETTAGLIO PERNOTTAMENTI PER UI
  const [priceBreakdown, setPriceBreakdown] = useState<{ giorniInteri: number; costoNotti: number; costoOre: number } | null>(null);

  /* =========================================
     FUNZIONE PER RECUPERARE SHIFT ATTIVO
     ========================================= */
  const getCurrentShift = async () => {
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, opened_at, opened_by, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Errore recupero shift:', error);
        return null;
      }

      if (!data) {
        console.log('⚠️ Nessuno shift aperto trovato per il tenant');
        return null;
      }

      console.log('✅ Shift attivo trovato:', data);
      return data;

    } catch (err) {
      console.error('❌ Errore in getCurrentShift:', err);
      return null;
    }
  };

  /* =========================================
     FUNZIONE STAMPA TICKET (CORRETTA CON IMPORTO)
     ========================================= */
  const handlePrintTicket = async (tipo: string) => {
    if (!session || !tenantId) {
      alert("Dati sessione mancanti");
      return;
    }

    try {
      // Recupera dati azienda
      const { data: companyData } = await supabase
        .from('tenant_company_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Calcola ore di sosta effettive
      const oreSostaCalc = oreSosta;

      // Prepara i servizi lavaggio per la stampa
      const washServicesList = washServices.map(ws => {
        const service = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
        return {
          name: service?.serviceName || "Lavaggio",
          price: service?.price || 0,
          duration: service?.durationMinutes || 0
        };
      });

      // Importo finale pagato (usa calculatedPrice che è il totale effettivo)
      const finalTotal = calculatedPrice;

      console.log("💰 STAMPA TICKET - Importo finale:", finalTotal);
      console.log("💰 STAMPA TICKET - calculatedPrice:", calculatedPrice);
      console.log("💰 STAMPA TICKET - tariffaOraria:", tariffaOraria);

      await printTicket({
        ticketNumber: session.ticket_number,
        plate: vehicleData?.plate || session?.parking_session_vehicles?.[0]?.plate || "",
        entryTime: new Date(session.entry_time),
        exitTime: new Date(),
        brand: vehicleData?.brand?.name || session?.parking_session_vehicles?.[0]?.brand_name || "",
        model: vehicleData?.model?.name || session?.parking_session_vehicles?.[0]?.model_name || "",
        category: categoriaNome || session?.parking_session_vehicles?.[0]?.category_name || "",
        company: {
          company_name: companyData?.company_name,
          legal_address: companyData?.legal_address,
          phone: companyData?.phone,
          email: companyData?.email,
          website: companyData?.website,
          vat_number: companyData?.vat_number
        },
        tariffInfo: priceRules ? {
          firstHour: priceRules.first_hour,
          hourly: priceRules.hourly,
          nextHours: priceRules.next_hours,
          maxDaily: priceRules.day_max,
          nightTariff: priceRules.night_hourly,
          overnightFixed: priceRules.overnight_24h
        } : undefined,
        qrData: JSON.stringify({
          ticket: session.ticket_number,
          plate: vehicleData?.plate,
          sessionId: session.id,
          type: 'exit'
        }),
        hasWashServices: washServices.length > 0,
        washServices: washServicesList.map(s => `${s.name} (€${s.price.toFixed(2)})`),
        washTotal: washTotal,
        totalAmount: finalTotal,
        paymentMethod: paymentMethod === 'CASH' ? 'Contanti' : (paymentMethod === 'CARD' ? 'Carta' : 'Altro'),
        hours: oreSostaCalc,
        notes: notes ? [notes] : undefined
      });

      console.log(`✅ Ticket ${tipo} stampato con successo - Importo: €${finalTotal}`);

    } catch (err) {
      console.error("❌ Errore stampa ticket:", err);
      alert("Errore durante la stampa del ticket");
    }
  };

  /* =========================================
     FUNZIONE PER CARICARE SESSIONE PER ID (DA INGRESSO)
     ========================================= */
  const loadSessionById = async (sessionId: string) => {
    console.log("🚗 Caricamento sessione per ID:", sessionId);
    setStatus("loading");
    setWashServicesLoaded(false);
    
    try {
      const { data: sessionData, error } = await supabase
        .from('parking_sessions')
        .select(`
          *,
          parking_session_vehicles (*),
          parking_session_wash_services (*)
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      
      console.log("📦 Sessione caricata per ID:", sessionData);
      setSession(sessionData);
      
      // Popola i dati del veicolo
      const vehicle = sessionData.parking_session_vehicles?.[0];
      let finalCategoryId = null;
      let loadedServices: WashServicePriceUI[] = [];
      
      if (vehicle) {
        setVehicleData({
          plate: vehicle.plate,
          brand: { name: vehicle.brand_name },
          model: { name: vehicle.model_name },
          category: { name: vehicle.category_name },
          color: vehicle.color ? { name: vehicle.color } : null
        });
        
        setCategoriaNome(vehicle.category_name);
        
        // Carica categoria e servizi
        if (vehicle.category_name) {
          const { data: catData } = await supabase
            .from('vehicle_categories')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('name', vehicle.category_name)
            .maybeSingle();
          
          if (catData?.id) {
            finalCategoryId = catData.id;
            setCategoryId(finalCategoryId);
            await loadPriceRules(finalCategoryId);
            // Carica servizi disponibili
            loadedServices = await getAvailableWashServices(tenantId, finalCategoryId);
            setAvailableWashServices(loadedServices);
            setWashServicesLoaded(true);
            console.log("✅ Servizi lavaggio caricati:", loadedServices.length);
          }
        }
      }
      
      // Carica wash services della sessione
      let sessionWashServices = [];
      let sessionWashTotal = 0;
      
      if (sessionData.parking_session_wash_services?.length > 0) {
        sessionWashServices = sessionData.parking_session_wash_services.map((ws: any) => ({
          washServiceId: ws.wash_service_id,
          quantity: ws.quantity || 1,
          _price: ws.wash_service_price || 0,
          _name: ws.wash_service_name
        }));
        
        // Calcola totale usando loadedServices
        for (const ws of sessionWashServices) {
          const service = loadedServices.find(s => s.washServiceId === ws.washServiceId);
          if (service) {
            sessionWashTotal += service.price;
          } else if (ws._price) {
            sessionWashTotal += ws._price;
          }
        }
      }
      
      console.log("🧼 sessionWashServices:", sessionWashServices);
      console.log("💰 sessionWashTotal calcolato:", sessionWashTotal);
      
      setWashServices(sessionWashServices);
      setWashTotal(sessionWashTotal);
      setOreSosta(calculateOreSosta(sessionData.entry_time));
      setStatus("ready");
      
      // Cerca cliente dalla targa per insoluti
      if (vehicle?.plate) {
        const lookup = await lookupCustomerByPlate(vehicle.plate);
        setLookupResult(lookup);
        if (lookup.customer?.id) {
          await loadOutstandingDebts(lookup.customer.id);
        }
      }
      
    } catch (err) {
      console.error("❌ Errore caricamento sessione:", err);
      setStatus("error");
      setWashServicesLoaded(true);
    }
  };

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

  /* =========================================
      EFFECT PER CARICARE SESSIONE DA INGRESSO O TICKET
      ========================================= */
  useEffect(() => {
    if (tenantId) {
      if (initialSessionId) {
        console.log("🚗 Arrivato da Ingresso con sessione:", initialSessionId);
        loadSessionById(initialSessionId);
      } else if (initialTicket) {
        handleLookup(Number(initialTicket));
      }
    }
  }, [tenantId, initialSessionId, initialTicket]);

  /* =========================================
      CARICA METODI PAGAMENTO
      ========================================= */
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!tenantId) return;

      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_cash', { ascending: false });

      setPaymentMethods(data || []);
      if (data && data.length > 0) {
        setPaymentMethod(data[0].code);
      }
    };

    loadPaymentMethods();
  }, [tenantId]);

  /* =========================================
      CARICA SERVIZI LAVAGGIO (CON FLAG)
      ========================================= */
  const loadWashServices = async () => {
    if (!categoryId || !tenantId) return [];

    try {
      console.log("🔍 Caricamento lavaggi per categoria:", categoryId);
      const services = await getAvailableWashServices(tenantId, categoryId);
      console.log("✅ Servizi trovati:", services);
      setAvailableWashServices(services);
      setWashServicesLoaded(true);
      return services;
    } catch (error) {
      console.error("Errore caricamento servizi lavaggio:", error);
      setWashServicesLoaded(true);
      return [];
    }
  };

  /* =========================================
      CARICA PULSANTI EXTRA
      ========================================= */
  const loadExitButtons = async () => {
    if (!tenantId) return;
    const buttons = await getExitButtons(tenantId);
    setAvailableButtons(buttons);
  };

  useEffect(() => {
    if (tenantId) {
      loadExitButtons();
    }
  }, [tenantId]);

  /* =========================================
      CARICA CONVENZIONI DEL TENANT
      ========================================= */
  const loadConventions = async () => {
    if (!tenantId) return;

    try {
      console.log("🔍 Caricamento convenzioni per tenant:", tenantId);

      const { data, error } = await supabase
        .from('conventions')
        .select('id, name, discount_type, discount_value')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error("❌ Errore caricamento convenzioni:", error);
        return;
      }

      console.log("✅ Convenzioni trovate:", data);

      const conventions = data?.map(c => ({
        id: c.id,
        contract_number: '',
        valid_from: '',
        valid_to: null,
        template_name: c.name,
        discount_type: c.discount_type,
        discount_value: c.discount_value
      })) || [];

      setAvailableConventions(conventions);

    } catch (error) {
      console.error("Errore caricamento convenzioni:", error);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadConventions();
    }
  }, [tenantId]);

  // 🔥 RICALCOLO WASH TOTAL QUANDO NECESSARIO
  useEffect(() => {
    if (washServices.length > 0 && washTotal === 0 && availableWashServices.length > 0) {
      console.log("🔄 Ricalcolo washTotal perché è 0 ma ci sono washServices");
      let total = 0;
      for (const ws of washServices) {
        const service = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
        if (service) {
          total += service.price;
          console.log(`💰 Ricalcolo: ${service.serviceName} -> €${service.price}`);
        }
      }
      if (total > 0) {
        console.log("💰 washTotal ricalcolato:", total);
        setWashTotal(total);
      }
    }
  }, [washServices, availableWashServices, washTotal]);

  // 🔥 useEffect per sincronizzare washTotal quando availableWashServices viene caricato
  useEffect(() => {
    if (washServices.length > 0 && washTotal === 0 && availableWashServices.length > 0) {
      console.log("🔄 Ricalcolo washTotal dopo caricamento availableWashServices");
      let total = 0;
      for (const ws of washServices) {
        const service = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
        if (service) {
          total += service.price;
          console.log(`💰 ${service.serviceName}: €${service.price}`);
        }
      }
      if (total > 0) {
        console.log("💰 washTotal ricalcolato:", total);
        setWashTotal(total);
      }
    }
  }, [availableWashServices, washServices, washTotal]);

  useEffect(() => {
    if (categoryId) {
      loadPriceRules(categoryId);
    }
  }, [categoryId, tenantId]);

  /* =========================================
      CARICA DATI FEDELTÀ
      ========================================= */
  const loadFidelityData = async (customerId: string) => {
    if (!tenantId || !customerId) return;

    try {
      const { data, error } = await supabase
        .from('customer_fidelity')
        .select(`
          *,
          fidelity_programs (*)
        `)
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFidelityData({
          id: data.id,
          program_id: data.fidelity_program_id,
          points: data.points || 0,
          washes_count: data.washes_count || 0,
          free_washes_available: data.free_washes_available || 0,
          program: data.fidelity_programs
        });
      }
    } catch (error) {
      console.error("Errore caricamento fedeltà:", error);
    }
  };

  /* =========================================
      CARICA INSOLUTI PER CLIENTE
      ========================================= */
  const loadOutstandingDebts = async (customerId: string) => {
    if (!tenantId || !customerId) return;

    try {
      const { data, error } = await supabase
        .from('outstanding_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .is('closed_at', null);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          session_id: item.source_id,
          amount: item.amount,
          date: item.created_at,
          description: item.description || item.source_type,
          source_type: item.source_type
        }));
        setOutstandingDebts(formatted);
        const totale = formatted.reduce((sum, d) => sum + d.amount, 0);
        setTotalePendenti(totale);
        setShowOutstandingModal(true);
      } else {
        setOutstandingDebts([]);
        setTotalePendenti(0);
      }
    } catch (err) {
      console.error("Errore caricamento insoluti:", err);
    }
  };

  /* =========================================
      CARICA TARIFFA ORARIA
      ========================================= */
  const loadTariffaOraria = async (catId: string) => {
    if (!tenantId || !catId) return 0;

    try {
      const tariffaCompleta = await getTariffaCompleta(tenantId, catId);
      console.log("💰 Tariffa completa:", tariffaCompleta);

      if (tariffaCompleta?.first_hour) {
        return tariffaCompleta.first_hour;
      } else if (tariffaCompleta?.hourly) {
        return tariffaCompleta.hourly;
      }
      return 0;
    } catch (error) {
      console.error('❌ Errore caricamento tariffa:', error);
      return 0;
    }
  };

  /* =========================================
      CARICA REGOLE DI PREZZO
      ========================================= */
  const loadPriceRules = async (catId: string) => {
    if (!tenantId || !catId) return;

    try {
      const rules = await getTariffaCompleta(tenantId, catId);
      console.log("📊 Regole di prezzo caricate:", rules);
      setPriceRules(rules);

      if (rules) {
        const tariffaDaMostrare = rules.first_hour || rules.hourly || 0;
        setTariffaOraria(tariffaDaMostrare);
        console.log("💰 Tariffa oraria aggiornata:", tariffaDaMostrare);
      }
      return rules;
    } catch (error) {
      console.error("❌ Errore caricamento regole prezzo:", error);
      return null;
    }
  };

  /* =========================================
      CALCOLA TOTALE LAVAGGI (CON FLAG)
      ========================================= */
  const calculateWashTotal = () => {
    // 🔥 Se siamo in modalità Exit, NON ricalcolare
    if (isExiting) {
      console.log("🧼 Modalità Exit attiva, salto il calcolo washTotal");
      return;
    }
    
    // Se non ci sono wash services, esci
    if (!washServices.length) {
      return;
    }
    
    if (!availableWashServices.length) {
      console.log("🧼 availableWashServices non ancora caricati");
      return;
    }

    console.log("🧼 Calcolo totale lavaggi...");
    
    let total = 0;
    washServices.forEach(ws => {
      const service = availableWashServices.find(s => 
        s.washServiceId === ws.washServiceId
      );
      
      if (service) {
        const price = service.price || 0;
        total += price;
        console.log(`➕ Servizio: ${service.serviceName || 'Lavaggio'} -> €${price}`);
      }
    });

    console.log("💰 Totale lavaggi finale:", total);
    
    if (total !== washTotal) {
      setWashTotal(total);
    }
  };

  useEffect(() => {
    calculateWashTotal();
  }, [washServices, availableWashServices, isExiting]);

  /* =========================================
      CALCOLA SCONTO CONVENZIONE
      ========================================= */
  const calculateConventionDiscount = () => {
    if (!selectedConvention || !oreSosta || !tariffaOraria) return 0;

    const oreDaPagare = oreSosta;
    const discountValue = selectedConvention.discount_value || 0;

    switch (selectedConvention.discount_type) {
      case 'percentage':
        return (tariffaOraria * oreDaPagare) * (discountValue / 100);
      case 'fixed':
        return discountValue;
      case 'free_minutes':
        const oreGratis = discountValue / 60;
        return tariffaOraria * Math.min(oreGratis, oreDaPagare);
      default:
        return 0;
    }
  };

  useEffect(() => {
    const sconto = calculateConventionDiscount();
    setTotaleConvenzione(sconto);
  }, [selectedConvention, oreSosta, tariffaOraria]);

  useEffect(() => {
    if (categoryId) {
      loadPriceRules(categoryId);
    }
  }, [categoryId, tenantId]);

  /* =========================================
      GESTIONE LAVAGGI IN USCITA (CON DB)
      ========================================= */
  const handleWashToggle = async (service: WashServicePriceUI) => {
    console.log("🖱️ Cliccato servizio in Exit:", service.serviceName);

    const isSelected = washServices.some(s => s.washServiceId === service.washServiceId);
    
    if (!session?.id) {
      console.error("❌ Sessione non disponibile");
      return;
    }

    if (isSelected) {
      // RIMUOVI il servizio dal DB
      console.log("🗑️ Rimuovendo servizio:", service.serviceName);
      
      const { error } = await supabase
        .from("parking_session_wash_services")
        .delete()
        .eq("parking_session_id", session.id)
        .eq("wash_service_id", service.washServiceId);

      if (error) {
        console.error("❌ Errore rimozione lavaggio:", error);
      } else {
        console.log("✅ Servizio rimosso dal DB");
      }
      
      setWashServices(prev => prev.filter(s => s.washServiceId !== service.washServiceId));
      
    } else {
      // AGGIUNGI il servizio al DB
      console.log("➕ Aggiungendo servizio:", service.serviceName);
      
      const { error } = await supabase
        .from("parking_session_wash_services")
        .insert({
          parking_session_id: session.id,
          wash_service_id: service.washServiceId,
          wash_service_name: service.serviceName,
          wash_service_price: service.price,
          quantity: 1,
          status: "pending",
          tenant_id: tenantId
        });

      if (error) {
        console.error("❌ Errore aggiunta lavaggio:", error);
      } else {
        console.log("✅ Servizio aggiunto al DB");
      }
      
      setWashServices(prev => [...prev, { 
        washServiceId: service.washServiceId, 
        quantity: 1 
      }]);
    }
    
    // Ricalcola il totale
    let total = 0;
    for (const ws of washServices) {
      if (ws.washServiceId === service.washServiceId && !isSelected) {
        total += service.price;
      } else if (ws.washServiceId !== service.washServiceId) {
        const existingService = availableWashServices.find(s => s.washServiceId === ws.washServiceId);
        if (existingService) total += existingService.price;
      }
    }
    setWashTotal(total);
  };

    /* =========================================
      CALCOLO PREZZO CON ENGINE
   ========================================= */
  const calculateFinalTotal = useCallback(async () => {
    if (!session?.entry_time || !tenantId) {
      return 0;
    }

    try {
      console.log("🔍 LOOKUP RESULT COMPLETO:", lookupResult);
      console.log("🔍 LOOKUP RESULT CONTRACTS DETTAGLIO:", JSON.stringify(lookupResult.contracts, null, 2));
      console.log("🧼 WASH SERVICES in Exit:", washServices);
      console.log("🧼 washTotal:", washTotal);
      console.log("⏱️ oreSosta:", oreSosta);

      const result = await calculatePrice({
        tenantId,
        session,
        overrideId: overrideButton?.id,
        additionalButtonIds: appliedButtons.map(b => b.id),
        lookupResult: {
          subscription: {
            subscription_type: lookupResult?.contracts?.subscription?.subscription_type ?? null,
            is_active: lookupResult?.contracts?.subscription?.is_active ?? false
          }
        }
      });

      const baseAmount = result.amount;
      const totaleLavaggi = useFreeWash ? 0 : washTotal;
      const totaleInsoluti = totalePendenti;
      
      // Se ci sono lavaggi e nessuna sosta, paga solo i lavaggi
      const hasWashOnly = washServices.length > 0 && oreSosta === 0;
      
      let totaleFinale;
      if (hasWashOnly) {
        totaleFinale = totaleLavaggi - totaleConvenzione + scontoManuale + totaleInsoluti;
        console.log("🎯 SOLO LAVAGGIO - nessuna sosta - importo:", totaleLavaggi);
      } else {
        totaleFinale = baseAmount + totaleLavaggi - totaleConvenzione + scontoManuale + totaleInsoluti;
      }

      // Calcola breakdown per la UI dei pernottamenti
      if (priceRules && oreSosta > 0 && !hasWashOnly && priceRules.overnight_24h && priceRules.overnight_24h > 0) {
        const giorniInteri = Math.floor(oreSosta / 24);
        const costoNotti = giorniInteri * priceRules.overnight_24h;
        const oreResidue = oreSosta % 24;
        const firstHour = priceRules.first_hour || 0;
        const nextHours = priceRules.next_hours || 0;
        const costoOre = firstHour + (Math.max(0, oreResidue - 1) * nextHours);
        setPriceBreakdown({ giorniInteri, costoNotti, costoOre });
      } else {
        setPriceBreakdown(null);
      }

      console.log("💰 CALCOLO PREZZO FINALE:", {
        engineType: result.type,
        abbonato: result.type === "subscription" ? "SÌ (Sosta gratuita)" : "NO",
        base_sosta: baseAmount,
        lavaggi: totaleLavaggi,
        hasWashOnly: hasWashOnly,
        convenzione: totaleConvenzione,
        scontoManuale: scontoManuale,
        insoluti: totaleInsoluti,
        totale: Math.max(0, totaleFinale)
      });

      return Math.max(0, totaleFinale);

    } catch (error) {
      console.error("❌ Errore calcolo prezzo:", error);
      return 0;
    }
  }, [
    session,
    tenantId,
    overrideButton,
    appliedButtons,
    washServices,
    washTotal,
    oreSosta,
    useFreeWash,
    totaleConvenzione,
    scontoManuale,
    totalePendenti,
    lookupResult,
    isExiting,
    priceRules
  ]);

  useEffect(() => {
    const updatePrice = async () => {
      console.log("🔄 UpdatePrice triggerato");
      console.log("📊 washServices attuali:", washServices);
      console.log("📊 washTotal attuale:", washTotal);
      console.log("📊 oreSosta attuale:", oreSosta);
      const price = await calculateFinalTotal();
      setCalculatedPrice(price);
    };
    updatePrice();
  }, [calculateFinalTotal, washServices, washTotal, oreSosta]);

  /* =========================================
      GESTIONE PULSANTI EXTRA
      ========================================= */
  const handleApplyButton = (button: ExitButton) => {
    if (button.id === overrideButton?.id) {
      setOverrideButton(null);
    } else {
      setOverrideButton({ id: button.id, label: button.label, amount: button.amount });
      setAppliedButtons([]);
    }
  };

  const handleAddExtra = (button: ExitButton) => {
    if (appliedButtons.some(b => b.id === button.id)) {
      setAppliedButtons(prev => prev.filter(b => b.id !== button.id));
    } else {
      setAppliedButtons(prev => [...prev, { id: button.id, label: button.label, amount: button.amount }]);
    }
    if (overrideButton) {
      setOverrideButton(null);
    }
  };

  const handleResetAll = () => {
    setOverrideButton(null);
    setAppliedButtons([]);
    setScontoManuale(0);
    setWashServices([]);
    setSelectedConvention(null);
    setUseFreeWash(false);
    setNotes("");
  };

  /* =========================================
      GESTIONE CONVENZIONI
      ========================================= */
  const handleConventionChange = (convention: ConventionData | null) => {
    setSelectedConvention(convention);
  };

  /* =========================================
      GESTIONE SCONTO MANUALE
      ========================================= */
  const handleScontoChange = (amount: number) => {
    setScontoManuale(prev => {
      const newValue = (prev || 0) + amount;
      return Math.max(-100, Math.min(100, newValue));
    });
  };

  const handleResetSconto = () => {
    setScontoManuale(0);
  };

  /* =========================================
      LOOKUP SESSIONE PER TICKET (CORRETTO - CARICA PRIMA I SERVIZI)
   ========================================= */
  const handleLookup = async (ticketNum?: number) => {
    const numToUse = ticketNum !== undefined ? ticketNum : ticketNumber;

    console.log("🚀 AVVIO LOOKUP - Ticket:", numToUse, "Tenant:", tenantId);

    if (!numToUse || !tenantId) {
      console.warn("⚠️ Dati mancanti per il lookup");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setIsExiting(true);
    setWashServicesLoaded(false);

    try {
      const openSession = await fetchOpenSessionByTicket(tenantId, Number(numToUse));

      if (!openSession) {
        console.warn("❌ Sessione non trovata");
        setStatus("error");
        setIsExiting(false);
        setWashServicesLoaded(true);
        return;
      }

      console.log("📦 SESSIONE COMPLETA:", openSession);
      setSession(openSession);

      const vehicle = openSession.parking_session_vehicles?.[0];
      let finalCategoryId = null;
      let loadedServices: WashServicePriceUI[] = [];

      if (vehicle && vehicle.plate) {
        setVehicleData({
          plate: vehicle.plate,
          brand: { name: vehicle.brand_name },
          model: { name: vehicle.model_name },
          category: { name: vehicle.category_name },
          color: vehicle.color ? { name: vehicle.color } : null
        });

        const lookup = await lookupCustomerByPlate(vehicle.plate);
        setLookupResult(lookup);

        if (lookup.vehicle?.category) {
          finalCategoryId = lookup.vehicle.category.id;
          setCategoryId(finalCategoryId);
          setCategoriaNome(lookup.vehicle.category.name);
          await loadTariffaOraria(finalCategoryId);
          // 🔥 CARICA E SALVA IN VARIABILE LOCALE
          loadedServices = await getAvailableWashServices(tenantId, finalCategoryId);
          setAvailableWashServices(loadedServices);
          setWashServicesLoaded(true);
          console.log("✅ Servizi lavaggio caricati:", loadedServices.length);
        }
      }

      if (!finalCategoryId && vehicle?.category_name) {
        const { data: catData } = await supabase
          .from('vehicle_categories')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('name', vehicle.category_name)
          .maybeSingle();

        if (catData?.id) {
          finalCategoryId = catData.id;
          setCategoryId(finalCategoryId);
          setCategoriaNome(vehicle.category_name);
          await loadTariffaOraria(finalCategoryId);
          // 🔥 CARICA E SALVA IN VARIABILE LOCALE
          loadedServices = await getAvailableWashServices(tenantId, finalCategoryId);
          setAvailableWashServices(loadedServices);
          setWashServicesLoaded(true);
          console.log("✅ Servizi lavaggio caricati (fallback):", loadedServices.length);
        }
      }

      // 🔥 ORA USA loadedServices (variabile locale) per calcolare sessionWashTotal
      let sessionWashServices = [];
      let sessionWashTotal = 0;
      
      if (openSession.parking_session_wash_services && openSession.parking_session_wash_services.length > 0) {
        sessionWashServices = openSession.parking_session_wash_services.map((ws: any) => ({
          washServiceId: ws.wash_service_id,
          quantity: ws.quantity || 1,
          _price: ws.wash_service_price || 0,
          _name: ws.wash_service_name
        }));
        
        // 🔥 USA loadedServices INVECE DI availableWashServices
        for (const ws of sessionWashServices) {
          const service = loadedServices.find(s => s.washServiceId === ws.washServiceId);
          if (service) {
            sessionWashTotal += service.price;
            console.log(`💰 Trovato prezzo per ${service.serviceName}: €${service.price}`);
          } else if (ws._price) {
            sessionWashTotal += ws._price;
            console.log(`💰 Usato prezzo dalla sessione: €${ws._price}`);
          }
        }
      }
      
      console.log("🧼 sessionWashServices:", sessionWashServices);
      console.log("💰 sessionWashTotal calcolato:", sessionWashTotal);
      
      setWashServices(sessionWashServices);
      setWashTotal(sessionWashTotal);
      setOreSosta(calculateOreSosta(openSession.entry_time));
      setStatus("ready");

      if (openSession.customer_id) {
        await loadFidelityData(openSession.customer_id);
        await loadOutstandingDebts(openSession.customer_id);
      }

    } catch (err) {
      console.error("🔥 ERRORE handleLookup:", err);
      setStatus("error");
      setWashServicesLoaded(true);
    } finally {
      setIsExiting(false);
    }
  };

  /* =========================================
      PAGAMENTO + CHIUSURA SESSIONE (CON STAMPA)
      ========================================= */
  const handlePayment = async () => {
    if (!session || !tenantId || isProcessing) return;

    setIsProcessing(true);

    try {
      const shift = await getCurrentShift();
      if (!shift) {
        alert('Nessuno shift attivo trovato. Apri un turno prima di incassare.');
        setIsProcessing(false);
        return;
      }

      const { data: methodData, error: methodError } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('code', paymentMethod)
        .eq('tenant_id', tenantId)
        .single();

      if (methodError) throw methodError;

      await supabase.from('payments').insert({
        tenant_id: tenantId,
        shift_id: shift.id,
        amount: calculatedPrice,
        payment_method_id: methodData.id,
        reference_type: 'parking_session',
        reference_id: session.id,
        created_at: new Date().toISOString()
      });

      if (outstandingDebts.length > 0) {
        for (const debt of outstandingDebts) {
          await supabase.from('outstanding_payments').update({
            status: 'paid',
            closed_at: new Date().toISOString()
          }).eq('id', debt.id);
        }
        setOutstandingDebts([]);
        setTotalePendenti(0);
      }

      await closeParkingSession({
        sessionId: session.id,
        finalAmount: calculatedPrice,
      });

      // 🔥 STAMPA IL TICKET DI USCITA
      if (stampaAbilitata) {
        await handlePrintTicket('uscita');
      }

      setStatus("paid");
      setTimeout(() => navigate("/dashboard"), 2000);

    } catch (err) {
      console.error('❌ Errore pagamento:', err);
      setStatus("error");
      alert('Errore durante il pagamento: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================
      PAGAMENTO DIFFERITO (CON STAMPA E LOG E GESTIONE CLIENTE NON IDENTIFICATO)
      ========================================= */
  const handlePagamentoDifferito = async () => {
    console.log("💳💳💳 PAGAMENTO DIFFERITO CHIAMATO 💳💳💳");
    console.log("Session ID:", session?.id);
    console.log("Ticket:", session?.ticket_number);
    console.log("Customer ID:", session?.customer_id);
    console.log("Calculated Price:", calculatedPrice);
    console.log("Wash Services:", washServices);
    
    if (!session || !tenantId) return;

    setIsProcessing(true);

    try {
      await closeParkingSession({
        sessionId: session.id,
        finalAmount: 0,
      });
      
      console.log("✅ Sessione chiusa con finalAmount=0");

      // 🔥 Se non c'è customer_id, proviamo a recuperarlo dalla targa
      let customerId = session.customer_id;
      
      if (!customerId && session.parking_session_vehicles?.[0]?.plate) {
        console.log("🔍 Cliente non associato, cerco per targa:", session.parking_session_vehicles[0].plate);
        const lookup = await lookupCustomerByPlate(session.parking_session_vehicles[0].plate);
        if (lookup.customer?.id) {
          customerId = lookup.customer.id;
          console.log("✅ Cliente trovato per targa:", customerId);
        }
      }
      
      if (customerId && calculatedPrice > 0) {
        const insolutoData = {
          tenant_id: tenantId,
          customer_id: customerId,
          source_id: session.id,
          source_type: 'parking',
          amount: calculatedPrice,
          description: `Sosta del ${new Date(session.entry_time).toLocaleDateString()} - Ticket #${session.ticket_number}${washServices.length > 0 ? ` + ${washServices.length} lavaggio/i` : ''}`,
          status: 'open',
          created_at: new Date().toISOString()
        };
        
        console.log("📝 Creazione insoluto:", insolutoData);

        const { data, error } = await supabase
          .from('outstanding_payments')
          .insert(insolutoData)
          .select();

        if (error) {
          console.error("❌ Errore inserimento insoluto:", error);
          // Non throwiamo l'errore per permettere comunque l'uscita
        } else {
          console.log("✅ Insoluto creato:", data);
        }
      } else if (!customerId && calculatedPrice > 0) {
        console.warn("⚠️ Impossibile creare insoluto: cliente non identificato. Importo €", calculatedPrice);
        // Opzionale: mostra un alert all'operatore
        alert(`Attenzione: Importo di €${calculatedPrice.toFixed(2)} non fatturato perché il cliente non è stato identificato.`);
      }

      if (stampaAbilitata) {
        console.log("🖨️ Stampo ticket di uscita differita");
        await handlePrintTicket('uscita');
      }

      setStatus("paid");
      console.log("🎉 Pagamento differito completato, reindirizzo al dashboard...");
      setTimeout(() => navigate("/dashboard"), 2000);

    } catch (err) {
      console.error('❌ Errore pagamento differito:', err);
      alert('Errore durante il pagamento differito: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  /* =========================================
      GESTIONE INSOLUTI
      ========================================= */
  const handleIncludeDebts = (include: boolean) => {
    setShowOutstandingModal(false);
  };

  /* =========================================
     RENDER CONDIZIONALE
     ========================================= */
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
    <div className={`ingresso-container ${modalitaNotte ? 'modalita-notte' : ''}`}>
      <div className="ingresso">
        {/* HEADER CON ORARI */}
        <header className="ingresso-header" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "15px 20px",
          background: "#1e1e2e",
          borderBottom: "2px solid #4f8cff"
        }}>
          <div className="header-left" style={{ color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
            <div>
              <FaClock style={{ color: "#4f8cff" }} />
              <span style={{ marginLeft: "5px" }}>INGRESSO:</span>
            </div>
            <div>
              <strong style={{ color: "#4f8cff", fontSize: "1.2rem" }}>
                {session ? formattaOrario(session.entry_time) : "--:--:--"}
              </strong>
              <span style={{ marginLeft: "8px", fontSize: "0.9rem", color: "#9ca3af" }}>
                {session ? formattaData(session.entry_time) : "--/--/----"}
              </span>
            </div>
          </div>
          
          <div className="header-center" style={{ color: "#4f8cff", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCar />
            <span>REGISTRAZIONE USCITA</span>
          </div>
          
          <div className="header-right" style={{ color: "#fff", display: "flex", alignItems: "center", gap: "15px" }}>
            <div>
              <FaClock style={{ color: "#f59e0b" }} />
              <span style={{ marginLeft: "5px" }}>USCITA:</span>
            </div>
            <div>
              <strong style={{ color: "#f59e0b", fontSize: "1.2rem" }}>
                {exitTime.time}
              </strong>
              <span style={{ marginLeft: "8px", fontSize: "0.9rem", color: "#9ca3af" }}>
                {exitTime.date}
              </span>
            </div>
          </div>
        </header>

        {/* ClientRecognitionBar */}
        <ClientRecognitionBar result={lookupResult} />

        {/* GRILLE PRINCIPALE */}
        <main style={{ 
          display: "grid", 
          gridTemplateColumns: "1.2fr 2.5fr 1.2fr", 
          gap: "20px",
          padding: "20px",
          maxHeight: "calc(100vh - 200px)",
          overflow: "auto"
        }}>
          
          {/* Colonna sinistra - Dati veicolo */}
          <section style={{ 
            background: BG_DARK, 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333",
            overflow: "auto"
          }}>
            <h3 style={{ color: BLUE, marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCar style={{ color: BLUE }} /> Dati veicolo
            </h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaIdCard size={12} style={{ color: BLUE }} /> Targa
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  value={vehicleData?.plate || (status === "ready" ? session?.parking_session_vehicles?.[0]?.plate : "") || ""}
                  disabled
                  style={{ 
                    background: "#1a1f25", 
                    color: "#fff", 
                    border: "1px solid #333",
                    padding: "12px",
                    paddingLeft: "40px",
                    borderRadius: "8px", 
                    width: "100%",
                    fontSize: "18px",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    fontFamily: "monospace",
                    textTransform: "uppercase"
                  }} 
                />
                <FaCar style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: "16px" }} />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaCar size={12} style={{ color: BLUE }} /> Modello
              </label>
              <input
                value={vehicleData?.model?.name || (status === "ready" ? session?.parking_session_vehicles?.[0]?.model_name : "") || ""}
                disabled
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaCarSide size={12} style={{ color: BLUE }} /> Marca
              </label>
              <input
                value={vehicleData?.brand?.name || (status === "ready" ? session?.parking_session_vehicles?.[0]?.brand_name : "") || ""}
                disabled
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaTag size={12} style={{ color: BLUE }} /> Categoria
              </label>
              <input
                value={categoriaNome || (status === "ready" ? session?.parking_session_vehicles?.[0]?.category_name : "") || ""}
                disabled
                style={{ 
                  background: categoriaNome ? "#2d4d32" : "#2d2d3a",
                  color: categoriaNome ? "#4caf50" : "#fff",
                  border: "1px solid #333",
                  padding: "10px",
                  borderRadius: "6px",
                  width: "100%",
                  fontWeight: categoriaNome ? "bold" : "normal"
                }}
              />
            </div>

            {/* TARIFFA ORARIA */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaMoneyBillWave size={12} style={{ color: BLUE }} /> Tariffa oraria
              </label>
              <input
                value={tariffaOraria ? `€ ${tariffaOraria.toFixed(2)}/h` : "Tariffa non disponibile"}
                disabled
                style={{ 
                  background: tariffaOraria ? "#2d4d32" : "#3a3a4d",
                  color: tariffaOraria ? "#4caf50" : "#ccc",
                  border: "1px solid #333",
                  padding: "10px",
                  borderRadius: "6px",
                  width: "100%",
                  fontWeight: "bold"
                }}
              />
            </div>

            {/* ORE DI SOSTA */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaClock size={12} style={{ color: BLUE }} /> Ore di sosta
              </label>
              <input
                value={`${oreSosta} ore`}
                disabled
                style={{ 
                  background: "#2d2d3a",
                  color: "#fff",
                  border: "1px solid #333",
                  padding: "10px",
                  borderRadius: "6px",
                  width: "100%",
                  fontWeight: "bold"
                }}
              />
            </div>

            {/* DETTAGLIO PERNOTTAMENTI */}
            {priceBreakdown && priceBreakdown.giorniInteri > 0 && (
              <div style={{ 
                marginTop: "15px",
                padding: "10px",
                background: "#2d4a8a30",
                borderRadius: "6px",
                border: "1px solid #4f8cff"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: BLUE, marginBottom: "8px" }}>
                  <FaBed />
                  <strong>Pernottamenti</strong>
                </div>
                <div style={{ fontSize: "12px", color: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>Notti ({priceBreakdown.giorniInteri} × €{priceRules?.overnight_24h || 0}/notte):</span>
                    <span style={{ color: BLUE }}>€{priceBreakdown.costoNotti}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Ore residue:</span>
                    <span style={{ color: BLUE }}>€{priceBreakdown.costoOre}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "5px" }}>
                <FaPalette size={12} style={{ color: BLUE }} /> Colore
              </label>
              <input
                value={vehicleData?.color?.name || (status === "ready" ? session?.parking_session_vehicles?.[0]?.color : "") || ""}
                disabled
                style={{ background: "#2d2d3a", color: "#fff", border: "1px solid #333", padding: "10px", borderRadius: "6px", width: "100%" }}
              />
            </div>

            {/* Programma fedeltà */}
            {fidelityData && (
              <div style={{ 
                marginTop: "15px",
                padding: "10px",
                background: "#f59e0b20",
                borderRadius: "6px",
                border: "1px solid #f59e0b"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f59e0b" }}>
                  <FaGift />
                  <strong>Programma Fedeltà</strong>
                </div>
                <div style={{ marginTop: "5px", fontSize: "12px", color: "#fff" }}>
                  <div>Lavaggi effettuati: {fidelityData.washes_count}</div>
                  <div>Lavaggi gratuiti disponibili: {fidelityData.free_washes_available}</div>
                  {fidelityData.free_washes_available > 0 && washServices.length > 0 && (
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
                      <input
                        type="checkbox"
                        checked={useFreeWash}
                        onChange={(e) => setUseFreeWash(e.target.checked)}
                      />
                      <span>Usa un lavaggio gratuito</span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Colonna centrale - Foto e servizi */}
          <section style={{ 
            background: BG_DARK, 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333",
            overflow: "auto"
          }}>
            <h3 style={{ color: BLUE, marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaCar style={{ color: BLUE }} /> Foto veicolo
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
              padding: "15px"
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
                  {vehicleData?.plate || (status === "ready" ? session?.parking_session_vehicles?.[0]?.plate : "AA123BB")}
                </span>
              </div>
              {status === "ready" && (
                <div style={{ marginTop: "10px", fontSize: "14px", color: BLUE }}>
                  Ticket #{session.ticket_number}
                </div>
              )}
            </div>

            {/* Dettaglio orari */}
            {status === "ready" && session && (
              <div style={{ 
                background: BG_LIGHTER, 
                padding: "15px", 
                borderRadius: "8px",
                border: "1px solid #333",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "#9ca3af" }}>📅 Ingresso:</span>
                  <span style={{ color: "#fff" }}>{formattaOrario(session.entry_time)} {formattaData(session.entry_time)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#9ca3af" }}>⏱️ Durata:</span>
                  <span style={{ color: BLUE, fontWeight: "bold" }}>
                    {oreSosta} ore
                  </span>
                </div>
              </div>
            )}

            {/* 🔥 SERVIZI LAVAGGIO - MODIFICABILI IN USCITA */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ color: BLUE, marginBottom: "10px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaSoap /> Servizi Lavaggio {washServices.length > 0 && `(${washServices.length})`}
              </h4>
              
              {/* Messaggio di caricamento */}
              {(availableWashServices.length === 0 && !washServicesLoaded) && (
                <div style={{ padding: "10px", background: "#f59e0b20", borderRadius: "6px", marginBottom: "10px", fontSize: "12px", color: "#f59e0b" }}>
                  ⚠️ Caricamento servizi in corso...
                </div>
              )}
              
              {/* Messaggio quando non ci sono servizi disponibili */}
              {availableWashServices.length === 0 && washServicesLoaded && (
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>
                  Nessun servizio lavaggio disponibile per questa categoria
                </div>
              )}
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {availableWashServices.map((service) => {
                  const isSelected = washServices.some(ws => ws.washServiceId === service.washServiceId);
                  return (
                    <div
                      key={service.washServiceId}
                      onClick={() => handleWashToggle(service)}
                      style={{
                        padding: "8px",
                        background: isSelected ? "#2d4a8a" : "#2d2d3a",
                        border: `1px solid ${isSelected ? "#4f8cff" : "#444"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        opacity: isSelected ? 1 : 0.7,
                        transition: "all 0.2s"
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
                      {isSelected && (
                        <div style={{
                          fontSize: "9px",
                          color: "#10b981",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <FaCheckCircle size={8} /> Selezionato
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {washServices.length === 0 && availableWashServices.length > 0 && (
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>
                  Nessun servizio lavaggio selezionato
                </div>
              )}
            </div>

            {/* CONVENZIONI */}
            <div>
              <h4 style={{ color: BLUE, marginBottom: "10px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaFileContract /> Convenzioni
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {availableConventions.map((conv) => {
                  const isSelected = selectedConvention?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleConventionChange(isSelected ? null : conv)}
                      style={{
                        padding: "8px",
                        background: isSelected ? "#2d4a8a" : "#2d2d3a",
                        border: `1px solid ${isSelected ? "#4f8cff" : "#444"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ marginBottom: "4px" }}>
                        <span style={{ color: "#fff", fontSize: "11px", fontWeight: "bold" }}>{conv.template_name}</span>
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
          </section>

          {/* Colonna destra - Pagamento e azioni */}
          <section style={{ 
            background: BG_DARK, 
            padding: "20px", 
            borderRadius: "8px",
            border: "1px solid #333",
            overflow: "auto",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ color: BLUE, marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaMoneyBillWave style={{ color: BLUE }} /> Pagamento
            </h3>

            {status === "ready" && session ? (
              <>
                {/* SEZIONE PULSANTI EXTRA */}
                <div style={{ 
                  background: BG_LIGHTER,
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ color: "#9ca3af" }}>➕ Extra e override</span>
                    {(overrideButton || appliedButtons.length > 0) && (
                      <button
                        onClick={handleResetAll}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: BLUE,
                          cursor: "pointer",
                          fontSize: "11px",
                          textDecoration: "underline"
                        }}
                      >
                        Resetta tutto
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {availableButtons.map(button => {
                      const isOverride = overrideButton?.id === button.id;
                      const isExtra = appliedButtons.some(b => b.id === button.id);
                      const isSelected = isOverride || isExtra;
                      
                      return (
                        <button
                          key={button.id}
                          onClick={() => isExtra ? handleAddExtra(button) : handleApplyButton(button)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleAddExtra(button);
                          }}
                          style={{
                            padding: "8px 12px",
                            background: isSelected ? button.color : '#2d2d3a',
                            border: isSelected ? 'none' : `1px solid ${button.color}`,
                            borderRadius: "6px",
                            color: isSelected ? '#fff' : button.color,
                            fontWeight: "bold",
                            cursor: "pointer",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.2s",
                            opacity: isSelected ? 1 : 0.8
                          }}
                          title={isExtra ? "Extra cumulabile (click per togliere)" : "Override (sostituisce tutto)"}
                        >
                          {button.label} <span style={{ fontSize: "11px" }}>€{button.amount}</span>
                          {isOverride && <span style={{ fontSize: "10px", marginLeft: "4px" }}>⭐</span>}
                          {isExtra && <span style={{ fontSize: "10px", marginLeft: "4px" }}>➕</span>}
                        </button>
                      );
                    })}
                  </div>

                  {overrideButton && (
                    <div style={{
                      marginTop: "10px",
                      padding: "8px",
                      background: "#1a1f25",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#fff", fontSize: "12px" }}>⭐ Override attivo:</span>
                        <span style={{ color: BLUE, fontWeight: "bold" }}>{overrideButton.label}</span>
                      </div>
                      <span style={{ color: BLUE, fontWeight: "bold" }}>€{overrideButton.amount}</span>
                    </div>
                  )}

                  {appliedButtons.length > 0 && (
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "5px" }}>
                        Extra applicati:
                      </div>
                      {appliedButtons.map(btn => (
                        <div key={btn.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 8px",
                          background: "#1a1f25",
                          borderRadius: "4px",
                          marginBottom: "4px"
                        }}>
                          <span style={{ color: "#fff", fontSize: "12px" }}>{btn.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: BLUE, fontWeight: "bold" }}>+€{btn.amount}</span>
                            <button
                              onClick={() => setAppliedButtons(prev => prev.filter(b => b.id !== btn.id))}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#9ca3af",
                                cursor: "pointer",
                                fontSize: "14px"
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px", textAlign: "center" }}>
                    Click: override | Click destro: extra cumulabile
                  </div>
                </div>

                {/* RIEPILOGO PAGAMENTO */}
                <div style={{ 
                  background: BG_LIGHTER,
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px"
                }}>
                  {!overrideButton ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ color: "#9ca3af" }}>Calcolo base ({oreSosta} ore):</span>
                        <span style={{ color: "#fff" }}>€ {(tariffaOraria * oreSosta).toFixed(2)}</span>
                      </div>
                      
                      {appliedButtons.map(btn => (
                        <div key={btn.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ color: "#9ca3af" }}>{btn.label}:</span>
                          <span style={{ color: BLUE }}>+ € {btn.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ color: "#9ca3af" }}>{overrideButton.label}:</span>
                      <span style={{ color: BLUE, fontWeight: "bold" }}>€ {overrideButton.amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {washTotal > 0 && !useFreeWash && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ color: "#9ca3af" }}>Servizi lavaggio:</span>
                      <span style={{ color: "#fff" }}>+ € {washTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {useFreeWash && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", color: "#10b981" }}>
                      <span>Lavaggio gratuito:</span>
                      <span>- € {washTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {totaleConvenzione > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", color: "#10b981" }}>
                      <span>Sconto convenzione:</span>
                      <span>- € {totaleConvenzione.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {scontoManuale !== 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", color: scontoManuale > 0 ? "#10b981" : "#ef4444" }}>
                      <span>{scontoManuale > 0 ? "Sconto manuale" : "Maggiorazione"}:</span>
                      <span>{scontoManuale > 0 ? `- € ${scontoManuale.toFixed(2)}` : `+ € ${Math.abs(scontoManuale).toFixed(2)}`}</span>
                    </div>
                  )}
                  
                  {totalePendenti > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px", color: "#f59e0b" }}>
                      <span>Insoluti pregressi:</span>
                      <span>+ € {totalePendenti.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid #333",
                    fontSize: "18px",
                    fontWeight: "bold"
                  }}>
                    <span style={{ color: "#fff" }}>TOTALE:</span>
                    <span style={{ color: BLUE }}>€ {calculatedPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* SEZIONE MODIFICA IMPORTI */}
                <div style={{ 
                  background: BG_LIGHTER,
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "15px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <span style={{ color: "#9ca3af", display: "flex", alignItems: "center", gap: "4px" }}>
                      <FaEdit /> Modifica importo manuale
                    </span>
                    {scontoManuale !== 0 && (
                      <button
                        onClick={handleResetSconto}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9ca3af",
                          cursor: "pointer",
                          fontSize: "11px",
                          textDecoration: "underline"
                        }}
                      >
                        Resetta
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "5px", marginBottom: "5px", flexWrap: "wrap" }}>
                    <button onClick={() => handleScontoChange(-5)} style={{ padding: "8px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>-5€</button>
                    <button onClick={() => handleScontoChange(-1)} style={{ padding: "8px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>-1€</button>
                    <span style={{ flex: 1, padding: "8px", background: "#1a1f25", borderRadius: "6px", textAlign: "center", color: scontoManuale !== 0 ? (scontoManuale > 0 ? "#10b981" : "#ef4444") : "#fff", fontWeight: "bold", fontSize: "14px", minWidth: "60px" }}>
                      {scontoManuale !== 0 ? `€${scontoManuale.toFixed(2)}` : "€0"}
                    </span>
                    <button onClick={() => handleScontoChange(1)} style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>+1€</button>
                    <button onClick={() => handleScontoChange(5)} style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>+5€</button>
                  </div>
                </div>

                {/* CAMPO NOTE */}
                <div style={{ 
                  marginBottom: "15px",
                  background: BG_LIGHTER,
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #333"
                }}>
                  <label style={{ color: "#9ca3af", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                    <FaFileContract style={{ color: BLUE }} /> Note
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Eventuali note su questa uscita..."
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

                {/* METODO PAGAMENTO */}
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "10px" }}>
                    Metodo di pagamento
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.code)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: paymentMethod === method.code ? BLUE : BG_LIGHTER,
                          border: "none",
                          borderRadius: "6px",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                      >
                        {method.is_cash ? "💵" : method.code === 'CARD' ? "💳" : "🏦"} {method.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TOGGLE STAMPA */}
                <div style={{ 
                  marginBottom: "15px", 
                  padding: "10px", 
                  background: BG_LIGHTER, 
                  borderRadius: "6px",
                  border: "1px solid #333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={stampaAbilitata}
                      onChange={(e) => setStampaAbilitata(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>🖨️ Stampa reale</span>
                  </label>
                  <span style={{ fontSize: '10px', color: '#666' }}>
                    {stampaAbilitata ? "Stampante attiva" : "Modalità debug"}
                  </span>
                </div>

                {/* PULSANTI AZIONE */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    style={{ width: "100%", padding: "12px", background: "#10b981", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: "bold", cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                  >
                    <FaCheckCircle /> {isProcessing ? "PROCESSING..." : "CONFERMA USCITA"}
                  </button>

                  <button
                    onClick={handlePagamentoDifferito}
                    disabled={isProcessing}
                    style={{ width: "100%", padding: "12px", background: "#f59e0b", border: "none", borderRadius: "8px", color: "#fff", fontSize: "14px", fontWeight: "bold", cursor: isProcessing ? "not-allowed" : "pointer", opacity: isProcessing ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                  >
                    💳 PAGAMENTO DIFFERITO
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button onClick={() => handlePrintTicket('uscita')} style={{ padding: "8px", background: "#4f8cff", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <FaPrint /> Ticket uscita
                    </button>
                    <button 
                      onClick={() => handlePrintTicket('lavaggio')}
                      disabled={washServices.length === 0}
                      style={{ padding: "8px", background: washServices.length > 0 ? "#10b981" : "#2d2d3a", border: "none", borderRadius: "6px", color: "#fff", cursor: washServices.length > 0 ? "pointer" : "not-allowed", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", opacity: washServices.length > 0 ? 1 : 0.5 }}
                    >
                      <FaPrint /> Ticket lavaggio
                    </button>
                  </div>

                  <button onClick={handleResetAll} style={{ width: "100%", padding: "8px", background: "transparent", border: "1px solid #666", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "12px", marginTop: "5px" }}>
                    Deseleziona tutto
                  </button>
                </div>
              </>
            ) : status === "paid" ? (
              <div style={{ background: "#10b981", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#fff" }}>
                <FaCheckCircle size={48} style={{ marginBottom: "15px" }} />
                <h3>Uscita registrata!</h3>
              </div>
            ) : status === "error" ? (
              <div style={{ background: "#ef4444", padding: "30px", borderRadius: "8px", textAlign: "center", color: "#fff" }}>
                <FaExclamationTriangle size={48} style={{ marginBottom: "15px" }} />
                <h3>Ticket non valido</h3>
              </div>
            ) : (
              <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
                <FaTicketAlt size={48} style={{ opacity: 0.3, marginBottom: "10px" }} />
                <p>Inserisci il ticket per iniziare</p>
                <button onClick={() => setShowTicketModal(true)} style={{ marginTop: "20px", padding: "10px 20px", background: BLUE, border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", marginRight: "auto" }}>
                  <FaTicketAlt /> Inserisci ticket
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modal per insoluti */}
      {showOutstandingModal && outstandingDebts.length > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: BG_DARK, padding: "30px", borderRadius: "12px", maxWidth: "500px", width: "90%", border: "2px solid #f59e0b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
              <FaExclamationTriangle size={32} color="#f59e0b" />
              <h2 style={{ color: "#fff", margin: 0 }}>Pagamenti insoluti rilevati</h2>
            </div>
            
            <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
              Questo cliente ha dei pagamenti in sospeso:
            </p>

            <div style={{ marginBottom: "20px" }}>
              {outstandingDebts.map((debt, idx) => (
                <div key={idx} style={{ padding: "15px", background: BG_LIGHTER, borderRadius: "8px", marginBottom: "10px", border: "1px solid #333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ color: "#9ca3af" }}>{debt.description || `Insoluto #${idx+1}`}</span>
                    <span style={{ color: "#f59e0b", fontWeight: "bold" }}>€ {debt.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              
              <div style={{ padding: "15px", background: BG_LIGHTER, borderRadius: "8px", marginTop: "10px", border: "1px solid #333", fontWeight: "bold" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#fff" }}>Totale insoluti:</span>
                  <span style={{ color: "#f59e0b" }}>€ {totalePendenti.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => handleIncludeDebts(true)} style={{ flex: 1, padding: "15px", background: "#f59e0b", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
                Includi nel pagamento
              </button>
              <button onClick={() => handleIncludeDebts(false)} style={{ flex: 1, padding: "15px", background: "transparent", border: "1px solid #333", borderRadius: "8px", color: "#fff", cursor: "pointer" }}>
                Paga solo questa sosta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ticket */}
      {showTicketModal && (
        <TicketExitModal
          onClose={() => setShowTicketModal(false)}
          onConfirm={(ticketNum) => {
            setShowTicketModal(false);
            setTicket(ticketNum.toString());
            handleLookup(ticketNum);
          }}
        />
      )}
    </div>
  );
}
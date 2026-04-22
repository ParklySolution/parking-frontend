// src/pages/operator/Contracts/constants.tsx
import { 
  FaTicketAlt, 
  FaSoap, 
  FaHandshake, 
  FaFileContract 
} from "react-icons/fa";

// ✅ CORRETTO: importa SOLO il tipo, non il valore
import type { ContractType } from "./types";

// Colori globali
export const BLUE = "#4f8cff";
export const BG_DARK = "#1a1f25";
export const BG_LIGHTER = "#2d2d3a";

// ✅ Questo array È un valore, quindi va bene
export const CONTRACT_TYPES: ContractType[] = [
  { 
    id: 'subscription', 
    nome: 'Abbonamento Parcheggio', 
    icon: <FaTicketAlt size={24} />,
    colore: '#4f8cff',
    descrizione: 'Contratti di abbonamento mensile/annuale per sosta veicoli'
  },
  { 
    id: 'wash_fidelity', 
    nome: 'Fedeltà Lavaggio', 
    icon: <FaSoap size={24} />,
    colore: '#10b981',
    descrizione: 'Programmi fedeltà per clienti lavaggio auto'
  },
  { 
    id: 'convention', 
    nome: 'Convenzione', 
    icon: <FaHandshake size={24} />,
    colore: '#f59e0b',
    descrizione: 'Contratti convenzionati con aziende/enti'
  },
  { 
    id: 'generic', 
    nome: 'Generico', 
    icon: <FaFileContract size={24} />,
    colore: '#8b5cf6',
    descrizione: 'Altri tipi di contratto personalizzati'
  }
];

export const TARIFF_TYPES = [
  { value: 'sosta', label: 'Sosta' },
  { value: 'lavaggio', label: 'Lavaggio' },
  { value: 'abbonamento', label: 'Abbonamento' }
];
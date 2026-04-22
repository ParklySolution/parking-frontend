// src/pages/tenant/abbonati/hooks/useSubscriptionsStats.ts

interface Contract {
  id: string;
  contract_number: string;
  valid_from: string;
  valid_to: string | null;
  price: number | null;
  template?: {
    type: string;
    name: string;
  };
}

interface CustomerWithContracts {
  customer: any;
  contracts: Contract[];
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

export const useSubscriptionsStats = (customersWithData: CustomerWithContracts[]): Stats => {
  // Estrai tutti i contratti
  const allContracts = customersWithData.flatMap(item => item.contracts);
  
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  // Contatori per tipo
  const byType: Record<string, number> = {};

  const stats = {
    total: allContracts.length,
    active: allContracts.filter(c => {
      if (!c.valid_to) return true; // Se non c'è data fine, considera attivo
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
      const type = c.template?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {})
  };

  return stats;
};
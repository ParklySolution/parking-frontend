export interface VehicleProfileByPlate {
  plate: string;

  model: {
    id: string;
    name: string;
  } | null;

  brand: {
    id: string;
    name: string;
  } | null;

  category: {
    id: string;
    name: string;
  } | null;

  color: {
    id: string;
    name: string;
    hex: string | null;
  } | null;
}

// ============================================
// NUOVI TIPI PER AUTOLAVAGGIO
// ============================================

export interface WashServiceType {
  id: string;
  tenantId: string;
  code: string;           // es: 'WASH_EXT', 'WASH_INT', 'WASH_FULL'
  name: string;           // es: 'Lavaggio Esterno'
  description: string | null;
  baseDurationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface WashServicePrice {
  id: string;
  tenantId: string;
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  vehicleCategoryId: string;
  price: number;
  durationMinutes: number;
  fidelityPoints: number;
  createdAt: string;
}

export interface WashParkingBonusRule {
  id: string;
  tenantId: string;
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  bonusType: 'free_hours' | 'discount_percentage' | 'fixed_discount' | 'free_parking';
  bonusValue: number;
  minWashAmount: number | null;
  applicableCategories: string[]; // array di UUID category
  maxUsesPerDay: number | null;
  validDaysOfWeek: number[]; // 1=Lunedì, 7=Domenica
  isActive: boolean;
  createdAt: string;
}

export type WashStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ParkingSessionWashService {
  id: string;
  tenantId: string;
  parkingSessionId: string;
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  washServiceName: string;
  washServicePrice: number;
  washServiceType: string;
  status: WashStatus;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  assignedTo: string | null; // UUID operatore
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFidelity {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleProfileId: string;
  fidelityProgramId: string;
  washesCount: number;
  pointsEarned: number;
  rewardsClaimed: number;
  isActive: boolean;
  enrolledAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WashFidelityProgram {
  id: string;
  tenantId: string;
  name: string;
  requiredActions: number; // es: 10 lavaggi
  rewardDescription: string;
  serviceId: string; // Riferimento a services table
  appliesToWashTypes: string[]; // es: ['complete']
  requiresRegistration: boolean;
  notificationDaysBeforeExpiry: number[];
  isActive: boolean;
  createdAt: string;
}

export interface WashServiceSelection {
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  quantity?: number;
  notes?: string;
}

export interface WashPriceCalculation {
  washServiceType: WashServiceType;
  price: number;
  durationMinutes: number;
  fidelityPoints: number;
  bonusHours: number;
  bonusDiscount: number;
  finalPrice: number;
}

export interface WashCustomer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  isWashCustomer: boolean;
  washCustomerSince: string | null;
  preferredWashType: string | null;
  marketingConsent: boolean;
  receiveWashEmails: boolean;
}

// Tipi per frontend (senza tenantId per semplicità)
export interface WashServiceTypeUI {
  id: string;
  code: string;
  name: string;
  description: string | null;
  baseDurationMinutes: number;
  isActive: boolean;
}

export interface WashServicePriceUI {
  id: string;
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  vehicleCategoryId: string;
  vehicleCategoryName: string;
  price: number;
  durationMinutes: number;
  fidelityPoints: number;
  serviceName?: string;   // ⭐ AGGIUNTO: per comodità nel frontend
  serviceCode?: string;   // ⭐ AGGIUNTO: per comodità nel frontend
  serviceDescription?: string; // ⭐ AGGIUNTO: per comodità nel frontend
}

export interface WashBonusRuleUI {
  id: string;
  washServiceId: string;  // ⭐ MODIFICATO: da washServiceTypeId a washServiceId
  washServiceName: string;
  bonusType: 'free_hours' | 'discount_percentage' | 'fixed_discount' | 'free_parking';
  bonusValue: number;
  description: string;
  isActive: boolean;
}
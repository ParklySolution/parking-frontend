export interface Tariff {
  id: number;
  type: 'sosta' | 'lavaggio' | 'abbonamento';
  description: string;
  price: string;
  valid_from: string;
  valid_to: string;
}

export interface Vehicle {
  id: number;
  plate: string;
  make: string;
  model: string;
  model_id?: string;
  brand_id?: string;
  category_id?: string;
  year: string;
  color: string;
  color_id?: string;
  tariffs: Tariff[];
}
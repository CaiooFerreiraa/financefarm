export interface Crop {
  id: string;
  name: string;
  unit: string;
}

export interface MarketPrice {
  cropId: string;
  price: number;
  change: number; // Percentage
  trend: 'up' | 'down' | 'stable';
}

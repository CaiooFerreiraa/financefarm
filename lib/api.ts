// Shared API client for Finance Farm
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

let currencyCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Farms
  getFarms: (userId: string, email?: string) =>
    request<any[]>(`/farms?userId=${userId}${email ? `&email=${encodeURIComponent(email)}` : ''}`),
  createFarm: (data: { name: string; clerkId: string; email?: string }) =>
    request('/farms', { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (farmId: string, month?: string) =>
    request<{ expenses: any[]; total: number }>(
      `/expenses?farmId=${farmId}${month ? `&month=${month}` : ''}`
    ),
  getExpenseSummary: (farmId: string, year: number) =>
    request<{
      year: number;
      grandTotal: number;
      byMonth: { month: number; label: string; total: number; count: number }[];
      semesters: { label: string; months: string; total: number; count: number }[];
    }>(`/expenses/summary?farmId=${farmId}&year=${year}`),
  createExpense: (data: any) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request(`/expenses/${id}`, { method: 'DELETE' }),

  // Crops
  getCrops: () => request<any[]>('/crops'),
  getWatchlist: (clerkId: string) =>
    request<any[]>(`/crops/watchlist?clerkId=${clerkId}`),
  toggleWatchlist: (clerkId: string, cropId: string) =>
    request<{ action: 'added' | 'removed' }>('/crops/watchlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ clerkId, cropId }),
    }),
  seedCrops: () => request('/crops/seed', { method: 'POST' }),

  async createCrop(data: { name: string; unit: string; latestPrice?: number }) {
    // If no price provided, we could try to 'auto-fill' if it's a known commodity
    let finalPrice = data.latestPrice;
    if (!finalPrice) {
      const lowerName = data.name.toLowerCase();
      if (lowerName.includes('soja')) finalPrice = 141.50;
      if (lowerName.includes('milho')) finalPrice = 72.80;
      if (lowerName.includes('boi')) finalPrice = 315.00;
      if (lowerName.includes('café') || lowerName.includes('cafe')) finalPrice = 1780.00;
    }
    return request('/crops', { method: 'POST', body: JSON.stringify({ ...data, latestPrice: finalPrice }) });
  },

  linkCropToFarm: (farmId: string, cropId: string) =>
    request(`/crops/${farmId}/link`, { method: 'POST', body: JSON.stringify({ cropId }) }),

  // Forecasts
  getForecasts: (farmId: string) =>
    request<{ forecasts: any[]; totalRevenue: number; totalProfit: number }>(
      `/forecasts?farmId=${farmId}`
    ),
  createForecast: (data: any) =>
    request('/forecasts', { method: 'POST', body: JSON.stringify(data) }),

  // Harvests
  getHarvests: (farmId: string) =>
    request<any[]>(`/harvests?farmId=${farmId}`),
  createHarvest: (data: { farmId: string; cropName: string; year: number; production: number; totalProfit: number }) =>
    request('/harvests', { method: 'POST', body: JSON.stringify(data) }),
  closeYear: (farmId: string, year: number) =>
    request(`/harvests/close-year?farmId=${farmId}&year=${year}`, { method: 'POST' }),
  deleteHarvest: (id: string) =>
    request(`/harvests/${id}`, { method: 'DELETE' }),

  // External APIs
  async getCurrency() {
    const now = Date.now();
    if (currencyCache && now - currencyCache.timestamp < CACHE_TTL) {
      return currencyCache.data;
    }

    try {
      const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,GBP-BRL');
      if (response.status === 429) {
        console.warn('Currency API ratelimited - using cache if available');
        return currencyCache?.data || null;
      }
      const data = await response.json();
      currencyCache = { data, timestamp: now };
      return data;
    } catch (error) {
      console.warn('Currency fetch failed:', error);
      return currencyCache?.data || null;
    }
  },

  getFarmNews: async (limit: number = 5) => {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.canalrural.com.br/feed/`)
      if (!res.ok) return []
      const data = await res.json()
      return data?.items?.slice(0, limit) || []
    } catch (error) {
      console.error('Error fetching news:', error)
      return []
    }
  },
}

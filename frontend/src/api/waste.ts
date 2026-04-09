import { apiFetch } from './client';

export interface ApiWaste {
  WasteId: number;
  FoodProductId: number;
  ProductName: string;
  CategoryName: string;
  Quantity: number;
  Reason: string;
  WasteDate: string;
  EstimatedCost: number;
}

export function getAllWaste(productId?: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (productId) params.set('product_id', String(productId));
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return apiFetch<ApiWaste[]>(`/waste/${qs ? '?' + qs : ''}`);
}

export function getWasteById(id: number) {
  return apiFetch<ApiWaste>(`/waste/${id}`);
}

export function createWaste(payload: {
  product_id: number;
  quantity: number;
  reason: string;
  waste_date: string;
  estimated_cost: number;
}) {
  return apiFetch<ApiWaste>('/waste/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteWaste(id: number) {
  return apiFetch<{ message: string }>(`/waste/${id}`, { method: 'DELETE' });
}

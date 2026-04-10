import { apiFetch } from './client';

export interface ApiStock {
  StockLevelId: number;
  FoodProductId: number;
  ProductName: string;
  StockLevel: string;
  Quantity: number;
  OpenMarketQuantity: number;
  GroceryStoreQuantity: number;
  LastUpdated: string;
}

export interface DashboardStats {
  total_products: number;
  total_open_market_stock: number;
  total_grocery_stock: number;
  total_stock: number;
  low_stock_count: number;
}

export function getAllStock() {
  return apiFetch<ApiStock[]>('/inventory/');
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>('/inventory/dashboard');
}

export function getStockByProduct(productId: number) {
  return apiFetch<ApiStock>(`/inventory/${productId}`);
}

export function addStock(productId: number, program: 'open_market' | 'grocery', quantity: number) {
  return apiFetch<ApiStock>(`/inventory/${productId}/add`, {
    method: 'POST',
    body: JSON.stringify({ program, quantity }),
  });
}

export function transferStock(
  productId: number,
  from_program: 'open_market' | 'grocery',
  to_program: 'open_market' | 'grocery',
  quantity: number
) {
  return apiFetch<ApiStock>(`/inventory/${productId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ from_program, to_program, quantity }),
  });
}

export function setStockBaseline(productId: number, open_market_qty: number, grocery_qty: number) {
  return apiFetch<ApiStock>(`/inventory/${productId}/baseline`, {
    method: 'PUT',
    body: JSON.stringify({ open_market_qty, grocery_qty }),
  });
}

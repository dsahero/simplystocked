import { apiFetch } from './client';

export interface RestockRecommendation {
  FoodProductId: number;
  ProductName: string;
  CategoryName: string;
  open_market_qty: number;
  grocery_store_qty: number;
  StockLevel: string;
  predicted_open_market: number;
  predicted_grocery_store: number;
  restock_open_market: number;
  restock_grocery_store: number;
  restock_total: number;
}

export interface ModelState {
  last_invoice_date: string;
  total_invoices_trained: number;
  trained_at: string;
}

export interface CategoryRestock {
  category: string;
  products: number;
  total_units: number;
}

export interface PredictionSummary {
  model_state: ModelState | null;
  total_products: number;
  needs_restock_count: number;
  well_stocked_count: number;
  total_restock_units: number;
  total_open_market_restock: number;
  total_grocery_restock: number;
  by_category: CategoryRestock[];
  urgent_items: RestockRecommendation[];
}

export function getRestockRecommendations() {
  return apiFetch<RestockRecommendation[]>('/predictions/restock');
}

export function getModelState() {
  return apiFetch<ModelState>('/predictions/model-state');
}

export function getPredictionSummary() {
  return apiFetch<PredictionSummary>('/predictions/summary');
}

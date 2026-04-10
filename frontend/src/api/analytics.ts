import { apiFetch } from './client';

// ── Dashboard ─────────────────────────────────────────────────────────
export interface CheckpointStats {
  CheckPointId: number;
  Date: string;
  StartDate: string;
  EndDate: string;
  TotalSpent: number;
  TotalDistributedValue: number;
  TotalWasteCost: number;
  NetValue: number;
  ItemsReceived: number;
  ItemsDistributed: number;
  ItemsWasted: number;
  TransactionCount: number;
  UniqueVisitors: number;
  InvoiceCount: number;
  AvgTransactionValue: number;
  AvgItemsPerTransaction: number;
  LowStockAlerts: number;
  TopCategoryName: string | null;
  Notes: string | null;
}

export interface DashboardStats {
  latest_checkpoint: CheckpointStats | null;
  total_products: number;
  total_stock: number;
  low_stock_count: number;
  vendor_count: number;
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>('/analytics/dashboard');
}

// ── Stock trends ──────────────────────────────────────────────────────
export interface StockTrendPoint {
  SnapshotDate: string;
  Quantity: number;
  OpenMarketQuantity: number;
  GroceryStoreQuantity: number;
  StockLevel?: string;
  ProductName?: string;
}

export function getStockTrends(productId?: number, days = 30) {
  const params = new URLSearchParams();
  if (productId) params.set('product_id', String(productId));
  params.set('days', String(days));
  return apiFetch<StockTrendPoint[]>(`/analytics/stock-trends?${params}`);
}

// ── Received vs Distributed per checkpoint ────────────────────────────
export interface ReceivedVsDistributed {
  CheckPointId: number;
  StartDate: string;
  EndDate: string;
  units_received: number;
  cost_received: number;
  units_distributed: number;
  value_distributed: number;
}

export function getReceivedVsDistributed(categoryId?: number) {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', String(categoryId));
  return apiFetch<ReceivedVsDistributed[]>(`/analytics/received-vs-distributed?${params}`);
}

// ── Distribution by category ──────────────────────────────────────────
export interface CategoryDistribution {
  CategoryName: string;
  total_distributed: number;
  transaction_count: number;
}

export function getDistributionByCategory(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<CategoryDistribution[]>(`/analytics/distribution-by-category?${params}`);
}

// ── Distribution over time ────────────────────────────────────────────
export interface DistributionPeriod {
  period: string;
  transaction_count: number;
  items_distributed: number;
  avg_value: number;
}

export function getDistributionOverTime(startDate?: string, endDate?: string, interval = 'month') {
  const params = new URLSearchParams({ interval });
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<DistributionPeriod[]>(`/analytics/distribution-over-time?${params}`);
}

// ── Waste summary ─────────────────────────────────────────────────────
export interface WasteByReason {
  Reason: string;
  total_units: number;
  total_cost: number;
  event_count: number;
}

export interface WasteByMonth {
  month: string;
  total_units: number;
  total_cost: number;
}

export interface WasteSummary {
  by_reason: WasteByReason[];
  by_month: WasteByMonth[];
  total_units: number;
  total_cost: number;
}

export function getWasteSummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<WasteSummary>(`/analytics/waste-summary?${params}`);
}

// ── Top products ──────────────────────────────────────────────────────
export interface TopProduct {
  FoodProductId: number;
  ProductName: string;
  CategoryName: string;
  total_distributed: number;
}

export function getTopProducts(limit = 10, startDate?: string, endDate?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<TopProduct[]>(`/analytics/top-products?${params}`);
}

// ── Vendor spending ───────────────────────────────────────────────────
export interface VendorSpending {
  VendorId: number;
  VendorName: string;
  invoice_count: number;
  total_spent: number;
}

export function getVendorSpending(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  return apiFetch<VendorSpending[]>(`/analytics/vendor-spending?${params}`);
}

// ── Program comparison ────────────────────────────────────────────────
export interface ProgramCategory {
  CategoryName: string;
  open_market: number;
  grocery: number;
}

export interface ProgramComparison {
  open_market_total: number;
  grocery_total: number;
  by_category: ProgramCategory[];
}

export function getProgramComparison() {
  return apiFetch<ProgramComparison>('/analytics/program-comparison');
}

// ── Checkpoint trends ─────────────────────────────────────────────────
export function getCheckpointTrends() {
  return apiFetch<CheckpointStats[]>('/analytics/checkpoint-trends');
}

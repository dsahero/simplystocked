import { apiFetch } from './client';

export interface ApiProduct {
  FoodProductId: number;
  ProductName: string;
  ProductPrice: number;
  CategoryId: number;
  CategoryName: string;
  StockLevelId: number | null;
  StockLevel: string | null;
  Quantity: number;
  OpenMarketQuantity: number;
  GroceryStoreQuantity: number;
  LastUpdated: string | null;
}

export function getAllProducts() {
  return apiFetch<ApiProduct[]>('/products/');
}

export function getProductById(id: number) {
  return apiFetch<ApiProduct>(`/products/${id}`);
}

export function createProduct(
  name: string,
  price: number,
  category_id: number,
  open_market_qty = 0,
  grocery_qty = 0
) {
  return apiFetch<ApiProduct>('/products/', {
    method: 'POST',
    body: JSON.stringify({ name, price, category_id, open_market_qty, grocery_qty }),
  });
}

export function updateProduct(id: number, name: string, price: number, category_id: number) {
  return apiFetch<ApiProduct>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, price, category_id }),
  });
}

export function deleteProduct(id: number) {
  return apiFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' });
}

export function searchProducts(search: string) {
  return apiFetch<ApiProduct[]>(`/products/?search=${encodeURIComponent(search)}`);
}

export function getLowStockProducts(threshold = 10) {
  return apiFetch<ApiProduct[]>(`/products/?low_stock=true&threshold=${threshold}`);
}

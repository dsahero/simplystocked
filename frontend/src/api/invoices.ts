import { apiFetch } from './client';

export interface AddressDetails {
  attn: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
}

export interface InvoiceLineItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  program?: 'open_market' | 'grocery';
}

export interface ApiInvoice {
  InvoiceId: number;
  Date: string;
  Desc: string;
  TotalPrice: number;
  VendorId: number;
  VendorName?: string;
  VendorEmail?: string;
  VendorCity?: string;
  items?: ApiInvoiceItem[];
}

export interface ApiInvoiceItem {
  InvoiceItemId: number;
  Quantity: number;
  UnitPrice: number;
  FoodProductId: number;
  ProductName: string;
  CategoryName: string;
}

export function getAllInvoices(vendor_id?: number) {
  const qs = vendor_id !== undefined ? `?vendor_id=${vendor_id}` : '';
  return apiFetch<ApiInvoice[]>(`/invoices/${qs}`);
}

export function getInvoiceById(id: number) {
  return apiFetch<ApiInvoice>(`/invoices/${id}`);
}

export function createInvoice(payload: {
  date: string;
  desc: string;
  vendor_id: number;
  from_details: AddressDetails;
  bill_to_details: AddressDetails;
  delivery_details: AddressDetails;
  items: InvoiceLineItem[];
}) {
  return apiFetch<ApiInvoice>('/invoices/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addInvoiceItem(
  invoiceId: number,
  product_id: number,
  quantity: number,
  unit_price: number,
  program: 'open_market' | 'grocery' = 'open_market'
) {
  return apiFetch<ApiInvoice>(`/invoices/${invoiceId}/items`, {
    method: 'POST',
    body: JSON.stringify({ product_id, quantity, unit_price, program }),
  });
}

import { apiFetch } from './client';

export interface ApiVendor {
  VendorId: number;
  Email: string;
  Phone: string;
  HQAddress: string;
  HQCity: string;
  HQState: string;
  HQZip: string;
}

export function getAllVendors() {
  return apiFetch<ApiVendor[]>('/vendors/');
}

export function getVendorById(id: number) {
  return apiFetch<ApiVendor>(`/vendors/${id}`);
}

export function createVendor(v: Omit<ApiVendor, 'VendorId'>) {
  return apiFetch<ApiVendor>('/vendors/', {
    method: 'POST',
    body: JSON.stringify({
      email: v.Email,
      phone: v.Phone,
      hq_address: v.HQAddress,
      hq_city: v.HQCity,
      hq_state: v.HQState,
      hq_zip: v.HQZip,
    }),
  });
}

export function updateVendor(id: number, v: Omit<ApiVendor, 'VendorId'>) {
  return apiFetch<ApiVendor>(`/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      email: v.Email,
      phone: v.Phone,
      hq_address: v.HQAddress,
      hq_city: v.HQCity,
      hq_state: v.HQState,
      hq_zip: v.HQZip,
    }),
  });
}

export function deleteVendor(id: number) {
  return apiFetch<{ message: string }>(`/vendors/${id}`, { method: 'DELETE' });
}

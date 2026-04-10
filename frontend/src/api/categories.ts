import { apiFetch } from './client';

export interface ApiCategory {
  CategoryId: number;
  CategoryName: string;
}

export function getAllCategories() {
  return apiFetch<ApiCategory[]>('/categories/');
}

export function createCategory(name: string) {
  return apiFetch<ApiCategory>('/categories/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

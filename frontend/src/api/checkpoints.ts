import { apiFetch } from './client';

export interface ApiCheckpoint {
  CheckPointId: number;
  Date: string;
  StartDate: string;
  EndDate: string;
}

export interface ApiTransaction {
  TransactionId: number;
  TotalAmount: number;
  CheckPointId: number;
  items?: ApiTransactionItem[];
}

export interface ApiTransactionItem {
  TransactionItemId: number;
  TransactionId: number;
  Quantity: number;
  FoodProductId: number;
  ProductName: string;
  ProductPrice: number;
  CategoryName: string;
}

export function getAllCheckpoints() {
  return apiFetch<ApiCheckpoint[]>('/checkpoints/');
}

export function createCheckpoint(date: string, start_date: string, end_date: string) {
  return apiFetch<ApiCheckpoint>('/checkpoints/', {
    method: 'POST',
    body: JSON.stringify({ date, start_date, end_date }),
  });
}

export function getCheckpointById(id: number) {
  return apiFetch<ApiCheckpoint>(`/checkpoints/${id}`);
}

export function getTransactionsByCheckpoint(checkpointId: number) {
  return apiFetch<ApiCheckpoint & { transactions: ApiTransaction[] }>(
    `/checkpoints/${checkpointId}/transactions`
  );
}

export function createTransaction(
  checkpointId: number,
  items: { product_id: number; quantity: number; unit_price?: number }[]
) {
  return apiFetch<ApiTransaction>(`/checkpoints/${checkpointId}/transactions`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function getYearEndSummary(checkpointId: number) {
  return apiFetch<object>(`/checkpoints/${checkpointId}/summary`);
}

export function rollover(checkpointId: number, new_start_date: string, new_end_date: string) {
  return apiFetch<object>(`/checkpoints/${checkpointId}/rollover`, {
    method: 'POST',
    body: JSON.stringify({ new_start_date, new_end_date }),
  });
}

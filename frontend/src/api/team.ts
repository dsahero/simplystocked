import { apiFetch } from './client';

export interface TeamMember {
  UserId: number;
  Username: string;
  Role: string;
  transaction_count: number;
  total_value: number;
  last_active: string | null;
}

export interface ActivityTransaction {
  TransactionId: number;
  TransactionDate: string;
  TotalAmount: number;
  Program: string;
  items?: ActivityItem[];
}

export interface ActivityItem {
  TransactionItemId: number;
  TransactionId: number;
  Quantity: number;
  FoodProductId: number;
  ProductName: string;
  ProductPrice: number;
  CategoryName: string;
}

export interface ProgramBreakdown {
  Program: string;
  transaction_count: number;
  total_value: number;
}

export interface UserActivity {
  transactions: ActivityTransaction[];
  program_breakdown: ProgramBreakdown[];
  total_transactions: number;
  total_items: number;
}

export interface DailyActivity {
  TransactionDate: string;
  Username: string;
  transaction_count: number;
  total_value: number;
  items_distributed: number;
}

export function getTeamOverview() {
  return apiFetch<TeamMember[]>('/team/overview');
}

export function getUserActivity(userId: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return apiFetch<UserActivity>(`/team/activity/${userId}${qs ? '?' + qs : ''}`);
}

export function getDailyActivity(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const qs = params.toString();
  return apiFetch<DailyActivity[]>(`/team/daily${qs ? '?' + qs : ''}`);
}

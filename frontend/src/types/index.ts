export type UserRole = 'admin' | 'manager' | 'user' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  studentPid?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  locations: {
    [locationId: string]: number;
  };
  unit: string;
  isPerishable: boolean;
  expirationDate?: string;
  costPerUnit: number;
  lastRestocked: string;
  minStockLevel: number;
}

export interface Location {
  id: string;
  name: string;
}

export interface InvoiceData {
  items: {
    name: string;
    quantity: number;
    cost: number;
    isPerishable: boolean;
    expirationDate?: string;
  }[];
  totalCost: number;
  date: string;
}

export interface AnalyticsData {
  date: string;
  inStock: number;
  usage: number;
  cost: number;
}

export interface CheckoutRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  costAtTime: number;
  locationId: string;
  timestamp: string;
  userId: string;
}

export interface BuyListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  addedAt: string;
  isSuggested?: boolean;
}

export interface DailyChecklist {
  date: string;
  locationStats: {
    [locationId: string]: {
      itemsTaken: number;
      notes: string;
      completedBy: string;
    };
  };
}

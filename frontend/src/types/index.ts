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

export interface InvoiceItem {
  name: string;
  vendorSku?: string;        // Item No. (FSWV/Keany) | Product Number (US Foods)
  packSize?: string;         // "40 LB" (Keany) | "48/4.25 OZ" (US Foods) | embedded in name (FSWV)
  unit: string;              // "Case" (FSWV/Keany) | "CS" (US Foods) | "Pound" (FSWV bulk)
  quantity: number;          // shipped / received
  quantityOrdered?: number;  // Keany: ordered may differ from shipped
  unitPrice: number;         // Unit Fee (FSWV) | Unit Price (Keany/US Foods)
  cost: number;              // extended / line total
  brand?: string;            // Label col (US Foods) | parsed from "(KA)" prefix (FSWV) | absent (Keany)
  grossWeightLbs?: number;   // Gross Weight col (FSWV) | per-unit pack weight (Keany)
  storageType?: string;      // Dry | Refrigerated | Frozen (US Foods)
  isPerishable: boolean;
  expirationDate?: string;
  _priceLabel?: string;      // original column name: "Unit Fee" | "Unit Price"
}

export interface InvoiceData {
  vendorName?: string;
  invoiceNumber?: string;
  items: InvoiceItem[];
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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InventoryItem, Location, AnalyticsData, CheckoutRecord, DailyChecklist, BuyListItem, InvoiceData } from '../types';
import { getAllProducts, createProduct, updateProduct as apiUpdateProduct, deleteProduct, ApiProduct } from '../api/products';
import { setStockBaseline, addStock, transferStock as apiTransferStock, getDashboardStats } from '../api/inventory';
import { getAllCheckpoints, createCheckpoint, getTransactionsByCheckpoint, createTransaction, ApiTransaction, ApiTransactionItem } from '../api/checkpoints';
import { getInventoryInsights } from '../services/geminiService';

// ─── Fixed locations mapping to the two MySQL programs ────────────────────────
const FIXED_LOCATIONS: Location[] = [
  { id: 'open_market', name: 'Open Market' },
  { id: 'grocery', name: 'Grocery Store' },
];

const BUY_LIST_KEY = 'simplystocked_buy_list';

// ─── Helper: map an ApiProduct to our InventoryItem ────────────────────────────
function mapProduct(p: ApiProduct): InventoryItem {
  return {
    id: String(p.FoodProductId),
    name: p.ProductName,
    category: p.CategoryName,
    totalQuantity: p.Quantity ?? 0,
    locations: {
      open_market: p.OpenMarketQuantity ?? 0,
      grocery: p.GroceryStoreQuantity ?? 0,
    },
    unit: 'units',
    isPerishable: false,
    costPerUnit: p.ProductPrice ?? 0,
    lastRestocked: p.LastUpdated ? p.LastUpdated.split('T')[0] : new Date().toISOString().split('T')[0],
    minStockLevel: 10,
  };
}

// ─── Helper: map ApiTransaction items to CheckoutRecord[] ─────────────────────
function mapTransactionItems(items: ApiTransactionItem[], tx: ApiTransaction): CheckoutRecord[] {
  return (items ?? []).map((ti) => ({
    id: String(ti.TransactionItemId),
    itemId: String(ti.FoodProductId),
    itemName: ti.ProductName,
    quantity: ti.Quantity,
    costAtTime: ti.ProductPrice ?? 0,
    locationId: 'open_market',
    timestamp: new Date().toISOString(),
    userId: 'system',
  }));
}

interface InventoryContextType {
  items: InventoryItem[];
  locations: Location[];
  analytics: AnalyticsData[];
  checkouts: CheckoutRecord[];
  dailyChecklists: DailyChecklist[];
  buyList: BuyListItem[];
  loading: boolean;
  addItem: (item: Partial<InventoryItem>) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  relocateItem: (id: string, from: string, to: string, quantity: number) => Promise<void>;
  checkoutItem: (itemId: string, locationId: string, quantity: number, userId: string) => Promise<void>;
  submitDailyChecklist: (checklist: DailyChecklist) => Promise<void>;
  addLocation: (name: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  addToBuyList: (item: Partial<BuyListItem>) => Promise<void>;
  removeFromBuyList: (id: string) => Promise<void>;
  clearBuyList: () => Promise<void>;
  processPurchasedItems: (purchasedItems: InvoiceData['items'], buyListIdsToRemove: string[]) => Promise<void>;
  getAIInsights: () => Promise<string>;
  seedTestData: () => Promise<void>;
  refreshInventory: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// ─── Helper: get-or-create "current" checkpoint ───────────────────────────────
async function getOrCreateCurrentCheckpoint(): Promise<number> {
  const checkpoints = await getAllCheckpoints();
  if (checkpoints.length > 0) {
    // Use the most recent checkpoint
    return checkpoints[0].CheckPointId;
  }
  // Create an initial checkpoint for the current year
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const yearEnd = `${new Date().getFullYear()}-12-31`;
  const cp = await createCheckpoint(today, yearStart, yearEnd);
  return cp.CheckPointId;
}

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [buyList, setBuyList] = useState<BuyListItem[]>([]);
  const [dailyChecklists] = useState<DailyChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  // Buy list lives in localStorage  
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUY_LIST_KEY);
      if (stored) setBuyList(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveBuyList = (list: BuyListItem[]) => {
    setBuyList(list);
    localStorage.setItem(BUY_LIST_KEY, JSON.stringify(list));
  };

  // ─── Fetch inventory from backend ─────────────────────────────────────────
  const refreshInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [products] = await Promise.all([getAllProducts()]);
      setItems(products.map(mapProduct));

      // Load checkout history from the most recent checkpoint
      try {
        const checkpoints = await getAllCheckpoints();
        if (checkpoints.length > 0) {
          const result = await getTransactionsByCheckpoint(checkpoints[0].CheckPointId);
          const allCheckouts: CheckoutRecord[] = [];
          for (const tx of result.transactions ?? []) {
            allCheckouts.push(...mapTransactionItems(tx.items ?? [], tx));
          }
          setCheckouts(allCheckouts);
        }
      } catch {
        // Checkout history not critical — silently ignore
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  // ─── Derive analytics from items + checkouts ──────────────────────────────
  const analytics = React.useMemo<AnalyticsData[]>(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const currentTotal = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    return last7.map(date => ({
      date,
      inStock: currentTotal,
      usage: checkouts.filter(c => c.timestamp.startsWith(date)).reduce((a, c) => a + c.quantity, 0),
      cost: checkouts.filter(c => c.timestamp.startsWith(date)).reduce((a, c) => a + c.costAtTime * c.quantity, 0),
    }));
  }, [items, checkouts]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const addItem = async (item: Partial<InventoryItem>) => {
    // Determine category_id — use 1 as fallback (backend must have at least one category)
    const openQty = item.locations?.['open_market'] ?? 0;
    const groceryQty = item.locations?.['grocery'] ?? 0;
    await createProduct(
      item.name || 'New Item',
      item.costPerUnit ?? 0,
      1, // default category — user can update
      openQty,
      groceryQty
    );
    await refreshInventory();
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const numId = Number(id);
    const currentItem = items.find(i => i.id === id);
    if (!currentItem) return;

    // Update product details if name/price changed
    if (updates.name || updates.costPerUnit !== undefined) {
      await apiUpdateProduct(numId, updates.name ?? currentItem.name, updates.costPerUnit ?? currentItem.costPerUnit, 1);
    }

    // Update stock baseline if locations changed
    if (updates.locations) {
      const openQty = updates.locations['open_market'] ?? currentItem.locations['open_market'] ?? 0;
      const groceryQty = updates.locations['grocery'] ?? currentItem.locations['grocery'] ?? 0;
      await setStockBaseline(numId, openQty, groceryQty);
    }

    await refreshInventory();
  };

  const deleteItem = async (id: string) => {
    await deleteProduct(Number(id));
    await refreshInventory();
  };

  const relocateItem = async (id: string, from: string, to: string, quantity: number) => {
    const fromProgram = from as 'open_market' | 'grocery';
    const toProgram = to as 'open_market' | 'grocery';
    await apiTransferStock(Number(id), fromProgram, toProgram, quantity);
    await refreshInventory();
  };

  const checkoutItem = async (itemId: string, locationId: string, quantity: number, userId: string) => {
    const checkpointId = await getOrCreateCurrentCheckpoint();
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    await createTransaction(checkpointId, [
      { product_id: Number(itemId), quantity, unit_price: item.costPerUnit }
    ]);
    await refreshInventory();
  };

  const submitDailyChecklist = async (_checklist: DailyChecklist) => {
    // No backend endpoint — store locally only
  };

  // Locations are fixed — these are no-ops since backend doesn't support custom locations
  const addLocation = async (_name: string) => { /* fixed locations only */ };
  const deleteLocation = async (_id: string) => { /* fixed locations only */ };

  // ─── Buy list (localStorage only) ─────────────────────────────────────────
  const addToBuyList = async (item: Partial<BuyListItem>) => {
    const newItem: BuyListItem = {
      id: `buy-${Date.now()}`,
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 1,
      unit: item.unit || 'units',
      addedAt: new Date().toISOString(),
      isSuggested: item.isSuggested || false,
    };
    saveBuyList([...buyList, newItem]);
  };

  const removeFromBuyList = async (id: string) => {
    saveBuyList(buyList.filter(i => i.id !== id));
  };

  const clearBuyList = async () => {
    saveBuyList([]);
  };

  const processPurchasedItems = async (purchasedItems: InvoiceData['items'], buyListIdsToRemove: string[]) => {
    // Add stock via backend for each purchased item matched by name
    for (const pItem of purchasedItems) {
      const existing = items.find(i => i.name.toLowerCase() === pItem.name.toLowerCase());
      if (existing) {
        await addStock(Number(existing.id), 'open_market', pItem.quantity);
      } else {
        // Create new product
        await createProduct(pItem.name, pItem.cost / pItem.quantity, 1, pItem.quantity, 0);
      }
    }
    // Remove from buy list
    saveBuyList(buyList.filter(i => !buyListIdsToRemove.includes(i.id)));
    await refreshInventory();
  };

  const seedTestData = async () => {
    throw new Error('Seed test data is not available in MySQL mode. Add products via the Inventory page.');
  };

  const getAIInsights = async () => {
    try {
      return await getInventoryInsights(items, checkouts);
    } catch {
      return 'Unable to generate insights at this time.';
    }
  };

  return (
    <InventoryContext.Provider value={{
      items,
      locations: FIXED_LOCATIONS,
      analytics,
      checkouts,
      dailyChecklists,
      buyList,
      loading,
      addItem,
      updateItem,
      deleteItem,
      relocateItem,
      checkoutItem,
      submitDailyChecklist,
      addLocation,
      deleteLocation,
      addToBuyList,
      removeFromBuyList,
      clearBuyList,
      processPurchasedItems,
      getAIInsights,
      seedTestData,
      refreshInventory,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

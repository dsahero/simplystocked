import React, { createContext, useContext, useState, useEffect } from 'react';
import { InventoryItem, Location, AnalyticsData, CheckoutRecord, DailyChecklist, BuyListItem } from '../types';

interface InventoryContextType {
  items: InventoryItem[];
  locations: Location[];
  analytics: AnalyticsData[];
  checkouts: CheckoutRecord[];
  dailyChecklists: DailyChecklist[];
  buyList: BuyListItem[];
  addItem: (item: Partial<InventoryItem>) => void;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  relocateItem: (id: string, from: string, to: string, quantity: number) => void;
  checkoutItem: (itemId: string, locationId: string, quantity: number, userId: string) => void;
  submitDailyChecklist: (checklist: DailyChecklist) => void;
  addLocation: (name: string) => void;
  deleteLocation: (id: string) => void;
  addToBuyList: (item: Partial<BuyListItem>) => void;
  removeFromBuyList: (id: string) => void;
  clearBuyList: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const MOCK_LOCATIONS: Location[] = [
  { id: 'loc-a', name: 'Main Pantry' },
  { id: 'loc-b', name: 'Cold Storage' },
  { id: 'loc-c', name: 'Distribution Center' },
];

const MOCK_ITEMS: InventoryItem[] = [
  {
    id: '1',
    name: 'Canned Beans',
    category: 'Canned Goods',
    totalQuantity: 150,
    locations: { 'loc-a': 100, 'loc-b': 50 },
    unit: 'cans',
    isPerishable: false,
    costPerUnit: 0.85,
    lastRestocked: '2026-03-15',
    minStockLevel: 50,
  },
  {
    id: '2',
    name: 'Whole Milk',
    category: 'Dairy',
    totalQuantity: 24,
    locations: { 'loc-b': 24 },
    unit: 'gallons',
    isPerishable: true,
    expirationDate: '2026-04-10',
    costPerUnit: 3.50,
    lastRestocked: '2026-04-01',
    minStockLevel: 10,
  },
  {
    id: '3',
    name: 'Fresh Apples',
    category: 'Produce',
    totalQuantity: 85,
    locations: { 'loc-a': 40, 'loc-c': 45 },
    unit: 'lbs',
    isPerishable: true,
    expirationDate: '2026-04-15',
    costPerUnit: 1.20,
    lastRestocked: '2026-04-03',
    minStockLevel: 30,
  },
  {
    id: '4',
    name: 'Rice',
    category: 'Grains',
    totalQuantity: 200,
    locations: { 'loc-a': 150, 'loc-c': 50 },
    unit: 'bags',
    isPerishable: false,
    costPerUnit: 5.00,
    lastRestocked: '2026-02-20',
    minStockLevel: 100,
  },
  {
    id: '5',
    name: 'Peanut Butter',
    category: 'Pantry',
    totalQuantity: 12,
    locations: { 'loc-a': 12 },
    unit: 'jars',
    isPerishable: false,
    costPerUnit: 2.50,
    lastRestocked: '2026-03-10',
    minStockLevel: 20,
  },
  {
    id: '6',
    name: 'Pasta Sauce',
    category: 'Canned Goods',
    totalQuantity: 8,
    locations: { 'loc-a': 8 },
    unit: 'jars',
    isPerishable: false,
    costPerUnit: 1.50,
    lastRestocked: '2026-03-12',
    minStockLevel: 25,
  },
];

const MOCK_ANALYTICS: AnalyticsData[] = [
  { date: '2026-03-31', inStock: 450, usage: 45, cost: 380 },
  { date: '2026-04-01', inStock: 460, usage: 50, cost: 420 },
  { date: '2026-04-02', inStock: 440, usage: 60, cost: 410 },
  { date: '2026-04-03', inStock: 480, usage: 40, cost: 390 },
  { date: '2026-04-04', inStock: 470, usage: 55, cost: 430 },
  { date: '2026-04-05', inStock: 455, usage: 48, cost: 400 },
  { date: '2026-04-06', inStock: 459, usage: 52, cost: 415 },
];

const MOCK_CHECKOUTS: CheckoutRecord[] = [
  { id: 'c1', itemId: '1', itemName: 'Canned Beans', quantity: 10, locationId: 'loc-a', timestamp: '2026-04-06T10:00:00Z', userId: '2' },
  { id: 'c2', itemId: '2', itemName: 'Whole Milk', quantity: 5, locationId: 'loc-b', timestamp: '2026-04-06T11:30:00Z', userId: '3' },
  { id: 'c3', itemId: '3', itemName: 'Fresh Apples', quantity: 20, locationId: 'loc-c', timestamp: '2026-04-06T14:20:00Z', userId: '2' },
];

const MOCK_BUY_LIST: BuyListItem[] = [
  { 
    id: 'b1', 
    name: 'Canned Corn', 
    quantity: 24, 
    unit: 'cans', 
    addedAt: '2026-04-06T10:00:00Z', 
    isSuggested: false 
  },
  { 
    id: 'b2', 
    name: 'Pasta Sauce', 
    quantity: 12, 
    unit: 'jars', 
    addedAt: '2026-04-06T11:00:00Z', 
    isSuggested: true 
  },
];

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(MOCK_ITEMS);
  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [analytics] = useState<AnalyticsData[]>(MOCK_ANALYTICS);
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>(MOCK_CHECKOUTS);
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [buyList, setBuyList] = useState<BuyListItem[]>(MOCK_BUY_LIST);

  const addItem = (item: Partial<InventoryItem>) => {
    const newItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      totalQuantity: Object.values(item.locations || {}).reduce((a, b) => (a as number) + (b as number), 0),
    } as InventoryItem;
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.totalQuantity = Object.values(updated.locations || {}).reduce((a, b) => (a as number) + (b as number), 0);
          return updated;
        }
        return item;
      });
      // Delete items with 0 quantity
      return newItems.filter(item => item.totalQuantity > 0);
    });
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const relocateItem = (id: string, from: string, to: string, quantity: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const fromQty = item.locations[from] || 0;
        const toQty = item.locations[to] || 0;
        const actualMove = Math.min(fromQty, quantity);
        
        const newLocations = { ...item.locations };
        newLocations[from] = fromQty - actualMove;
        newLocations[to] = toQty + actualMove;
        
        // Clean up zero locations
        if (newLocations[from] === 0) delete newLocations[from];
        
        return { ...item, locations: newLocations };
      }
      return item;
    }));
  };

  const checkoutItem = (itemId: string, locationId: string, quantity: number, userId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item || !item.locations[locationId] || item.locations[locationId] < quantity) return;

    const newRecord: CheckoutRecord = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      itemName: item.name,
      quantity,
      locationId,
      timestamp: new Date().toISOString(),
      userId,
    };

    setCheckouts(prev => [newRecord, ...prev]);
    
    setItems(prevItems => {
      const newItems = prevItems.map(i => {
        if (i.id === itemId) {
          const newLocs = { ...i.locations };
          newLocs[locationId] -= quantity;
          if (newLocs[locationId] === 0) delete newLocs[locationId];
          return { ...i, locations: newLocs, totalQuantity: i.totalQuantity - quantity };
        }
        return i;
      });
      // Delete items with 0 quantity
      return newItems.filter(item => item.totalQuantity > 0);
    });
  };

  const submitDailyChecklist = (checklist: DailyChecklist) => {
    setDailyChecklists(prev => [checklist, ...prev]);
  };

  const addLocation = (name: string) => {
    const newLoc = { id: `loc-${Math.random().toString(36).substr(2, 4)}`, name };
    setLocations([...locations, newLoc]);
  };

  const deleteLocation = (id: string) => {
    setLocations(locations.filter(loc => loc.id !== id));
    // Also remove this location from all items
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.locations[id]) {
          const newLocs = { ...item.locations };
          delete newLocs[id];
          return { ...item, locations: newLocs, totalQuantity: item.totalQuantity - (item.locations[id] || 0) };
        }
        return item;
      });
      // Delete items with 0 quantity
      return newItems.filter(item => item.totalQuantity > 0);
    });
  };

  const addToBuyList = (item: Partial<BuyListItem>) => {
    const newItem: BuyListItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: item.name || 'Unknown Item',
      quantity: item.quantity || 1,
      unit: item.unit || 'units',
      addedAt: new Date().toISOString(),
      isSuggested: item.isSuggested || false,
    };
    setBuyList(prev => [newItem, ...prev]);
  };

  const removeFromBuyList = (id: string) => {
    setBuyList(prev => prev.filter(i => i.id !== id));
  };

  const clearBuyList = () => {
    setBuyList([]);
  };

  return (
    <InventoryContext.Provider value={{ items, locations, analytics, checkouts, dailyChecklists, buyList, addItem, updateItem, deleteItem, relocateItem, checkoutItem, submitDailyChecklist, addLocation, deleteLocation, addToBuyList, removeFromBuyList, clearBuyList }}>
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

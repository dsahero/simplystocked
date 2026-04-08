import React, { createContext, useContext, useState, useEffect } from 'react';
import { InventoryItem, Location, AnalyticsData, CheckoutRecord, DailyChecklist, BuyListItem } from '../types';
import { auth, db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDocs,
  query, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getInventoryInsights } from '../services/geminiService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface InventoryContextType {
  items: InventoryItem[];
  locations: Location[];
  analytics: AnalyticsData[];
  checkouts: CheckoutRecord[];
  dailyChecklists: DailyChecklist[];
  buyList: BuyListItem[];
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
  getAIInsights: () => Promise<string>;
  seedTestData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [dailyChecklists, setDailyChecklists] = useState<DailyChecklist[]>([]);
  const [buyList, setBuyList] = useState<BuyListItem[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!isAuthReady || !userId) {
      // Clear data if not authenticated
      setItems([]);
      setLocations([]);
      setCheckouts([]);
      setBuyList([]);
      return;
    }

    // Real-time listeners
    const unsubItems = onSnapshot(collection(db, 'products'), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'products'));

    const unsubLocations = onSnapshot(collection(db, 'locations'), (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'locations'));

    const unsubCheckouts = onSnapshot(query(collection(db, 'checkouts'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      setCheckouts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CheckoutRecord)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'checkouts'));

    const unsubBuyList = onSnapshot(collection(db, 'buyList'), (snapshot) => {
      setBuyList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BuyListItem)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'buyList'));

    const unsubAnalytics = onSnapshot(collection(db, 'analytics'), (snapshot) => {
      if (!snapshot.empty) {
        setAnalytics(snapshot.docs.map(doc => doc.data() as AnalyticsData));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'analytics'));

    // Initial data migration if empty
    const checkAndSeed = async () => {
      try {
        const itemsSnap = await getDocs(collection(db, 'products'));
        if (itemsSnap.empty) {
          const MOCK_LOCATIONS = [
            { name: 'Main Pantry' },
            { name: 'Cold Storage' },
            { name: 'Distribution Center' },
          ];
          
          const locIds: string[] = [];
          for (const loc of MOCK_LOCATIONS) {
            const docRef = await addDoc(collection(db, 'locations'), loc);
            locIds.push(docRef.id);
          }

          const MOCK_ITEMS = [
            {
              name: 'Canned Beans',
              category: 'Canned Goods',
              locations: { [locIds[0]]: 100, [locIds[1]]: 50 },
              unit: 'cans',
              isPerishable: false,
              costPerUnit: 0.85,
              minStockLevel: 50,
            },
            {
              name: 'Whole Milk',
              category: 'Dairy',
              locations: { [locIds[1]]: 24 },
              unit: 'gallons',
              isPerishable: true,
              expirationDate: '2026-04-10',
              costPerUnit: 3.50,
              minStockLevel: 10,
            },
          ];

          for (const item of MOCK_ITEMS) {
            const totalQuantity = Object.values(item.locations).reduce((a: number, b: any) => a + (b as number), 0) as number;
            await addDoc(collection(db, 'products'), {
              ...item,
              totalQuantity,
              lastRestocked: new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'products (seeding)');
      }
    };
    checkAndSeed();

    return () => {
      unsubItems();
      unsubLocations();
      unsubCheckouts();
      unsubBuyList();
      unsubAnalytics();
    };
  }, [isAuthReady, userId]);

  // Derive analytics from checkouts if collection is empty or to supplement it
  const derivedAnalytics = React.useMemo(() => {
    if (analytics.length > 0) return analytics;

    const days: { [key: string]: AnalyticsData } = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      days[date] = { date, inStock: 0, usage: 0, cost: 0 };
    });

    checkouts.forEach(c => {
      const date = c.timestamp.split('T')[0];
      if (days[date]) {
        days[date].usage += c.quantity;
        days[date].cost += (c.costAtTime || 0) * c.quantity;
      }
    });

    // Estimate inStock for each day (simple version: current total)
    const currentTotal = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    Object.values(days).forEach(d => {
      d.inStock = currentTotal;
    });

    return Object.values(days);
  }, [analytics, checkouts, items]);

  const addItem = async (item: Partial<InventoryItem>) => {
    try {
      const totalQuantity = Object.values(item.locations || {}).reduce((a: number, b: any) => a + (b as number), 0) as number;
      await addDoc(collection(db, 'products'), {
        ...item,
        totalQuantity,
        lastRestocked: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const itemRef = doc(db, 'products', id);
      const currentItem = items.find(i => i.id === id);
      if (!currentItem) return;

      const newLocations = updates.locations || currentItem.locations;
      const totalQuantity = Object.values(newLocations).reduce((a: number, b: any) => a + (b as number), 0) as number;

      if (totalQuantity <= 0) {
        await deleteDoc(itemRef);
      } else {
        await updateDoc(itemRef, {
          ...updates,
          totalQuantity
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      throw error;
    }
  };

  const relocateItem = async (id: string, from: string, to: string, quantity: number) => {
    try {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const fromQty = item.locations[from] || 0;
      const toQty = item.locations[to] || 0;
      const actualMove = Math.min(fromQty, quantity);
      
      const newLocations = { ...item.locations };
      newLocations[from] = fromQty - actualMove;
      newLocations[to] = toQty + actualMove;
      
      if (newLocations[from] === 0) delete newLocations[from];
      
      await updateDoc(doc(db, 'products', id), {
        locations: newLocations
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id} (relocate)`);
      throw error;
    }
  };

  const checkoutItem = async (itemId: string, locationId: string, quantity: number, userId: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item || !item.locations[locationId] || item.locations[locationId] < quantity) return;

      const batch = writeBatch(db);

      // 1. Create checkout record
      const checkoutRef = doc(collection(db, 'checkouts'));
      batch.set(checkoutRef, {
        itemId,
        itemName: item.name,
        quantity,
        costAtTime: item.costPerUnit,
        locationId,
        timestamp: new Date().toISOString(),
        userId,
      });

      // 2. Update item quantity
      const itemRef = doc(db, 'products', itemId);
      const newLocs = { ...item.locations };
      newLocs[locationId] -= quantity;
      const newTotal = item.totalQuantity - quantity;

      if (newLocs[locationId] === 0) delete newLocs[locationId];

      if (newTotal <= 0) {
        batch.delete(itemRef);
      } else {
        batch.update(itemRef, {
          locations: newLocs,
          totalQuantity: newTotal
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'checkout');
      throw error;
    }
  };

  const submitDailyChecklist = async (checklist: DailyChecklist) => {
    try {
      await addDoc(collection(db, 'dailyChecklists'), checklist);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'dailyChecklists');
      throw error;
    }
  };

  const addLocation = async (name: string) => {
    try {
      await addDoc(collection(db, 'locations'), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'locations');
      throw error;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'locations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `locations/${id}`);
      throw error;
    }
  };

  const addToBuyList = async (item: Partial<BuyListItem>) => {
    try {
      await addDoc(collection(db, 'buyList'), {
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        unit: item.unit || 'units',
        addedAt: new Date().toISOString(),
        isSuggested: item.isSuggested || false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'buyList');
      throw error;
    }
  };

  const removeFromBuyList = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'buyList', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `buyList/${id}`);
      throw error;
    }
  };

  const clearBuyList = async () => {
    try {
      const batch = writeBatch(db);
      buyList.forEach(item => {
        batch.delete(doc(db, 'buyList', item.id));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'buyList (clear)');
      throw error;
    }
  };

  const seedTestData = async () => {
    if (!userId || userId.includes('mock')) {
      throw new Error('Authentication required: Please log in with a Google account to write to Firestore.');
    }
    try {
      const batch = writeBatch(db);
      
      // 1. Add more locations
      const locs = ['Pantry A', 'Pantry B', 'Freezer 1', 'Dry Storage'];
      const locRefs = locs.map(() => doc(collection(db, 'locations')));
      locRefs.forEach((ref, i) => batch.set(ref, { name: locs[i] }));

      // 2. Add diverse products
      const products = [
        { name: 'Peanut Butter', category: 'Proteins', unit: 'jars', cost: 2.5, min: 20 },
        { name: 'Pasta', category: 'Grains', unit: 'boxes', cost: 1.2, min: 40 },
        { name: 'Canned Tuna', category: 'Proteins', unit: 'cans', cost: 1.5, min: 30 },
        { name: 'Rice (5lb)', category: 'Grains', unit: 'bags', cost: 4.0, min: 15 },
        { name: 'Apple Juice', category: 'Beverages', unit: 'bottles', cost: 2.0, min: 10 },
        { name: 'Cereal', category: 'Breakfast', unit: 'boxes', cost: 3.0, min: 12 },
      ];

      const productRefs = products.map(() => doc(collection(db, 'products')));
      productRefs.forEach((ref, i) => {
        const p = products[i];
        const locations: { [key: string]: number } = {};
        locRefs.forEach(lRef => {
          locations[lRef.id] = Math.floor(Math.random() * 50) + 10;
        });
        const totalQuantity = Object.values(locations).reduce((a, b) => a + b, 0);
        
        batch.set(ref, {
          name: p.name,
          category: p.category,
          unit: p.unit,
          costPerUnit: p.cost,
          minStockLevel: p.min,
          locations,
          totalQuantity,
          isPerishable: false,
          lastRestocked: new Date().toISOString().split('T')[0]
        });
      });

      // 3. Add checkout history for the last 7 days
      for (let i = 0; i < 20; i++) {
        const pIdx = Math.floor(Math.random() * productRefs.length);
        const lIdx = Math.floor(Math.random() * locRefs.length);
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        
        const checkoutRef = doc(collection(db, 'checkouts'));
        batch.set(checkoutRef, {
          itemId: productRefs[pIdx].id,
          itemName: products[pIdx].name,
          quantity: Math.floor(Math.random() * 5) + 1,
          costAtTime: products[pIdx].cost,
          locationId: locRefs[lIdx].id,
          timestamp: date.toISOString(),
          userId: userId || 'system'
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'seedTestData');
      throw error;
    }
  };

  const getAIInsights = async () => {
    try {
      return await getInventoryInsights(items, checkouts);
    } catch (error) {
      console.error('Error getting AI insights:', error);
      return "Unable to generate insights at this time.";
    }
  };

  return (
    <InventoryContext.Provider value={{ 
      items, 
      locations, 
      analytics: derivedAnalytics, 
      checkouts, 
      dailyChecklists, 
      buyList, 
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
      getAIInsights,
      seedTestData
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

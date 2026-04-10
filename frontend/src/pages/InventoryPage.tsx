import React, { useState, useMemo } from 'react';
import { Package, Move, Search, Filter, Plus, Edit2, Trash2, AlertCircle, MapPin, X, ArrowRight, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useInventory } from '../contexts/InventoryContext';
import { cn } from '../lib/utils';
import { InventoryItem } from '../types';
import { ProductSearchInput } from '../components/ui/ProductSearchInput';
import { ApiProduct } from '../api/products';
import { addStock, transferStock } from '../api/inventory';

type TabType = 'inventory' | 'receive' | 'relocation';
type Program = 'open_market' | 'grocery';
type PricingType = 'unit' | 'weight';
type WeightUnit = 'lbs' | 'oz' | 'kg';

const PROGRAMS: { value: Program; label: string }[] = [
  { value: 'open_market', label: 'Open Market' },
  { value: 'grocery', label: 'Grocery Store' },
];

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const { items, locations, deleteItem, updateItem, addItem } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Receive Stock state
  const [receiveProduct, setReceiveProduct] = useState<ApiProduct | null>(null);
  const [receiveProgram, setReceiveProgram] = useState<Program>('open_market');
  const [pricingType, setPricingType] = useState<PricingType>('unit');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  // Transfer state
  const [transferProduct, setTransferProduct] = useState<ApiProduct | null>(null);
  const [fromProgram, setFromProgram] = useState<Program>('open_market');
  const [toProgram, setToProgram] = useState<Program>('grocery');
  const [transferQty, setTransferQty] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferError, setTransferError] = useState('');

  const tabs = [
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'receive', name: 'Receive Stock', icon: Plus },
    { id: 'relocation', name: 'Transfer', icon: Move },
  ];

  const categories = useMemo(() => ['All', ...new Set(items.map(i => i.category))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveProduct || !receiveQty) return;
    setReceiveLoading(true);
    setReceiveError('');
    try {
      await addStock(receiveProduct.FoodProductId, receiveProgram, Number(receiveQty));
      setReceiveSuccess(true);
      setReceiveProduct(null);
      setReceiveQty('');
      setTimeout(() => setReceiveSuccess(false), 3000);
    } catch (err: any) {
      setReceiveError(err.message ?? 'Failed to add stock.');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct || !transferQty) return;
    if (fromProgram === toProgram) {
      setTransferError('Source and destination programs must be different.');
      return;
    }
    setTransferLoading(true);
    setTransferError('');
    try {
      await transferStock(transferProduct.FoodProductId, fromProgram, toProgram, Number(transferQty));
      setTransferSuccess(true);
      setTransferProduct(null);
      setTransferQty('');
      setTimeout(() => setTransferSuccess(false), 3000);
    } catch (err: any) {
      setTransferError(err.message ?? 'Failed to transfer stock.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleAddNewItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const program = formData.get('program') as string;
    const qty = Number(formData.get('quantity'));
    const newItem: Partial<InventoryItem> = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      minStockLevel: Number(formData.get('minStockLevel')),
      isPerishable: formData.get('isPerishable') === 'on',
      costPerUnit: Number(formData.get('costPerUnit')),
      locations: { [program]: qty },
      lastRestocked: new Date().toISOString().split('T')[0],
    };
    addItem(newItem);
    setIsAddingItem(false);
  };


  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);

    const updatedLocations: { [key: string]: number } = {
      open_market: Number(formData.get('qty-open_market')) || 0,
      grocery: Number(formData.get('qty-grocery')) || 0,
    };

    updateItem(editingItem.id, {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      minStockLevel: Number(formData.get('minStockLevel')),
      locations: updatedLocations
    });
    setEditingItem(null);
  };


  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Inventory Management</h1>
          <p className="text-forest/60 dark:text-neutral-400">Manage, track, and predict your food bank stock.</p>
        </div>
        <button 
          onClick={() => setIsAddingItem(true)}
          className="flex items-center gap-2 rounded-2xl bg-brown px-6 py-3 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Add New Item
        </button>
      </header>

      {/* Secondary Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-1.5 no-scrollbar border border-forest/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 rounded-[18px] px-6 py-2.5 text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white dark:bg-neutral-900 text-forest shadow-sm"
                : "text-forest/50 hover:text-forest dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-700/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-3 pr-8 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                    <tr>
                      <th className="px-8 py-5">Item Name</th>
                      <th className="px-8 py-5">Category</th>
                      <th className="px-8 py-5">Total Qty</th>
                      <th className="px-8 py-5">Locations</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="font-bold text-forest dark:text-white">{item.name}</div>
                          <div className="text-xs text-forest/40 dark:text-neutral-400">{item.unit}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="inline-flex items-center rounded-xl bg-forest/5 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-forest/60 dark:text-neutral-400">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className={cn(
                            "font-bold text-base",
                            item.totalQuantity <= item.minStockLevel ? "text-brown" : "text-forest dark:text-white"
                          )}>
                            {item.totalQuantity}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(item.locations).map(([locId, qty]) => (
                              <div key={locId} className="flex items-center gap-1.5 rounded-xl bg-cream dark:bg-neutral-800 px-3 py-1 text-[10px] font-bold border border-forest/5 dark:border-neutral-700 text-forest/60">
                                <MapPin className="h-3 w-3 text-forest/30" />
                                <span className="dark:text-neutral-300">{locations.find(l => l.id === locId)?.name}: {qty}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {item.expirationDate && new Date(item.expirationDate) < new Date() ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-900/20 px-4 py-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Expired
                            </span>
                          ) : item.totalQuantity <= item.minStockLevel ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brown/5 dark:bg-brown/20 px-4 py-1.5 text-xs font-bold text-brown dark:text-brown">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 px-4 py-1.5 text-xs font-bold text-forest dark:text-green-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Good stock
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="rounded-xl p-2.5 text-forest/30 hover:bg-forest/10 hover:text-forest transition-colors"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => setItemToDelete(item.id)}
                              className="rounded-xl p-2.5 text-forest/30 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'receive' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {receiveSuccess && (
              <div className="flex items-center gap-3 rounded-2xl bg-green-50 dark:bg-green-900/20 p-5 border border-green-100 dark:border-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm font-bold text-green-700 dark:text-green-400">Stock added successfully!</p>
              </div>
            )}
            {receiveError && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-5 w-5 text-brown shrink-0" />
                <p className="text-sm font-bold text-brown">{receiveError}</p>
              </div>
            )}

            <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm">
              <div className="flex items-center gap-5 mb-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-brown/10 text-brown">
                  <Plus className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-forest dark:text-white">Receive Stock</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">
                    Search for an existing product and log incoming stock.
                  </p>
                </div>
              </div>

              <form onSubmit={handleReceiveStock} className="space-y-8">
                {/* Product Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                    Find Product
                  </label>
                  <ProductSearchInput
                    selected={receiveProduct}
                    onSelect={setReceiveProduct}
                    onClear={() => setReceiveProduct(null)}
                  />
                </div>

                {receiveProduct && (
                  <>
                    {/* Program Assignment */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                        Assign to Program
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {PROGRAMS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setReceiveProgram(p.value)}
                            className={cn(
                              'rounded-2xl border px-6 py-4 text-sm font-bold transition-all active:scale-95',
                              receiveProgram === p.value
                                ? 'border-brown bg-brown/5 text-brown dark:bg-brown/10'
                                : 'border-forest/10 dark:border-neutral-800 text-forest/50 dark:text-neutral-400 hover:border-forest/20'
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weight vs Unit Toggle */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                        Pricing Type
                      </label>
                      <div className="flex items-center gap-1 rounded-2xl bg-forest/5 dark:bg-neutral-800 p-1.5 w-fit">
                        {(['unit', 'weight'] as PricingType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setPricingType(type)}
                            className={cn(
                              'rounded-xl px-6 py-2 text-sm font-bold capitalize transition-all',
                              pricingType === type
                                ? 'bg-white dark:bg-neutral-900 text-forest shadow-sm'
                                : 'text-forest/50 dark:text-neutral-400 hover:text-forest dark:hover:text-white'
                            )}
                          >
                            By {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quantity + Weight Unit */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                          Quantity {pricingType === 'weight' ? `(${weightUnit})` : '(units)'}
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={receiveQty}
                          onChange={(e) => setReceiveQty(e.target.value)}
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                          placeholder="Enter amount..."
                        />
                      </div>

                      {pricingType === 'weight' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                            Weight Unit
                          </label>
                          <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                            className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                          >
                            <option value="lbs">lbs</option>
                            <option value="oz">oz</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 rounded-[24px] bg-forest/5 dark:bg-neutral-800/50 p-5 border border-forest/5 dark:border-neutral-800">
                      <Info className="h-5 w-5 text-forest/40 shrink-0" />
                      <p className="text-xs text-forest/60 dark:text-neutral-400 font-medium leading-relaxed">
                        Adding <span className="text-forest dark:text-white font-bold">{receiveQty || '—'} {pricingType === 'weight' ? weightUnit : 'units'}</span> of{' '}
                        <span className="text-forest dark:text-white font-bold">{receiveProduct.ProductName}</span> to{' '}
                        <span className="text-forest dark:text-white font-bold">{PROGRAMS.find(p => p.value === receiveProgram)?.label}</span>.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={receiveLoading || !receiveQty}
                      className="w-full flex items-center justify-center gap-3 rounded-2xl bg-brown px-6 py-5 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95 disabled:opacity-50"
                    >
                      {receiveLoading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Adding Stock...</>
                      ) : (
                        <><Plus className="h-5 w-5" /> Confirm Stock Receipt</>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}

        {activeTab === 'relocation' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {transferSuccess && (
              <div className="flex items-center gap-3 rounded-2xl bg-green-50 dark:bg-green-900/20 p-5 border border-green-100 dark:border-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <p className="text-sm font-bold text-green-700 dark:text-green-400">Stock transferred successfully!</p>
              </div>
            )}
            {transferError && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-5 w-5 text-brown shrink-0" />
                <p className="text-sm font-bold text-brown">{transferError}</p>
              </div>
            )}

            <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm">
              <div className="flex items-center gap-5 mb-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-forest/5 text-forest">
                  <Move className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-forest dark:text-white">Transfer Stock</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">
                    Move stock between Open Market and Grocery Store programs.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTransfer} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Find Product</label>
                  <ProductSearchInput
                    selected={transferProduct}
                    onSelect={setTransferProduct}
                    onClear={() => setTransferProduct(null)}
                    placeholder="Search for a product to transfer..."
                  />
                </div>

                {transferProduct && (
                  <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">From Program</label>
                        <select
                          value={fromProgram}
                          onChange={(e) => setFromProgram(e.target.value as Program)}
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        >
                          {PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">To Program</label>
                        <select
                          value={toProgram}
                          onChange={(e) => setToProgram(e.target.value as Program)}
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        >
                          {PROGRAMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantity to Transfer</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={transferQty}
                        onChange={(e) => setTransferQty(e.target.value)}
                        className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        placeholder="Enter amount..."
                      />
                    </div>

                    <div className="flex items-center gap-4 rounded-[24px] bg-forest/5 dark:bg-neutral-800/50 p-5 border border-forest/5 dark:border-neutral-800">
                      <Info className="h-5 w-5 text-forest/40 shrink-0" />
                      <p className="text-xs text-forest/60 dark:text-neutral-400 font-medium leading-relaxed">
                        Moving <span className="text-forest dark:text-white font-bold">{transferQty || '—'} units</span> of{' '}
                        <span className="text-forest dark:text-white font-bold">{transferProduct.ProductName}</span> from{' '}
                        <span className="text-forest dark:text-white font-bold">{PROGRAMS.find(p => p.value === fromProgram)?.label}</span> to{' '}
                        <span className="text-forest dark:text-white font-bold">{PROGRAMS.find(p => p.value === toProgram)?.label}</span>.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={transferLoading || !transferQty}
                      className="w-full flex items-center justify-center gap-3 rounded-2xl bg-forest dark:bg-white px-6 py-5 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {transferLoading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Transferring...</>
                      ) : (
                        <>Confirm Transfer <ArrowRight className="h-5 w-5" /></>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add New Item Modal */}
      <AnimatePresence>
        {isAddingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingItem(false)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-forest dark:text-white">Add New Item</h2>
                <button onClick={() => setIsAddingItem(false)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90">
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              <form onSubmit={handleAddNewItem} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Item Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="e.g. Canned Corn"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Category</label>
                    <select
                      name="category"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Unit</label>
                    <input
                      name="unit"
                      type="text"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="e.g. cans, lbs, bags"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Initial Quantity</label>
                    <input
                      name="quantity"
                      type="number"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Initial Program</label>
                    <select
                      name="program"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    >
                      {PROGRAMS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Min Stock Level</label>
                    <input
                      name="minStockLevel"
                      type="number"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Cost per Unit ($)</label>
                    <input
                      name="costPerUnit"
                      type="number"
                      step="0.01"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    name="isPerishable"
                    type="checkbox"
                    className="h-5 w-5 rounded-lg border-forest/10 text-brown focus:ring-brown transition-all"
                  />
                  <label className="text-sm font-bold text-forest/60 dark:text-neutral-300">This item is perishable</label>
                </div>

                <div className="flex justify-end gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              <h2 className="text-3xl font-display font-bold text-forest dark:text-white mb-8">Edit {editingItem.name}</h2>
              <form className="space-y-8" onSubmit={handleUpdateItem}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Item Name</label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={editingItem.name}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Category</label>
                    <input
                      name="category"
                      type="text"
                      defaultValue={editingItem.category}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Min Stock Level</label>
                    <input
                      name="minStockLevel"
                      type="number"
                      defaultValue={editingItem.minStockLevel}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantities by Program</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {PROGRAMS.map(prog => (
                      <div key={prog.value} className="flex items-center justify-between p-4 rounded-[24px] border border-forest/5 bg-cream/10 dark:bg-neutral-800/50">
                        <span className="text-sm font-bold text-forest/60 dark:text-neutral-300">{prog.label}</span>
                        <input
                          name={`qty-${prog.value}`}
                          type="number"
                          min="0"
                          defaultValue={editingItem.locations[prog.value] || 0}
                          className="w-28 rounded-xl border border-forest/10 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-bold text-right focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl text-center border border-forest/5"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-brown mb-6 shadow-lg shadow-red-100">
                <Trash2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-forest dark:text-white mb-2">Delete Item?</h2>
              <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mb-10 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-forest dark:text-white">{items.find(i => i.id === itemToDelete)?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 rounded-2xl border border-forest/10 px-6 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (itemToDelete) deleteItem(itemToDelete);
                    setItemToDelete(null);
                  }}
                  className="flex-1 rounded-2xl bg-brown px-6 py-4 text-sm font-bold text-white hover:bg-brown-dark transition-all shadow-xl shadow-brown/20 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

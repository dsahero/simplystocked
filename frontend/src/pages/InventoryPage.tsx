import React, { useState, useMemo } from 'react';
import { Package, BarChart2, DollarSign, Move, TrendingUp, Search, Filter, Plus, Edit2, Trash2, ChevronRight, AlertCircle, MapPin, X, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { useInventory } from '../contexts/InventoryContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { InventoryItem } from '../types';

type TabType = 'inventory' | 'checkout' | 'relocation' | 'checklist';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const { items, locations, deleteItem, updateItem, addItem, relocateItem, checkouts, checkoutItem, submitDailyChecklist } = useInventory();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [checkingOutItem, setCheckingOutItem] = useState<InventoryItem | null>(null);

  // Checklist State
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [selectedLocationForChecklist, setSelectedLocationForChecklist] = useState<string | null>(null);
  const [checklistData, setChecklistData] = useState<{ [locId: string]: { [itemId: string]: any } }>({});

  const tabs = [
    { id: 'inventory', name: 'Inventory', icon: Package },
    { id: 'checkout', name: 'Checkouts', icon: ArrowRight },
    { id: 'relocation', name: 'Relocation', icon: Move },
    { id: 'checklist', name: 'Daily Checklist', icon: CheckCircle2 },
  ];

  const categories = useMemo(() => ['All', ...new Set(items.map(i => i.category))], [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const filteredCheckouts = useMemo(() => {
    if (showAllActivity) return checkouts;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return checkouts.filter(c => new Date(c.timestamp) >= oneWeekAgo);
  }, [checkouts, showAllActivity]);

  const handleRelocate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const itemId = formData.get('itemId') as string;
    const fromLoc = formData.get('fromLoc') as string;
    const toLoc = formData.get('toLoc') as string;
    const quantity = Number(formData.get('quantity'));

    if (itemId && fromLoc && toLoc && quantity > 0) {
      relocateItem(itemId, fromLoc, toLoc, quantity);
      (e.currentTarget as HTMLFormElement).reset();
      alert('Stock relocated successfully!');
    }
  };

  const handleAddNewItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newItem: Partial<InventoryItem> = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      minStockLevel: Number(formData.get('minStockLevel')),
      isPerishable: formData.get('isPerishable') === 'on',
      costPerUnit: Number(formData.get('costPerUnit')),
      locations: { [formData.get('location') as string]: Number(formData.get('quantity')) },
      lastRestocked: new Date().toISOString().split('T')[0],
    };
    addItem(newItem);
    setIsAddingItem(false);
  };

  const handleCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkingOutItem || !user) return;
    const formData = new FormData(e.currentTarget);
    const locationId = formData.get('location') as string;
    const quantity = Number(formData.get('quantity'));
    
    checkoutItem(checkingOutItem.id, locationId, quantity, user.id);
    setCheckingOutItem(null);
  };

  const handleUpdateItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    
    const updatedLocations: { [key: string]: number } = {};
    locations.forEach(loc => {
      const qty = formData.get(`qty-${loc.id}`);
      if (qty && Number(qty) > 0) {
        updatedLocations[loc.id] = Number(qty);
      }
    });

    updateItem(editingItem.id, {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      minStockLevel: Number(formData.get('minStockLevel')),
      locations: updatedLocations
    });
    setEditingItem(null);
  };

  const handleSubmitChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Process checkouts from checklist
    Object.entries(checklistData).forEach(([locId, data]) => {
      Object.entries(data).forEach(([itemId, qty]) => {
        if (itemId !== 'notes' && Number(qty) > 0) {
          checkoutItem(itemId, locId, Number(qty), user.id);
        }
      });
    });

    submitDailyChecklist({
      date: new Date().toISOString(),
      locationStats: Object.entries(checklistData).reduce((acc, [locId, data]) => ({
        ...acc,
        [locId]: {
          itemsTaken: Object.entries(data).reduce((sum, [k, v]) => k !== 'notes' ? sum + Number(v) : sum, 0),
          notes: data['notes'] || '',
          completedBy: user.name
        }
      }), {})
    });
    
    setChecklistData({});
    setSelectedLocationForChecklist(null);
    alert('Daily checklist submitted successfully!');
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
                              onClick={() => setCheckingOutItem(item)}
                              title="Checkout"
                              className="rounded-xl p-2.5 text-forest/30 hover:bg-brown/10 hover:text-brown transition-colors"
                            >
                              <ArrowRight className="h-5 w-5" />
                            </button>
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

        {activeTab === 'checkout' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold dark:text-white">
                  {showAllActivity ? 'All Activity' : 'Recent Activity (Past Week)'}
                </h3>
                <button 
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="text-sm font-bold text-brown hover:text-brown-dark"
                >
                  {showAllActivity ? 'Show Recent Only' : 'View All Activity'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">Quantity</th>
                      <th className="px-6 py-4">Location</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredCheckouts.map((record) => (
                      <tr key={record.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">{record.itemName}</td>
                        <td className="px-6 py-4 dark:text-neutral-300">{record.quantity}</td>
                        <td className="px-6 py-4 dark:text-neutral-300">{locations.find(l => l.id === record.locationId)?.name}</td>
                        <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">User ID: {record.userId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Locations List */}
            <div className="space-y-6">
              <h2 className="text-xl font-display font-bold text-forest dark:text-white">Select Location</h2>
              <div className="space-y-3">
                {locations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocationForChecklist(loc.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-6 rounded-[24px] border transition-all active:scale-[0.98]",
                        selectedLocationForChecklist === loc.id
                          ? "border-brown bg-brown/5 text-brown shadow-lg shadow-brown/5"
                          : "border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-forest/60 dark:text-neutral-400 hover:bg-forest/5 dark:hover:bg-neutral-800"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                          selectedLocationForChecklist === loc.id ? "bg-brown text-white" : "bg-forest/5 text-forest"
                        )}>
                          <MapPin className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg">{loc.name}</span>
                      </div>
                      <ChevronRight className={cn("h-5 w-5 transition-transform", selectedLocationForChecklist === loc.id && "translate-x-1")} />
                    </button>
                ))}
              </div>
            </div>

            {/* Location Items & Notes */}
            <div className="lg:col-span-2">
              {selectedLocationForChecklist ? (
                <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-forest dark:text-white">
                        Checklist: {locations.find(l => l.id === selectedLocationForChecklist)?.name}
                      </h2>
                      <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">Record items taken and add notes.</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-sm">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmitChecklist} className="space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Items at this location</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {items.filter(item => item.locations[selectedLocationForChecklist]).map(item => (
                          <div key={item.id} className="flex items-center justify-between p-6 rounded-[28px] border border-forest/5 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-800/30">
                            <div>
                              <p className="font-bold text-lg text-forest dark:text-white">{item.name}</p>
                              <p className="text-xs text-forest/40 dark:text-neutral-400 font-medium mt-1">
                                Available: {item.locations[selectedLocationForChecklist]} {item.unit}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="text-xs font-bold text-forest/40 uppercase tracking-widest">Taken:</label>
                              <input
                                type="number"
                                min="0"
                                max={item.locations[selectedLocationForChecklist]}
                                value={checklistData[selectedLocationForChecklist]?.[item.id] || ''}
                                onChange={(e) => setChecklistData({
                                  ...checklistData,
                                  [selectedLocationForChecklist]: {
                                    ...checklistData[selectedLocationForChecklist],
                                    [item.id]: Number(e.target.value)
                                  }
                                })}
                                className="w-24 rounded-2xl border border-forest/10 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Notes / Issues</label>
                      <textarea
                        value={checklistData[selectedLocationForChecklist]?.notes || ''}
                        onChange={(e) => setChecklistData({
                          ...checklistData,
                          [selectedLocationForChecklist]: {
                            ...checklistData[selectedLocationForChecklist],
                            notes: e.target.value
                          }
                        })}
                        className="w-full rounded-[24px] border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all resize-none"
                        placeholder="Everything looks good..."
                        rows={4}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-3 rounded-2xl bg-forest dark:bg-white px-6 py-5 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95"
                    >
                      Submit Report for {locations.find(l => l.id === selectedLocationForChecklist)?.name}
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 rounded-[40px] border-2 border-dashed border-forest/10 dark:border-neutral-800 bg-white/50">
                  <div className="h-20 w-20 rounded-[24px] bg-forest/5 flex items-center justify-center mb-6">
                    <MapPin className="h-10 w-10 text-forest/20" />
                  </div>
                  <p className="text-xl font-display font-bold text-forest/40 dark:text-neutral-400">Select a location to start the daily checklist.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'relocation' && (
          <div className="max-w-2xl mx-auto rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm">
            <div className="flex items-center gap-5 mb-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-forest/5 text-forest">
                <Move className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-forest dark:text-white">Relocate Stock</h2>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">Move items between storage locations.</p>
              </div>
            </div>

            <form onSubmit={handleRelocate} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Select Item</label>
                  <select
                    required
                    name="itemId"
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  >
                    <option value="">Select an item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.totalQuantity} {item.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">From Location</label>
                    <select
                      required
                      name="fromLoc"
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    >
                      <option value="">Select source...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">To Location</label>
                    <select
                      required
                      name="toLoc"
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    >
                      <option value="">Select destination...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantity to Move</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    placeholder="Enter amount..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-[24px] bg-forest/5 dark:bg-neutral-800/50 p-6 border border-forest/5 dark:border-neutral-800">
                <Info className="h-6 w-6 text-forest/40" />
                <p className="text-xs text-forest/60 dark:text-neutral-400 font-medium leading-relaxed">
                  Relocating items will update the inventory distribution across locations in real-time.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-forest dark:bg-white px-6 py-5 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95"
              >
                Confirm Relocation
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
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
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Initial Location</label>
                    <select
                      name="location"
                      required
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
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
                  <h3 className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantities by Location</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {locations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-4 rounded-[24px] border border-forest/5 bg-cream/10 dark:bg-neutral-800/50">
                        <div className="flex items-center gap-3 text-sm font-bold text-forest/60 dark:text-neutral-300">
                          <MapPin className="h-5 w-5 text-forest/20" />
                          {loc.name}
                        </div>
                        <input
                          name={`qty-${loc.id}`}
                          type="number"
                          defaultValue={editingItem.locations[loc.id] || 0}
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

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkingOutItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckingOutItem(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl border border-forest/5"
            >
              <h2 className="text-3xl font-display font-bold text-forest dark:text-white mb-2">Checkout Item</h2>
              <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mb-8">Recording a checkout for <span className="font-bold text-forest dark:text-white">{checkingOutItem.name}</span>.</p>
              
              <form className="space-y-6" onSubmit={handleCheckout}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">From Location</label>
                  <select
                    name="location"
                    required
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  >
                    {Object.entries(checkingOutItem.locations).map(([locId, qty]) => (
                      <option key={locId} value={locId}>
                        {locations.find(l => l.id === locId)?.name} ({qty} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    placeholder="Enter amount..."
                  />
                </div>
                <div className="flex justify-end gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setCheckingOutItem(null)}
                    className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-forest dark:bg-white px-10 py-4 text-sm font-bold text-white dark:text-neutral-900 shadow-xl shadow-forest/10 hover:bg-forest-dark dark:hover:bg-neutral-100 transition-all active:scale-95"
                  >
                    Record Checkout
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

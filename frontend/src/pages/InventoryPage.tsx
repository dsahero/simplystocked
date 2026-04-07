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
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Inventory Management</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Manage, track, and predict your food bank stock.</p>
        </div>
        <button 
          onClick={() => setIsAddingItem(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add New Item
        </button>
      </header>

      {/* Secondary Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-1 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white dark:bg-neutral-900 text-orange-600 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
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
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-3 pr-8 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="px-6 py-4">Item Name</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Total Qty</th>
                      <th className="px-6 py-4">Locations</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-neutral-900 dark:text-white">{item.name}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.unit}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "font-bold",
                            item.totalQuantity <= item.minStockLevel ? "text-orange-600" : "text-neutral-900 dark:text-white"
                          )}>
                            {item.totalQuantity}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.locations).map(([locId, qty]) => (
                              <div key={locId} className="flex items-center gap-1 rounded-md bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 text-[10px] font-medium border border-neutral-100 dark:border-neutral-700">
                                <MapPin className="h-3 w-3 text-neutral-400" />
                                <span className="dark:text-neutral-300">{locations.find(l => l.id === locId)?.name}: {qty}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.expirationDate && new Date(item.expirationDate) < new Date() ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3 w-3" />
                              Expired
                            </span>
                          ) : item.totalQuantity <= item.minStockLevel ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/20 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                              <AlertCircle className="h-3 w-3" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setCheckingOutItem(item)}
                              title="Checkout"
                              className="rounded-lg p-2 text-neutral-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setItemToDelete(item.id)}
                              className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
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
                  className="text-sm font-bold text-orange-600 hover:text-orange-700"
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
            <div className="space-y-4">
              <h2 className="text-lg font-bold dark:text-white">Select Location</h2>
              <div className="space-y-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationForChecklist(loc.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                      selectedLocationForChecklist === loc.id
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5" />
                      <span className="font-bold">{loc.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Location Items & Notes */}
            <div className="lg:col-span-2">
              {selectedLocationForChecklist ? (
                <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold dark:text-white">
                        Checklist: {locations.find(l => l.id === selectedLocationForChecklist)?.name}
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Record items taken and add notes.</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </div>

                  <form onSubmit={handleSubmitChecklist} className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Items at this location</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {items.filter(item => item.locations[selectedLocationForChecklist]).map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30">
                            <div>
                              <p className="font-bold dark:text-white">{item.name}</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Available: {item.locations[selectedLocationForChecklist]} {item.unit}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="text-xs font-bold text-neutral-500">Taken:</label>
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
                                className="w-20 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">Notes / Issues</label>
                      <textarea
                        value={checklistData[selectedLocationForChecklist]?.notes || ''}
                        onChange={(e) => setChecklistData({
                          ...checklistData,
                          [selectedLocationForChecklist]: {
                            ...checklistData[selectedLocationForChecklist],
                            notes: e.target.value
                          }
                        })}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                        placeholder="Everything looks good..."
                        rows={3}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-4 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
                    >
                      Submit Report for {locations.find(l => l.id === selectedLocationForChecklist)?.name}
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                  <MapPin className="h-12 w-12 text-neutral-300 mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400">Select a location to start the daily checklist.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'relocation' && (
          <div className="max-w-2xl mx-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600">
                <Move className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold dark:text-white">Relocate Stock</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Move items between storage locations.</p>
              </div>
            </div>

            <form onSubmit={handleRelocate} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Select Item</label>
                  <select
                    required
                    name="itemId"
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                  >
                    <option value="">Select an item...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.totalQuantity} {item.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">From Location</label>
                    <select
                      required
                      name="fromLoc"
                      className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                    >
                      <option value="">Select source...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">To Location</label>
                    <select
                      required
                      name="toLoc"
                      className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                    >
                      <option value="">Select destination...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Quantity to Move</label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    className="mt-1 w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                    placeholder="Enter amount..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 p-4 border border-neutral-100 dark:border-neutral-800">
                <Info className="h-5 w-5 text-neutral-400" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Relocating items will update the inventory distribution across locations in real-time.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-4 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
              >
                Confirm Relocation
                <ArrowRight className="h-4 w-4" />
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
              className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Add New Item</h2>
                <button onClick={() => setIsAddingItem(false)} className="rounded-lg p-2 hover:bg-neutral-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewItem} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700">Item Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="e.g. Canned Corn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Category</label>
                    <select
                      name="category"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Unit</label>
                    <input
                      name="unit"
                      type="text"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                      placeholder="e.g. cans, lbs, bags"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Initial Quantity</label>
                    <input
                      name="quantity"
                      type="number"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Initial Location</label>
                    <select
                      name="location"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Min Stock Level</label>
                    <input
                      name="minStockLevel"
                      type="number"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Cost per Unit ($)</label>
                    <input
                      name="costPerUnit"
                      type="number"
                      step="0.01"
                      required
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    name="isPerishable"
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label className="text-sm font-medium text-neutral-700">This item is perishable</label>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
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
              className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">Edit {editingItem.name}</h2>
              <form className="space-y-6" onSubmit={handleUpdateItem}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700">Item Name</label>
                    <input
                      name="name"
                      type="text"
                      defaultValue={editingItem.name}
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Category</label>
                    <input
                      name="category"
                      type="text"
                      defaultValue={editingItem.category}
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Min Stock Level</label>
                    <input
                      name="minStockLevel"
                      type="number"
                      defaultValue={editingItem.minStockLevel}
                      className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Quantities by Location</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {locations.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 bg-neutral-50/50">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          {loc.name}
                        </div>
                        <input
                          name={`qty-${loc.id}`}
                          type="number"
                          defaultValue={editingItem.locations[loc.id] || 0}
                          className="w-24 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
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
              className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-2">Checkout Item</h2>
              <p className="text-sm text-neutral-500 mb-6">Recording a checkout for <span className="font-bold text-neutral-900">{checkingOutItem.name}</span>.</p>
              
              <form className="space-y-4" onSubmit={handleCheckout}>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">From Location</label>
                  <select
                    name="location"
                    required
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    {Object.entries(checkingOutItem.locations).map(([locId, qty]) => (
                      <option key={locId} value={locId}>
                        {locations.find(l => l.id === locId)?.name} ({qty} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Enter amount..."
                  />
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setCheckingOutItem(null)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-neutral-900 px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-all"
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
              className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                <Trash2 className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Delete Item?</h2>
              <p className="text-sm text-neutral-500 mb-8">
                Are you sure you want to delete <span className="font-bold text-neutral-900">{items.find(i => i.id === itemToDelete)?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (itemToDelete) deleteItem(itemToDelete);
                    setItemToDelete(null);
                  }}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-all shadow-lg shadow-red-200"
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

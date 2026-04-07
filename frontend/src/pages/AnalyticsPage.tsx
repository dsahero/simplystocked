import React, { useState, useMemo } from 'react';
import { BarChart2, DollarSign, TrendingUp, ShoppingCart, Plus, Trash2, ArrowRight, AlertCircle, MapPin, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { useInventory } from '../contexts/InventoryContext';
import { cn } from '../lib/utils';

type TabType = 'analytics' | 'cost' | 'prediction' | 'trends' | 'buylist';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [isAddingToBuyList, setIsAddingToBuyList] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'units' });
  const { items, locations, analytics, checkouts, buyList, addToBuyList, removeFromBuyList, clearBuyList } = useInventory();

  const tabs = [
    { id: 'analytics', name: 'Analytics', icon: BarChart2 },
    { id: 'cost', name: 'Cost Analysis', icon: DollarSign },
    { id: 'prediction', name: 'Prediction', icon: TrendingUp },
    { id: 'trends', name: 'Checkout Trends', icon: ArrowRight },
    { id: 'buylist', name: 'Buy List', icon: ShoppingCart },
  ];

  const categories = useMemo(() => ['All', ...new Set(items.map(i => i.category))], [items]);

  // Suggestions for Buy List based on low stock AND popularity
  const suggestions = useMemo(() => {
    const popularity = checkouts.reduce((acc, c) => {
      acc[c.itemId] = (acc[c.itemId] || 0) + c.quantity;
      return acc;
    }, {} as { [key: string]: number });

    return items
      .map(item => {
        const demandScore = popularity[item.id] || 0;
        const stockRatio = item.totalQuantity / (item.minStockLevel || 1);
        
        // Priority score: low stock ratio + high demand
        const priority = (1 / (stockRatio + 0.1)) * (1 + demandScore / 100);
        
        return {
          ...item,
          demandScore,
          predictedNeed: Math.max(0, item.minStockLevel * 2 - item.totalQuantity),
          priority
        };
      })
      .filter(item => item.totalQuantity < item.minStockLevel * 2 || item.demandScore > 50)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }, [items, checkouts]);

  const handleAddSuggested = (item: any) => {
    addToBuyList({
      name: item.name,
      quantity: item.predictedNeed,
      unit: item.unit,
      isSuggested: true
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Analytics & Insights</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Data-driven insights for your food bank operations.</p>
      </header>

      {/* Navigation Tabs */}
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

      <div className="min-h-[400px]">
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Stock Distribution by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories.filter(c => c !== 'All').map(cat => ({
                      name: cat,
                      count: items.filter(i => i.category === cat).reduce((acc, i) => acc + i.totalQuantity, 0)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Stock by Location</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={locations.map(loc => ({
                          name: loc.name,
                          value: items.reduce((acc, item) => acc + (item.locations[loc.id] || 0), 0)
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {locations.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#ea580c', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Inventory Turnover (Daily Usage)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="usage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-6">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Inventory Value</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${items.reduce((acc, i) => acc + (i.totalQuantity * i.costPerUnit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-6">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Weekly Spending</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${analytics.reduce((acc, i) => acc + i.cost, 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 p-6">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Cost per Item</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  ${(items.reduce((acc, i) => acc + i.costPerUnit, 0) / (items.length || 1)).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Spending Trends</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="step" dataKey="cost" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Highest Value Items</h3>
                <div className="space-y-4">
                  {items
                    .sort((a, b) => (b.totalQuantity * b.costPerUnit) - (a.totalQuantity * a.costPerUnit))
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.totalQuantity} {item.unit}</p>
                        </div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">
                          ${(item.totalQuantity * item.costPerUnit).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prediction' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-bold dark:text-white">Demand Forecasting & Popularity</h2>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
                AI-driven analysis of popularity and predicted needs based on checkout trends and stock levels.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-2">
                {suggestions.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">{item.category}</span>
                      <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400">
                        {item.demandScore > 20 ? 'HIGH DEMAND' : 'PREDICTED NEED'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold dark:text-white">{item.name}</h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Current Stock</span>
                        <span className="font-bold dark:text-white">{item.totalQuantity} {item.unit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Predicted Need</span>
                        <span className="font-bold text-orange-600">+{item.predictedNeed} {item.unit}</span>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full mt-2">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (item.demandScore / 50) * 100)}%` }} />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddSuggested(item)}
                      className="mt-6 w-full rounded-xl bg-neutral-900 dark:bg-white py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                    >
                      Add to Buy List
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 dark:text-white">Popularity by Location</h3>
                  <div className="space-y-6">
                    {locations.map(loc => {
                      const topItems = checkouts
                        .filter(c => c.locationId === loc.id)
                        .reduce((acc, c) => {
                          acc[c.itemName] = (acc[c.itemName] || 0) + c.quantity;
                          return acc;
                        }, {} as { [key: string]: number });
                      
                      const sortedTop = Object.entries(topItems)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .slice(0, 3);

                      return (
                        <div key={loc.id} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                            <MapPin className="h-4 w-4 text-orange-600" />
                            {loc.name}
                          </div>
                          {sortedTop.length > 0 ? (
                            <div className="space-y-1 pl-6">
                              {sortedTop.map(([name, qty], i) => (
                                <div key={name} className="flex items-center justify-between text-xs">
                                  <span className="text-neutral-600 dark:text-neutral-400">{i + 1}. {name}</span>
                                  <span className="font-bold text-neutral-900 dark:text-white">{qty} units</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 pl-6 italic">No checkout data yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Checkout Volume by Item</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={items.map(item => ({
                    name: item.name,
                    checkouts: checkouts.filter(c => c.itemId === item.id).reduce((sum, c) => sum + c.quantity, 0)
                  })).sort((a, b) => b.checkouts - a.checkouts).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="checkouts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Recent Checkout Activity</h3>
                <div className="space-y-4">
                  {checkouts.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between border-b border-neutral-50 dark:border-neutral-800 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{record.itemName}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {record.quantity} units from {locations.find(l => l.id === record.locationId)?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-neutral-400">{new Date(record.timestamp).toLocaleTimeString()}</p>
                        <p className="text-xs font-medium text-neutral-500">{new Date(record.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Usage by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories.filter(c => c !== 'All').map(cat => ({
                          name: cat,
                          value: checkouts.filter(c => {
                            const item = items.find(i => i.id === c.itemId);
                            return item?.category === cat;
                          }).reduce((sum, c) => sum + c.quantity, 0)
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buylist' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold dark:text-white">Shopping Buy List</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Items needed for restock.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsAddingToBuyList(true)}
                  className="flex items-center gap-2 rounded-xl bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
                <button 
                  onClick={clearBuyList}
                  className="text-sm font-bold text-red-600 hover:text-red-700 px-2"
                >
                  Clear List
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isAddingToBuyList && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm mb-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Add Manual Item</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase">Item Name</label>
                        <input
                          type="text"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="e.g. Tomato Soup"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase">Quantity</label>
                        <input
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                          placeholder="0"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase">Unit</label>
                        <input
                          type="text"
                          value={newItem.unit}
                          onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                          placeholder="e.g. cans"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={() => setIsAddingToBuyList(false)}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newItem.name && newItem.quantity) {
                            addToBuyList({
                              name: newItem.name,
                              quantity: Number(newItem.quantity),
                              unit: newItem.unit
                            });
                            setNewItem({ name: '', quantity: '', unit: 'units' });
                            setIsAddingToBuyList(false);
                          }
                        }}
                        className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors"
                      >
                        Add to List
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Items</p>
                    <p className="text-xl font-bold dark:text-white">{buyList.length}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Suggested</p>
                    <p className="text-xl font-bold text-orange-600">{buyList.filter(i => i.isSuggested).length}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Manual</p>
                    <p className="text-xl font-bold text-blue-600">{buyList.filter(i => !i.isSuggested).length}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Est. Priority</p>
                    <p className="text-xl font-bold text-green-600">High</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {buyList.length > 0 ? (
                      buyList.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:border-orange-200 dark:hover:border-orange-900/30 transition-colors group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                              item.isSuggested 
                                ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40" 
                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                            )}>
                              <ShoppingCart className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold dark:text-white">{item.name}</p>
                                {item.isSuggested && (
                                  <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-[8px] font-bold text-orange-700 dark:text-orange-400 uppercase">AI Suggested</span>
                                )}
                              </div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {item.quantity} {item.unit} • Added {new Date(item.addedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => removeFromBuyList(item.id)}
                              className="rounded-xl p-2.5 text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
                              title="Remove from list"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20"
                      >
                        <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-6 mb-4">
                          <ShoppingCart className="h-12 w-12 text-neutral-300" />
                        </div>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">Your buy list is empty</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Add items manually or use AI suggestions below.</p>
                        <button
                          onClick={() => setIsAddingToBuyList(true)}
                          className="mt-6 rounded-xl bg-neutral-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                        >
                          Add Your First Item
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 dark:text-white">Suggestions</h3>
                  <div className="space-y-4">
                    {suggestions.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold dark:text-white">{item.name}</p>
                          <span className="text-[10px] font-bold text-orange-600">LOW STOCK</span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                          Current: {item.totalQuantity} {item.unit}
                        </p>
                        <button 
                          onClick={() => handleAddSuggested(item)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white hover:bg-orange-700 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          Add {item.predictedNeed} {item.unit}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

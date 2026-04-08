import React, { useState, useMemo, useEffect } from 'react';
import { BarChart2, DollarSign, TrendingUp, ShoppingCart, Plus, Trash2, ArrowRight, AlertCircle, MapPin, CheckCircle2, Sparkles, Download, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { useInventory } from '../contexts/InventoryContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

type TabType = 'analytics' | 'cost' | 'prediction' | 'trends' | 'buylist';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [isAddingToBuyList, setIsAddingToBuyList] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'units' });
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  
  const { items, locations, analytics, checkouts, buyList, addToBuyList, removeFromBuyList, clearBuyList, getAIInsights, seedTestData } = useInventory();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (activeTab === 'prediction' && !aiInsights) {
      fetchInsights();
    }
  }, [activeTab]);

  useEffect(() => {
    if (seedError) {
      const timer = setTimeout(() => setSeedError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [seedError]);

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const insights = await getAIInsights();
      setAiInsights(insights);
    } catch (err) {
      setAiInsights("Unable to load insights.");
    } finally {
      setIsLoadingInsights(false);
    }
  };

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
      .filter(item => (item.totalQuantity < item.minStockLevel * 2 || item.demandScore > 50) && !buyList.some(bi => bi.name === item.name))
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
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Analytics & Insights</h1>
          <p className="text-forest/60 dark:text-neutral-400">Data-driven insights for your food bank operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={async () => {
                setSeedError(null);
                setIsSeeding(true);
                try {
                  await seedTestData();
                } catch (err) {
                  setSeedError(err instanceof Error ? err.message : 'Seeding failed');
                } finally {
                  setIsSeeding(false);
                }
              }}
              disabled={isSeeding}
              className="flex items-center gap-2 rounded-2xl bg-brown/10 dark:bg-brown/20 px-6 py-3 text-sm font-bold text-brown hover:bg-brown/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-5 w-5", isSeeding && "animate-spin")} />
              {isSeeding ? 'Seeding...' : 'Seed Test Data'}
            </button>
            
            <AnimatePresence>
              {seedError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-64 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-xs font-bold text-red-600 border border-red-100 dark:border-red-900/30 z-50 shadow-xl"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {seedError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => {
              const report = `SimplyStocked Inventory Report - ${new Date().toLocaleDateString()}\n\n` +
                `Total Items: ${items.length}\n` +
                `Total Value: $${items.reduce((acc, i) => acc + (i.totalQuantity * i.costPerUnit), 0).toFixed(2)}\n` +
                `Low Stock Items: ${items.filter(i => i.totalQuantity < i.minStockLevel).length}\n\n` +
                `Buy List:\n${buyList.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n')}`;
              
              const blob = new Blob([report], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `simplystocked-report-${new Date().toISOString().split('T')[0]}.txt`;
              a.click();
            }}
            className="flex items-center gap-2 rounded-2xl bg-forest/5 dark:bg-neutral-800 px-6 py-3 text-sm font-bold text-forest dark:text-white hover:bg-forest/10 transition-all active:scale-95"
          >
            <Download className="h-5 w-5" />
            Export Report
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-1.5 no-scrollbar border border-forest/5">
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

      <div className="min-h-[400px]">
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Stock Distribution by Category</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories.filter(c => c !== 'All').map(cat => ({
                      name: cat,
                      count: items.filter(i => i.category === cat).reduce((acc, i) => acc + i.totalQuantity, 0)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                      <Tooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#5c4033" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Stock by Location</h3>
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
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {locations.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#5c4033', '#1B4332', '#A7C957', '#F2E8CF'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Inventory Turnover (Daily Usage)</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics}>
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4332" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1B4332" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="usage" stroke="#1B4332" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cost' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-8 border border-forest/5">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Total Inventory Value</p>
                <p className="text-3xl font-display font-bold text-forest dark:text-white">
                  ${items.reduce((acc, i) => acc + (i.totalQuantity * i.costPerUnit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-8 border border-forest/5">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Weekly Spending</p>
                <p className="text-3xl font-display font-bold text-forest dark:text-white">
                  ${analytics.reduce((acc, i) => acc + i.cost, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-8 border border-forest/5">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Avg Cost per Item</p>
                <p className="text-3xl font-display font-bold text-forest dark:text-white">
                  ${(items.reduce((acc, i) => acc + i.costPerUnit, 0) / (items.length || 1)).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Spending Trends</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      <Area type="step" dataKey="cost" stroke="#1B4332" strokeWidth={3} fill="#1B4332" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Highest Value Items</h3>
                <div className="space-y-6">
                  {items
                    .sort((a, b) => (b.totalQuantity * b.costPerUnit) - (a.totalQuantity * a.costPerUnit))
                    .slice(0, 5)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-bold text-forest dark:text-white group-hover:text-brown transition-colors">{item.name}</p>
                          <p className="text-xs text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest">{item.totalQuantity} {item.unit}</p>
                        </div>
                        <p className="text-sm font-bold text-forest dark:text-white">
                          ${(item.totalQuantity * item.costPerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prediction' && (
          <div className="space-y-8">
            <div className="rounded-[40px] border border-brown/10 dark:border-brown/30 bg-brown/5 dark:bg-brown/10 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Sparkles className="h-32 w-32 text-brown" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-[20px] bg-brown p-3 text-white">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-forest dark:text-white">AI Inventory Insights</h2>
                  </div>
                  <button 
                    onClick={fetchInsights}
                    disabled={isLoadingInsights}
                    className="rounded-xl p-2 hover:bg-brown/10 text-brown transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-5 w-5", isLoadingInsights && "animate-spin")} />
                  </button>
                </div>
                
                {isLoadingInsights ? (
                  <div className="flex items-center gap-3 text-brown font-bold animate-pulse">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Analyzing inventory patterns...
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-forest/80 dark:text-neutral-300 font-medium">
                    <Markdown>{aiInsights}</Markdown>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 grid grid-cols-1 gap-8 md:grid-cols-2">
                {suggestions.map((item) => (
                  <div key={item.id} className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm group hover:border-brown/20 transition-all">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-forest/40">{item.category}</span>
                      <span className="rounded-full bg-brown/10 px-3 py-1 text-[8px] font-bold text-brown uppercase tracking-widest">
                        {item.demandScore > 20 ? 'HIGH DEMAND' : 'PREDICTED NEED'}
                      </span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-forest dark:text-white group-hover:text-brown transition-colors">{item.name}</h3>
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Current Stock</span>
                        <span className="font-bold text-forest dark:text-white">{item.totalQuantity} {item.unit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Predicted Need</span>
                        <span className="font-bold text-brown">+{item.predictedNeed} {item.unit}</span>
                      </div>
                      <div className="w-full bg-forest/5 dark:bg-neutral-800 h-2.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-brown h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (item.demandScore / 50) * 100)}%` }} />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddSuggested(item)}
                      className="mt-8 w-full rounded-2xl bg-forest dark:bg-white py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95"
                    >
                      Add to Buy List
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-8 text-forest dark:text-white">Popularity by Location</h3>
                  <div className="space-y-8">
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
                        <div key={loc.id} className="space-y-4">
                          <div className="flex items-center gap-3 text-sm font-bold text-forest dark:text-white">
                            <div className="rounded-xl bg-brown/10 p-2">
                              <MapPin className="h-4 w-4 text-brown" />
                            </div>
                            {loc.name}
                          </div>
                          {sortedTop.length > 0 ? (
                            <div className="space-y-3 pl-11">
                              {sortedTop.map(([name, qty], i) => (
                                <div key={name} className="flex items-center justify-between text-xs">
                                  <span className="text-forest/60 dark:text-neutral-400 font-medium">{i + 1}. {name}</span>
                                  <span className="font-bold text-forest dark:text-white">{qty} units</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-forest/30 pl-11 italic font-medium">No checkout data yet</p>
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
          <div className="space-y-8">
            <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
              <h3 className="text-lg font-bold mb-8 text-forest dark:text-white">Checkout Volume by Item</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={items.map(item => ({
                    name: item.name,
                    checkouts: checkouts.filter(c => c.itemId === item.id).reduce((sum, c) => sum + c.quantity, 0)
                  })).sort((a, b) => b.checkouts - a.checkouts).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                    <Bar dataKey="checkouts" fill="#A7C957" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-8 text-forest dark:text-white">Recent Checkout Activity</h3>
                <div className="space-y-6">
                  {checkouts.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between border-b border-forest/5 dark:border-neutral-800 pb-6 last:border-0 last:pb-0 group">
                      <div className="flex items-center gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-forest/5 dark:bg-neutral-800 text-forest group-hover:bg-forest group-hover:text-white transition-all duration-300">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-forest dark:text-white group-hover:text-brown transition-colors">{record.itemName}</p>
                          <p className="text-xs text-forest/40 dark:text-neutral-400 font-medium">
                            {record.quantity} units from <span className="font-bold">{locations.find(l => l.id === record.locationId)?.name}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">{new Date(record.timestamp).toLocaleTimeString()}</p>
                        <p className="text-xs font-bold text-forest/20">{new Date(record.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                <h3 className="text-lg font-bold mb-8 text-forest dark:text-white">Usage by Category</h3>
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
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {categories.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={['#5c4033', '#1B4332', '#A7C957', '#F2E8CF', '#6A994E'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'buylist' && (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-display font-bold text-forest dark:text-white">Shopping Buy List</h2>
                <p className="text-sm text-forest/60 dark:text-neutral-400">Items needed for restock.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAddingToBuyList(true)}
                  className="flex items-center gap-2 rounded-2xl bg-forest dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 transition-all active:scale-95 shadow-xl shadow-forest/10"
                >
                  <Plus className="h-5 w-5" />
                  Add Item
                </button>
                <button 
                  onClick={clearBuyList}
                  className="text-sm font-bold text-brown hover:text-red-700 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
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
                  <div className="rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm mb-8">
                    <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">Add Manual Item</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Item Name</label>
                        <input
                          type="text"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="e.g. Tomato Soup"
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Quantity</label>
                        <input
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                          placeholder="0"
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Unit</label>
                        <input
                          type="text"
                          value={newItem.unit}
                          onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                          placeholder="e.g. cans"
                          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-4">
                      <button
                        onClick={() => setIsAddingToBuyList(false)}
                        className="rounded-2xl px-6 py-3 text-sm font-bold text-forest/40 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-colors"
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
                        className="rounded-2xl bg-brown px-8 py-3 text-sm font-bold text-white hover:bg-brown-dark shadow-xl shadow-brown/20 transition-all active:scale-95"
                      >
                        Add to List
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Total Items</p>
                    <p className="text-2xl font-display font-bold text-forest dark:text-white">{buyList.length}</p>
                  </div>
                  <div className="rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Suggested</p>
                    <p className="text-2xl font-display font-bold text-brown">{buyList.filter(i => i.isSuggested).length}</p>
                  </div>
                  <div className="rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Manual</p>
                    <p className="text-2xl font-display font-bold text-forest">{buyList.filter(i => !i.isSuggested).length}</p>
                  </div>
                  <div className="rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Est. Priority</p>
                    <p className="text-2xl font-display font-bold text-forest">High</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {buyList.length > 0 ? (
                      buyList.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center justify-between p-6 rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:border-brown/20 dark:hover:border-brown/30 transition-all group"
                        >
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "flex h-14 w-14 items-center justify-center rounded-[20px] transition-all duration-500",
                              item.isSuggested 
                                ? "bg-brown/5 text-brown group-hover:bg-brown group-hover:text-white" 
                                : "bg-forest/5 text-forest group-hover:bg-forest group-hover:text-white"
                            )}>
                              <ShoppingCart className="h-7 w-7" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <p className="text-lg font-bold text-forest dark:text-white">{item.name}</p>
                                {item.isSuggested && (
                                  <span className="rounded-full bg-brown/10 px-3 py-1 text-[8px] font-bold text-brown uppercase tracking-widest">AI Suggested</span>
                                )}
                              </div>
                              <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">
                                {item.quantity} {item.unit} • Added {new Date(item.addedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => removeFromBuyList(item.id)}
                              className="rounded-2xl p-3 text-forest/20 hover:bg-red-50 hover:text-brown transition-all active:scale-90"
                              title="Remove from list"
                            >
                              <Trash2 className="h-6 w-6" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-24 rounded-[40px] border-2 border-dashed border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-900/20"
                      >
                        <div className="rounded-[32px] bg-white dark:bg-neutral-800 p-8 shadow-xl shadow-forest/5 mb-6">
                          <ShoppingCart className="h-16 w-16 text-forest/20" />
                        </div>
                        <p className="text-2xl font-display font-bold text-forest dark:text-white">Your buy list is empty</p>
                        <p className="text-sm text-forest/40 dark:text-neutral-400 mt-2 font-medium">Add items manually or use AI suggestions below.</p>
                        <button
                          onClick={() => setIsAddingToBuyList(true)}
                          className="mt-8 rounded-2xl bg-forest dark:bg-white px-8 py-3 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95"
                        >
                          Add Your First Item
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-8">
                <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 text-forest dark:text-white">AI Suggestions</h3>
                  <div className="space-y-4">
                    {suggestions.map(item => (
                      <div key={item.id} className="p-5 rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-800/50 hover:border-brown/20 transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-forest dark:text-white">{item.name}</p>
                          <span className="text-[10px] font-bold text-brown uppercase tracking-widest">LOW STOCK</span>
                        </div>
                        <p className="text-xs text-forest/40 dark:text-neutral-400 mb-4 font-medium">
                          Current: {item.totalQuantity} {item.unit}
                        </p>
                        <button 
                          onClick={() => handleAddSuggested(item)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brown px-4 py-2.5 text-xs font-bold text-white hover:bg-brown-dark shadow-lg shadow-brown/10 transition-all active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
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

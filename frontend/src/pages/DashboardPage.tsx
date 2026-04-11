import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, TrendingUp, X, Clock, DollarSign, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { getDashboardStats, getStockTrends, DashboardStats, StockTrendPoint } from '../api/analytics';
import { getDailyActivity, DailyActivity } from '../api/team';
import { Loader2 } from 'lucide-react';

const C = { brown: '#5c4033', forest: '#4a5d3f', sage: '#8ba888' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [stockTrends, setStockTrends] = useState<StockTrendPoint[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [trendDays, setTrendDays] = useState(30);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [dash, trends, act] = await Promise.all([
          getDashboardStats(),
          getStockTrends(undefined, 30),
          getDailyActivity(),
        ]);
        setDashboard(dash);
        setStockTrends(trends);
        setActivity(act);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadTrends = async (days: number) => {
    setTrendDays(days);
    try {
      setStockTrends(await getStockTrends(undefined, days));
    } catch { /* ignore */ }
  };

  const cp = dashboard?.latest_checkpoint;

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return [
      { name: 'Total Items in Stock', value: dashboard.total_stock ?? 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${dashboard.total_products} products` },
      { name: 'Low Stock Alerts', value: dashboard.low_stock_count ?? 0, icon: AlertTriangle, color: 'text-brown', bg: 'bg-brown/5', sub: `${dashboard.total_products - (dashboard.low_stock_count ?? 0)} well stocked` },
      { name: 'Total Transactions', value: dashboard.total_transactions ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', sub: `$${(dashboard.total_transaction_value ?? 0).toLocaleString(undefined, {maximumFractionDigits: 0})} distributed` },
    ];
  }, [dashboard]);

  const recentActivity = useMemo(() => activity.slice(0, 8), [activity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-brown" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-display font-bold tracking-tight text-forest dark:text-white"
        >
          {greeting}, {user?.name}!
        </motion.h1>
        <p className="mt-2 text-forest/60 dark:text-neutral-400 font-medium">
          Here is what's happening with SimplyStocked today.
        </p>
      </header>

      {/* Banner Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative h-64 w-full overflow-hidden rounded-[48px] shadow-2xl shadow-forest/10"
      >
        <img
          src="/icons/banner.jpg"
          alt="Banner"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/inventory/1200/400';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest/80 to-transparent flex flex-col justify-center px-12">
          <h2 className="text-4xl font-display font-bold text-white max-w-md leading-tight">
            Streamline Your Food Bank Inventory
          </h2>
          <p className="mt-4 text-white/80 font-medium max-w-sm">
            Real-time tracking, predictive analytics, and seamless distribution management.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-[32px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className={cn("rounded-[20px] p-4 w-fit", stat.bg)}>
              <stat.icon className={cn("h-7 w-7", stat.color)} />
            </div>
            <div className="mt-6">
              <h3 className="text-xs font-bold text-forest/40 uppercase tracking-widest">{stat.name}</h3>
              <p className="mt-1 text-3xl font-display font-bold text-forest dark:text-white">{stat.value.toLocaleString()}</p>
              {stat.sub && <p className="text-xs text-forest/40 dark:text-neutral-500 font-medium mt-1">{stat.sub}</p>}
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-forest/5 group-hover:bg-brown transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* Summary cards — always shown using live data */}
      {dashboard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[28px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-amber-50 text-amber-600"><DollarSign className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Total Spending</p>
                <p className="text-lg font-display font-bold text-forest dark:text-white">${(dashboard.total_invoice_spending ?? 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                <p className="text-xs text-forest/40 font-medium">{dashboard.total_invoices ?? 0} invoices</p>
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-teal-50 text-teal-600"><TrendingUp className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Distribution Value</p>
                <p className="text-lg font-display font-bold text-forest dark:text-white">${(dashboard.total_transaction_value ?? 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                <p className="text-xs text-forest/40 font-medium">{dashboard.total_transactions ?? 0} transactions</p>
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-purple-50 text-purple-600"><Truck className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Vendors</p>
                <p className="text-lg font-display font-bold text-forest dark:text-white">{dashboard.vendor_count ?? 0}</p>
                <p className="text-xs text-forest/40 font-medium">{dashboard.total_products} products tracked</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-display font-bold text-forest dark:text-white">Inventory Trends</h2>
            <select
              value={trendDays}
              onChange={(e) => reloadTrends(Number(e.target.value))}
              className="text-xs font-bold border-none bg-forest/5 dark:bg-neutral-800 rounded-xl px-4 py-2 focus:ring-4 focus:ring-forest/5 transition-all text-forest dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTrends}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.brown} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.brown} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.forest} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.forest} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.sage} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.sage} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis
                  dataKey="SnapshotDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="Quantity" name="Total" stroke={C.brown} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="OpenMarketQuantity" name="Open Market" stroke={C.forest} strokeWidth={2} fillOpacity={1} fill="url(#colorOM)" />
                <Area type="monotone" dataKey="GroceryStoreQuantity" name="Grocery" stroke={C.sage} strokeWidth={2} fillOpacity={1} fill="url(#colorGS)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <h2 className="text-xl font-display font-bold text-forest dark:text-white mb-8">Recent Activity</h2>
          <div className="space-y-6">
            {recentActivity.length > 0 ? recentActivity.map((act, i) => (
              <div key={`${act.TransactionDate}-${act.Username}-${i}`} className="flex items-start gap-4 group">
                <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brown shadow-lg shadow-brown/40 group-hover:scale-125 transition-transform shrink-0" />
                <div>
                  <p className="text-sm font-medium text-forest dark:text-white leading-relaxed">
                    <span className="font-bold">{act.Username}</span> distributed <span className="font-bold">{act.items_distributed} items</span> across {act.transaction_count} txn{act.transaction_count !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">
                    {new Date(act.TransactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${act.total_value.toFixed(2)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10">
                <Clock className="h-10 w-10 text-forest/10 mx-auto mb-4" />
                <p className="text-sm font-bold text-forest/40">No recent activity</p>
              </div>
            )}
          </div>
          {activity.length > 8 && (
            <button
              onClick={() => setIsActivityModalOpen(true)}
              className="mt-8 w-full rounded-2xl border-2 border-forest/5 py-4 text-sm font-bold text-forest hover:bg-forest hover:text-white hover:border-forest transition-all duration-300 active:scale-95"
            >
              View All Activity
            </button>
          )}
        </div>
      </div>

      {/* Activity Modal */}
      <AnimatePresence>
        {isActivityModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsActivityModalOpen(false)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl border border-forest/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-forest dark:text-white">All Activity</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">Daily distribution log across all team members.</p>
                </div>
                <button
                  onClick={() => setIsActivityModalOpen(false)}
                  className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              <div className="space-y-6">
                {activity.map((act, i) => (
                  <div key={`${act.TransactionDate}-${act.Username}-${i}`} className="flex items-start gap-4 group">
                    <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brown shadow-lg shadow-brown/40 group-hover:scale-125 transition-transform shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-forest dark:text-white leading-relaxed">
                          <span className="font-bold">{act.Username}</span> distributed <span className="font-bold">{act.items_distributed} items</span>
                        </p>
                        <span className="text-[10px] font-bold text-forest/20 dark:text-neutral-600 uppercase tracking-widest">
                          ${act.total_value.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">
                        {new Date(act.TransactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {act.transaction_count} transactions
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-forest/5">
                <button
                  onClick={() => setIsActivityModalOpen(false)}
                  className="w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 transition-all active:scale-95"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

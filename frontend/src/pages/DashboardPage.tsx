import React, { useMemo, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { items, analytics, checkouts } = useInventory();
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const stats = useMemo(() => {
    const totalItems = items.reduce((acc, item) => acc + item.totalQuantity, 0);
    const lowStockItems = items.filter(item => item.totalQuantity <= item.minStockLevel).length;
    const expiredItems = items.filter(item => item.expirationDate && new Date(item.expirationDate) < new Date()).length;
    const weeklyUsage = analytics.reduce((acc, curr) => acc + curr.usage, 0);

    return [
      { name: 'Total Items in Stock', value: totalItems, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%', trendUp: true },
      { name: 'Low Stock Alerts', value: lowStockItems, icon: AlertTriangle, color: 'text-brown', bg: 'bg-brown/5', trend: '-2', trendUp: false },
      { name: 'Recently Expired', value: expiredItems, icon: Calendar, color: 'text-red-600', bg: 'bg-red-50', trend: '0', trendUp: true },
      { name: 'Weekly Usage', value: weeklyUsage, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', trend: '+5%', trendUp: true },
    ];
  }, [items, analytics]);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-[32px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-[20px] p-4", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                stat.trendUp ? "text-green-600 bg-green-50" : "text-brown bg-red-50"
              )}>
                {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-xs font-bold text-forest/40 uppercase tracking-widest">{stat.name}</h3>
              <p className="mt-1 text-3xl font-display font-bold text-forest dark:text-white">{stat.value.toLocaleString()}</p>
            </div>
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-forest/5 group-hover:bg-brown transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-display font-bold text-forest dark:text-white">Inventory Trends</h2>
            <select className="text-xs font-bold border-none bg-forest/5 dark:bg-neutral-800 rounded-xl px-4 py-2 focus:ring-4 focus:ring-forest/5 transition-all text-forest">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics}>
                <defs>
                  <linearGradient id="colorInStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5c4033" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#5c4033" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }}
                  tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { weekday: 'short' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#1B4332' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inStock" 
                  stroke="#5c4033" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorInStock)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <h2 className="text-xl font-display font-bold text-forest dark:text-white mb-8">Recent Activity</h2>
          <div className="space-y-8">
            {checkouts.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-start gap-5 group">
                <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brown shadow-lg shadow-brown/40 group-hover:scale-125 transition-transform" />
                <div>
                  <p className="text-sm font-medium text-forest dark:text-white leading-relaxed">
                    <span className="font-bold text-forest">Staff</span> checked out <span className="font-bold">{activity.quantity} {activity.itemName}</span>
                  </p>
                  <p className="text-xs text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {checkouts.length === 0 && (
              <div className="text-center py-10">
                <Clock className="h-10 w-10 text-forest/10 mx-auto mb-4" />
                <p className="text-sm font-bold text-forest/40">No recent activity</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsActivityModalOpen(true)}
            className="mt-10 w-full rounded-2xl border-2 border-forest/5 py-4 text-sm font-bold text-forest hover:bg-forest hover:text-white hover:border-forest transition-all duration-300 active:scale-95"
          >
            View All Activity
          </button>
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
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-forest dark:text-white">All Activity</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">A complete history of inventory changes.</p>
                </div>
                <button 
                  onClick={() => setIsActivityModalOpen(false)} 
                  className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-8">
                  {checkouts.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-5 group">
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-brown shadow-lg shadow-brown/40 group-hover:scale-125 transition-transform" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-forest dark:text-white leading-relaxed">
                            <span className="font-bold text-forest">Staff</span> checked out <span className="font-bold">{activity.quantity} {activity.itemName}</span>
                          </p>
                          <span className="text-[10px] font-bold text-forest/20 dark:text-neutral-600 uppercase tracking-widest">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-forest/40 dark:text-neutral-400 font-bold uppercase tracking-widest mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {checkouts.length === 0 && (
                    <div className="text-center py-20">
                      <Clock className="h-16 w-16 text-forest/5 mx-auto mb-6" />
                      <p className="text-xl font-display font-bold text-forest/20">No activity recorded yet</p>
                    </div>
                  )}
                </div>
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

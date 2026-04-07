import React, { useMemo } from 'react';
import { Package, AlertTriangle, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { cn } from '../lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { items, analytics } = useInventory();

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
      { name: 'Low Stock Alerts', value: lowStockItems, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', trend: '-2', trendUp: false },
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
          className="text-3xl font-bold tracking-tight text-neutral-900"
        >
          {greeting}, {user?.name}!
        </motion.h1>
        <p className="mt-1 text-neutral-500">
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
            className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-2xl p-3", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                stat.trendUp ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
              )}>
                {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-neutral-500">{stat.name}</h3>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stat.value.toLocaleString()}</p>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-full bg-neutral-100 group-hover:bg-orange-500 transition-colors" />
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Inventory Trends</h2>
            <select className="text-sm border-none bg-neutral-50 rounded-lg px-2 py-1 focus:ring-0">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics}>
                <defs>
                  <linearGradient id="colorInStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#737373' }}
                  tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { weekday: 'short' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#737373' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="inStock" 
                  stroke="#ea580c" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorInStock)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Recent Activity</h2>
          <div className="space-y-6">
            {[
              { action: 'Restocked', item: 'Canned Beans', time: '2 hours ago', user: 'Alex' },
              { action: 'Relocated', item: 'Fresh Apples', time: '4 hours ago', user: 'Sarah' },
              { action: 'Updated', item: 'Whole Milk', time: 'Yesterday', user: 'Mike' },
              { action: 'Deleted', item: 'Expired Bread', time: '2 days ago', user: 'Alex' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    <span className="font-bold">{activity.user}</span> {activity.action} {activity.item}
                  </p>
                  <p className="text-xs text-neutral-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-8 w-full rounded-xl border border-neutral-200 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}

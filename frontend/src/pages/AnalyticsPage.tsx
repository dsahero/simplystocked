import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Loader2, TrendingUp, Package, AlertTriangle, DollarSign, Users, Trash2, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getDashboardStats, getStockTrends, getReceivedVsDistributed,
  getDistributionByCategory,
  getDistributionOverTime, getWasteSummary, getTopProducts,
  getVendorSpending, getProgramComparison, getCheckpointTrends,
  DashboardStats, StockTrendPoint, ReceivedVsDistributed, CategoryDistribution,
  DistributionPeriod, WasteSummary, TopProduct,
  VendorSpending, ProgramComparison, CheckpointStats,
} from '../api/analytics';
import { getAllProducts, ApiProduct } from '../api/products';
import { getAllCategories, ApiCategory } from '../api/categories';

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  brown: '#5c4033',
  forest: '#4a5d3f',
  sage: '#8ba888',
  blue: '#3b82f6',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  teal: '#14b8a6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
};

const CATEGORY_COLORS = [C.brown, C.forest, C.sage, C.blue, C.green, C.amber, C.teal, C.purple, C.red, C.pink, C.cyan];
const WASTE_COLORS: Record<string, string> = { spoiled: C.amber, expired: C.red, pest_damage: C.purple, damaged: C.brown };

// ── Shared chart config ──────────────────────────────────────────────────────
const AXIS_TICK = { fontSize: 10, fontWeight: 700, fill: '#1B4332' };
const GRID_PROPS = { strokeDasharray: '3 3', vertical: false, stroke: '#f0f0f0' } as const;
const TT_STYLE = { borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)', fontSize: 12, fontWeight: 600 };

// ── Stat card ────────────────────────────────────────────────────────────────
function Stat({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: typeof Package; color: string; sub?: string;
}) {
  return (
    <div className="rounded-[28px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px]', color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-forest/40 dark:text-neutral-500 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-display font-bold text-forest dark:text-white">{value}</p>
          {sub && <p className="text-xs text-forest/40 dark:text-neutral-500 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Chart card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, span = 1, children, action }: {
  title: string; span?: 1 | 2; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm',
      span === 2 && 'lg:col-span-2'
    )}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-bold text-forest dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [stockTrends, setStockTrends] = useState<StockTrendPoint[]>([]);
  const [catDist, setCatDist] = useState<CategoryDistribution[]>([]);
  const [distTime, setDistTime] = useState<DistributionPeriod[]>([]);
  const [waste, setWaste] = useState<WasteSummary | null>(null);
  const [topProds, setTopProds] = useState<TopProduct[]>([]);
  const [vendorSpend, setVendorSpend] = useState<VendorSpending[]>([]);
  const [programCmp, setProgramCmp] = useState<ProgramComparison | null>(null);
  const [cpTrends, setCpTrends] = useState<CheckpointStats[]>([]);

  // Stock trend controls (by product)
  const [trendDays, setTrendDays] = useState(90);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [trendProductId, setTrendProductId] = useState<number | ''>('');

  // Received vs Distributed
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [recvDist, setRecvDist] = useState<ReceivedVsDistributed[]>([]);
  const [recvDistCategoryId, setRecvDistCategoryId] = useState<number | ''>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [dash, st, cd, dt, ws, tp, vs, pc, ct, prods, cats, rd] = await Promise.all([
          getDashboardStats(),
          getStockTrends(undefined, 90),
          getDistributionByCategory(),
          getDistributionOverTime(),
          getWasteSummary(),
          getTopProducts(10),
          getVendorSpending(),
          getProgramComparison(),
          getCheckpointTrends(),
          getAllProducts(),
          getAllCategories(),
          getReceivedVsDistributed(),
        ]);
        setDashboard(dash);
        setStockTrends(st);
        setCatDist(cd);
        setDistTime(dt);
        setWaste(ws);
        setTopProds(tp);
        setVendorSpend(vs);
        setProgramCmp(pc);
        setCpTrends(ct);
        setProducts(prods);
        setCategories(cats);
        setRecvDist(rd);
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reload stock trends when filters change
  const reloadTrends = async (pid: number | '', days: number) => {
    try {
      const data = await getStockTrends(pid || undefined, days);
      setStockTrends(data);
    } catch { /* ignore */ }
  };

  const reloadRecvDist = async (cid: number | '') => {
    try {
      setRecvDist(await getReceivedVsDistributed(cid || undefined));
    } catch { /* ignore */ }
  };

  // Format received vs distributed for chart
  const recvDistChartData = recvDist.map(r => {
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    return {
      startLabel: fmt(r.StartDate),
      endLabel: fmt(r.EndDate),
      Received: r.units_received,
      Distributed: r.units_distributed,
      net: r.units_received - r.units_distributed,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-brown" />
      </div>
    );
  }

  const cp = dashboard?.latest_checkpoint;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Analytics</h1>
        <p className="text-forest/60 dark:text-neutral-400">Data-driven insights across inventory, distribution, waste, and spending.</p>
      </header>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Stock" value={dashboard?.total_stock?.toLocaleString() ?? '—'} icon={Package} color="bg-forest/10 text-forest" sub={`${dashboard?.total_products ?? 0} products`} />
        <Stat label="Low Stock" value={dashboard?.low_stock_count ?? '—'} icon={AlertTriangle} color="bg-brown/10 text-brown" sub={cp ? `${cp.LowStockAlerts} at period end` : undefined} />
        <Stat label="Distributed" value={cp?.ItemsDistributed?.toLocaleString() ?? '—'} icon={TrendingUp} color="bg-green-50 text-green-600" sub={cp ? `${cp.TransactionCount} transactions` : 'current period'} />
        <Stat label="Waste" value={cp?.ItemsWasted ?? waste?.total_units ?? '—'} icon={Trash2} color="bg-red-50 text-red-600" sub={waste ? `$${waste.total_cost.toFixed(2)} est. cost` : undefined} />
      </div>

      {/* ── Second row stats ───────────────────────────────────────────── */}
      {cp && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Period Spending" value={`$${cp.TotalSpent.toFixed(0)}`} icon={DollarSign} color="bg-amber-50 text-amber-600" sub={`${cp.InvoiceCount} invoices`} />
          <Stat label="Distributed Value" value={`$${cp.TotalDistributedValue.toFixed(0)}`} icon={TrendingUp} color="bg-teal-50 text-teal-600" sub={`Net: $${cp.NetValue.toFixed(0)}`} />
          <Stat label="Unique Visitors" value={cp.UniqueVisitors} icon={Users} color="bg-blue-50 text-blue-600" sub={`Avg ${cp.AvgItemsPerTransaction} items/visit`} />
          <Stat label="Vendors" value={dashboard?.vendor_count ?? '—'} icon={Truck} color="bg-purple-50 text-purple-600" />
        </div>
      )}

      {/* ── Charts grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Stock Trends */}
        <ChartCard
          title="Stock Levels Over Time"
          span={2}
          action={
            <div className="flex items-center gap-2">
              <select
                value={trendProductId}
                onChange={(e) => { const v = e.target.value === '' ? '' : Number(e.target.value); setTrendProductId(v); reloadTrends(v, trendDays); }}
                className="text-xs font-bold border-none bg-forest/5 dark:bg-neutral-800 rounded-xl px-3 py-2 focus:ring-4 focus:ring-forest/5 text-forest dark:text-white transition-all max-w-[200px]"
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p.FoodProductId} value={p.FoodProductId}>{p.ProductName}</option>)}
              </select>
              <select
                value={trendDays}
                onChange={(e) => { const d = Number(e.target.value); setTrendDays(d); reloadTrends(trendProductId, d); }}
                className="text-xs font-bold border-none bg-forest/5 dark:bg-neutral-800 rounded-xl px-3 py-2 focus:ring-4 focus:ring-forest/5 text-forest dark:text-white transition-all"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={180}>6 months</option>
                <option value={365}>1 year</option>
              </select>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stockTrends}>
              <defs>
                <linearGradient id="gStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.brown} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.brown} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.forest} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.forest} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.sage} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.sage} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="SnapshotDate" axisLine={false} tickLine={false} tick={AXIS_TICK}
                tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Area type="monotone" dataKey="Quantity" name="Total" stroke={C.brown} strokeWidth={3} fillOpacity={1} fill="url(#gStock)" />
              <Area type="monotone" dataKey="OpenMarketQuantity" name="Open Market" stroke={C.forest} strokeWidth={2} fillOpacity={1} fill="url(#gOM)" />
              <Area type="monotone" dataKey="GroceryStoreQuantity" name="Grocery" stroke={C.sage} strokeWidth={2} fillOpacity={1} fill="url(#gGS)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Received vs Distributed by Checkpoint */}
        <ChartCard
          title="Received vs Distributed by Period"
          span={2}
          action={
            <select
              value={recvDistCategoryId}
              onChange={(e) => { const v = e.target.value === '' ? '' : Number(e.target.value); setRecvDistCategoryId(v); reloadRecvDist(v); }}
              className="text-xs font-bold border-none bg-forest/5 dark:bg-neutral-800 rounded-xl px-3 py-2 focus:ring-4 focus:ring-forest/5 text-forest dark:text-white transition-all max-w-[200px]"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.CategoryId} value={c.CategoryId}>{c.CategoryName}</option>)}
            </select>
          }
        >
          {recvDistChartData.length > 0 ? (
            <>
              {/* Summary row */}
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: C.forest }} />
                  <span className="text-xs font-bold text-forest/60 dark:text-neutral-400">Received (invoices)</span>
                  <span className="text-sm font-bold text-forest dark:text-white">
                    {recvDistChartData.reduce((s, r) => s + r.Received, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: C.brown }} />
                  <span className="text-xs font-bold text-forest/60 dark:text-neutral-400">Distributed (transactions)</span>
                  <span className="text-sm font-bold text-forest dark:text-white">
                    {recvDistChartData.reduce((s, r) => s + r.Distributed, 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={recvDistChartData} barGap={4}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="startLabel"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    height={52}
                    tick={(props: any) => {
                      const { x, y, index } = props;
                      const d = recvDistChartData[index];
                      if (!d) return <g />;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text textAnchor="middle" fontSize={9} fontWeight={700} fill="#1B4332">
                            <tspan x={0} dy={4}>{d.startLabel}</tspan>
                            <tspan x={0} dy={12}>–</tspan>
                            <tspan x={0} dy={12}>{d.endLabel}</tspan>
                          </text>
                        </g>
                      );
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                  <Tooltip
                    contentStyle={TT_STYLE}
                    formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="Received" name="Received" fill={C.forest} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Distributed" name="Distributed" fill={C.brown} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-center py-10 text-forest/40 dark:text-neutral-500 font-medium">No checkpoint data available.</p>
          )}
        </ChartCard>

        {/* Distribution Over Time */}
        <ChartCard title="Monthly Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distTime}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="items_distributed" name="Items" fill={C.forest} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribution by Category */}
        <ChartCard title="Distribution by Category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={catDist} layout="vertical">
              <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis type="category" dataKey="CategoryName" axisLine={false} tickLine={false} tick={AXIS_TICK} width={100} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="total_distributed" name="Units" radius={[0, 8, 8, 0]}>
                {catDist.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Products */}
        <ChartCard title="Top 10 Products">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topProds} layout="vertical">
              <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
              <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis type="category" dataKey="ProductName" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 9 }} width={120} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="total_distributed" name="Distributed" fill={C.brown} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Waste by Reason (donut) */}
        <ChartCard title="Waste Breakdown">
          {waste && waste.by_reason.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={waste.by_reason}
                    dataKey="total_units"
                    nameKey="Reason"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {waste.by_reason.map((entry) => (
                      <Cell key={entry.Reason} fill={WASTE_COLORS[entry.Reason] ?? C.sage} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 pl-4">
                {waste.by_reason.map((r) => (
                  <div key={r.Reason} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: WASTE_COLORS[r.Reason] ?? C.sage }} />
                      <span className="text-xs font-bold text-forest/60 dark:text-neutral-400 capitalize">{r.Reason.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-forest dark:text-white">{r.total_units}</span>
                      <span className="text-xs text-forest/40 dark:text-neutral-500 ml-1">(${r.total_cost.toFixed(0)})</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-forest/5 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-forest/40 uppercase tracking-widest">Total</span>
                  <span className="text-sm font-bold text-brown">{waste.total_units} units · ${waste.total_cost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-10 text-forest/40 dark:text-neutral-500 font-medium">No waste data recorded.</p>
          )}
        </ChartCard>

        {/* Vendor Spending */}
        <ChartCard title="Spending by Vendor">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vendorSpend}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="VendorName" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip contentStyle={TT_STYLE} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Spent']} />
              <Bar dataKey="total_spent" name="Total Spent" radius={[8, 8, 0, 0]}>
                {vendorSpend.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Program Comparison */}
        <ChartCard title="Open Market vs Grocery Store">
          {programCmp && (
            <>
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: C.forest }} />
                  <span className="text-sm font-bold text-forest dark:text-white">{programCmp.open_market_total.toLocaleString()}</span>
                  <span className="text-xs text-forest/40">Open Market</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: C.sage }} />
                  <span className="text-sm font-bold text-forest dark:text-white">{programCmp.grocery_total.toLocaleString()}</span>
                  <span className="text-xs text-forest/40">Grocery</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={programCmp.by_category}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="CategoryName" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Bar dataKey="open_market" name="Open Market" fill={C.forest} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="grocery" name="Grocery" fill={C.sage} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>

        {/* Checkpoint Trends */}
        <ChartCard title="Period-over-Period Trends" span={2}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cpTrends.map(cp => ({
              ...cp,
              period: new Date(cp.StartDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            }))}>
              <defs>
                <linearGradient id="gSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.amber} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Area type="monotone" dataKey="TotalSpent" name="Spent" stroke={C.amber} strokeWidth={2} fillOpacity={1} fill="url(#gSpent)" />
              <Area type="monotone" dataKey="TotalDistributedValue" name="Distributed Value" stroke={C.green} strokeWidth={2} fillOpacity={1} fill="url(#gDist)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Waste Over Time */}
        {waste && waste.by_month.length > 0 && (
          <ChartCard title="Waste Over Time" span={2}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={waste.by_month}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} formatter={(v: number, name: string) => [name === 'total_cost' ? `$${v.toFixed(2)}` : v, name === 'total_cost' ? 'Est. Cost' : 'Units']} />
                <Bar dataKey="total_units" name="Units Wasted" fill={C.red} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

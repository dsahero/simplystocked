import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Brain, AlertTriangle, CheckCircle2, Package, TrendingUp,
  ArrowUpRight, Search, Filter, Loader2, ShoppingCart, X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getRestockRecommendations, getPredictionSummary,
  RestockRecommendation, PredictionSummary,
} from '../api/predictions';

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
};

const STOCK_COLORS: Record<string, string> = { Low: C.red, Medium: C.amber, High: C.green };
const CATEGORY_COLORS = [C.brown, C.forest, C.sage, C.blue, C.teal, C.purple, C.amber, C.red];
const TT_STYLE = { borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)', fontSize: 12, fontWeight: 600 };
const AXIS_TICK = { fontSize: 10, fontWeight: 700, fill: '#1B4332' };
const GRID_PROPS = { strokeDasharray: '3 3', vertical: false, stroke: '#f0f0f0' } as const;

// ── Stat card ─────────────────────────────────────────────────────────
function Stat({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: typeof Package; color: string;
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

// ── Urgency badge ─────────────────────────────────────────────────────
function UrgencyBadge({ restock }: { restock: number }) {
  if (restock === 0) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3" /> Stocked
    </span>
  );
  if (restock <= 10) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3" /> Low
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
      <AlertTriangle className="h-3 w-3" /> Urgent
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function PredictionsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [recs, setRecs] = useState<RestockRecommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStock, setFilterStock] = useState<'all' | 'needs_restock' | 'stocked'>('all');
  const [selectedItem, setSelectedItem] = useState<RestockRecommendation | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([getPredictionSummary(), getRestockRecommendations()]);
        setSummary(s);
        setRecs(r);
      } catch (e) {
        console.error('Failed to load predictions', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => ['All', ...new Set(recs.map(r => r.CategoryName))], [recs]);

  const filteredRecs = useMemo(() => {
    let list = recs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.ProductName.toLowerCase().includes(q) || r.CategoryName.toLowerCase().includes(q));
    }
    if (filterCategory !== 'All') list = list.filter(r => r.CategoryName === filterCategory);
    if (filterStock === 'needs_restock') list = list.filter(r => r.restock_total > 0);
    if (filterStock === 'stocked') list = list.filter(r => r.restock_total === 0);
    return list;
  }, [recs, searchQuery, filterCategory, filterStock]);

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
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
            <Brain className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Demand Predictions</h1>
        </div>
        <p className="text-forest/60 dark:text-neutral-400">
          ML-powered restock recommendations based on {summary?.model_state?.total_invoices_trained?.toLocaleString() ?? '—'} historical invoices.
          {summary?.model_state?.trained_at && (
            <span className="text-forest/30 dark:text-neutral-600"> · Last trained {new Date(summary.model_state.trained_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </p>
      </header>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Needs Restock" value={summary?.needs_restock_count ?? 0} icon={AlertTriangle} color="bg-red-50 text-red-600" sub={`of ${summary?.total_products ?? 0} products`} />
        <Stat label="Well Stocked" value={summary?.well_stocked_count ?? 0} icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <Stat label="Open Market Restock" value={summary?.total_open_market_restock ?? 0} icon={ShoppingCart} color="bg-forest/10 text-forest" sub="units needed" />
        <Stat label="Grocery Restock" value={summary?.total_grocery_restock ?? 0} icon={ShoppingCart} color="bg-sage/20 text-sage" sub="units needed" />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Urgent items bar chart */}
        {summary && summary.urgent_items.length > 0 && (
          <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
            <h2 className="text-lg font-display font-bold text-forest dark:text-white mb-6">Top Priority Restocks</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={summary.urgent_items} layout="vertical">
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <YAxis type="category" dataKey="ProductName" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 9 }} width={110} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="restock_open_market" name="Open Market" fill={C.forest} radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="restock_grocery_store" name="Grocery" fill={C.sage} radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category breakdown donut */}
        {summary && summary.by_category.length > 0 && (
          <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
            <h2 className="text-lg font-display font-bold text-forest dark:text-white mb-6">Restock by Category</h2>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={summary.by_category}
                    dataKey="total_units"
                    nameKey="category"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {summary.by_category.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TT_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 pl-4">
                {summary.by_category.map((cat, i) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-xs font-bold text-forest/60 dark:text-neutral-400">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-forest dark:text-white">{cat.total_units}</span>
                      <span className="text-xs text-forest/40 dark:text-neutral-500 ml-1">({cat.products} items)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Predicted vs Current comparison chart ──────────────────────── */}
      {recs.filter(r => r.restock_total > 0).length > 0 && (
        <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
          <h2 className="text-lg font-display font-bold text-forest dark:text-white mb-2">Current Stock vs Predicted Demand</h2>
          <p className="text-xs text-forest/40 dark:text-neutral-500 font-medium mb-6">Only showing items that need restocking. Gap = restock needed.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recs.filter(r => r.restock_total > 0)} barGap={2}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="ProductName" axisLine={false} tickLine={false} tick={{ ...AXIS_TICK, fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
              <Tooltip contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              <Bar dataKey="open_market_qty" name="Current (OM)" fill={C.forest} radius={[4, 4, 0, 0]} />
              <Bar dataKey="predicted_open_market" name="Predicted (OM)" fill={C.forest} fillOpacity={0.3} stroke={C.forest} strokeDasharray="4 2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="grocery_store_qty" name="Current (GS)" fill={C.sage} radius={[4, 4, 0, 0]} />
              <Bar dataKey="predicted_grocery_store" name="Predicted (GS)" fill={C.sage} fillOpacity={0.3} stroke={C.sage} strokeDasharray="4 2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Full recommendations table ─────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold text-forest dark:text-white">All Recommendations</h2>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-neutral-400 shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-3 pr-8 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'needs_restock' as const, label: 'Needs Restock' },
              { value: 'stocked' as const, label: 'Well Stocked' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterStock(opt.value)}
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-bold transition-all',
                  filterStock === opt.value
                    ? 'bg-brown text-white'
                    : 'bg-forest/5 dark:bg-neutral-800 text-forest/50 dark:text-neutral-400 hover:bg-forest/10'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock Level</th>
                  <th className="px-6 py-4 text-right">Current OM</th>
                  <th className="px-6 py-4 text-right">Current GS</th>
                  <th className="px-6 py-4 text-right">Predicted OM</th>
                  <th className="px-6 py-4 text-right">Predicted GS</th>
                  <th className="px-6 py-4 text-right">Restock</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                {filteredRecs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-forest/40 dark:text-neutral-500 font-medium">
                      No products match your filters.
                    </td>
                  </tr>
                ) : filteredRecs.map((r) => (
                  <tr
                    key={r.FoodProductId}
                    className="hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedItem(r)}
                  >
                    <td className="px-6 py-4 font-bold text-forest dark:text-white">{r.ProductName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-xl bg-forest/5 dark:bg-neutral-800 px-2.5 py-0.5 text-[10px] font-bold text-forest/60 dark:text-neutral-400">
                        {r.CategoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
                        r.StockLevel === 'Low' && 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
                        r.StockLevel === 'Medium' && 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
                        r.StockLevel === 'High' && 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                      )}>
                        {r.StockLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-forest/60 dark:text-neutral-400">{r.open_market_qty}</td>
                    <td className="px-6 py-4 text-right font-medium text-forest/60 dark:text-neutral-400">{r.grocery_store_qty}</td>
                    <td className="px-6 py-4 text-right font-bold text-forest dark:text-white">{r.predicted_open_market}</td>
                    <td className="px-6 py-4 text-right font-bold text-forest dark:text-white">{r.predicted_grocery_store}</td>
                    <td className="px-6 py-4 text-right">
                      {r.restock_total > 0 ? (
                        <span className="font-bold text-brown">+{r.restock_total}</span>
                      ) : (
                        <span className="text-forest/30 dark:text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <UrgencyBadge restock={r.restock_total} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail modal ───────────────────────────────────────────────── */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md" onClick={() => setSelectedItem(null)} />
          <div className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl border border-forest/5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-forest dark:text-white">{selectedItem.ProductName}</h2>
              <button onClick={() => setSelectedItem(null)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all">
                <X className="h-5 w-5 text-forest/40" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-forest/40 uppercase tracking-widest">Category</span>
                <span className="text-sm font-bold text-forest dark:text-white">{selectedItem.CategoryName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-forest/40 uppercase tracking-widest">Stock Level</span>
                <span className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold',
                  selectedItem.StockLevel === 'Low' && 'bg-red-50 text-red-600',
                  selectedItem.StockLevel === 'Medium' && 'bg-amber-50 text-amber-600',
                  selectedItem.StockLevel === 'High' && 'bg-green-50 text-green-600',
                )}>{selectedItem.StockLevel}</span>
              </div>

              <div className="h-px bg-forest/5 dark:bg-neutral-800" />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4 text-center">
                  <p className="text-[9px] font-bold text-forest/40 uppercase tracking-widest mb-1">Current OM</p>
                  <p className="text-xl font-display font-bold text-forest dark:text-white">{selectedItem.open_market_qty}</p>
                </div>
                <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4 text-center">
                  <p className="text-[9px] font-bold text-forest/40 uppercase tracking-widest mb-1">Current GS</p>
                  <p className="text-xl font-display font-bold text-forest dark:text-white">{selectedItem.grocery_store_qty}</p>
                </div>
                <div className="rounded-[20px] border border-forest/5 bg-purple-50/50 dark:bg-purple-900/10 p-4 text-center">
                  <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">Predicted OM</p>
                  <p className="text-xl font-display font-bold text-purple-600 dark:text-purple-400">{selectedItem.predicted_open_market}</p>
                </div>
                <div className="rounded-[20px] border border-forest/5 bg-purple-50/50 dark:bg-purple-900/10 p-4 text-center">
                  <p className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-1">Predicted GS</p>
                  <p className="text-xl font-display font-bold text-purple-600 dark:text-purple-400">{selectedItem.predicted_grocery_store}</p>
                </div>
              </div>

              {selectedItem.restock_total > 0 && (
                <div className="rounded-[24px] bg-brown/5 dark:bg-brown/10 border border-brown/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowUpRight className="h-4 w-4 text-brown" />
                    <span className="text-sm font-bold text-brown">Restock Recommendation</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[9px] font-bold text-brown/60 uppercase tracking-widest">Open Market</p>
                      <p className="text-lg font-bold text-brown">+{selectedItem.restock_open_market}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-brown/60 uppercase tracking-widest">Grocery</p>
                      <p className="text-lg font-bold text-brown">+{selectedItem.restock_grocery_store}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-brown/60 uppercase tracking-widest">Total</p>
                      <p className="text-lg font-bold text-brown">+{selectedItem.restock_total}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.restock_total === 0 && (
                <div className="rounded-[24px] bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 p-5 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">No restock needed</p>
                  <p className="text-xs text-green-600/60 dark:text-green-400/60 mt-1">Current stock meets predicted demand.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

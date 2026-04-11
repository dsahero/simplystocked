import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Loader2, X, ChevronRight, ChevronDown,
  AlertCircle, Package, Calendar, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  getTeamOverview, getUserActivity, getDailyActivity,
  TeamMember, UserActivity, DailyActivity,
} from '../api/team';

type TabType = 'members' | 'daily';

const C = { brown: '#5c4033', forest: '#4a5d3f', sage: '#8ba888' };
const TT_STYLE = { borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)', fontSize: 12, fontWeight: 600 };
const AXIS_TICK = { fontSize: 10, fontWeight: 700, fill: '#1B4332' };
const GRID_PROPS = { strokeDasharray: '3 3', vertical: false, stroke: '#f0f0f0' } as const;

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  manager: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  user: 'bg-forest/5 text-forest/60 dark:bg-neutral-800 dark:text-neutral-400',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [daily, setDaily] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Member detail
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberActivity, setMemberActivity] = useState<UserActivity | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [t, d] = await Promise.all([getTeamOverview(), getDailyActivity()]);
        setTeam(t);
        setDaily(d);
      } catch { setError('Failed to load team data.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filteredTeam = useMemo(() => {
    if (!searchQuery.trim()) return team;
    const q = searchQuery.toLowerCase();
    return team.filter(m => m.Username.toLowerCase().includes(q) || m.Role.toLowerCase().includes(q));
  }, [team, searchQuery]);

  const openMember = async (member: TeamMember) => {
    setSelectedMember(member);
    setMemberActivity(null);
    setMemberLoading(true);
    setExpandedDates(new Set());
    try {
      const data = await getUserActivity(member.UserId);
      setMemberActivity(data);
      // Auto-expand first 3 dates
      const dates = new Set<string>();
      for (const tx of data.transactions) {
        if (dates.size < 3) dates.add(tx.TransactionDate);
      }
      setExpandedDates(dates);
    } catch { setError('Failed to load member activity.'); }
    finally { setMemberLoading(false); }
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  // Group member transactions by date
  const groupedTransactions = useMemo(() => {
    if (!memberActivity) return [];
    const grouped = new Map<string, typeof memberActivity.transactions>();
    for (const tx of memberActivity.transactions) {
      const d = tx.TransactionDate;
      if (!grouped.has(d)) grouped.set(d, []);
      grouped.get(d)!.push(tx);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [memberActivity]);

  // Daily activity chart — aggregate by date
  const dailyChartData = useMemo(() => {
    const byDate = new Map<string, { date: string; transactions: number; items: number; value: number }>();
    for (const d of daily) {
      const key = d.TransactionDate;
      if (!byDate.has(key)) byDate.set(key, { date: key, transactions: 0, items: 0, value: 0 });
      const entry = byDate.get(key)!;
      entry.transactions += d.transaction_count;
      entry.items += d.items_distributed;
      entry.value += d.total_value;
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [daily]);

  const tabs: { id: TabType; name: string; icon: typeof Users }[] = [
    { id: 'members', name: 'Team Members', icon: Users },
    { id: 'daily', name: 'Daily Activity', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-brown" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Team Activity</h1>
        <p className="text-forest/60 dark:text-neutral-400">Track volunteer and admin transaction activity across programs.</p>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30">
          <AlertCircle className="h-5 w-5 text-brown shrink-0" />
          <p className="text-sm font-bold text-brown">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-brown/40 hover:text-brown"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-[24px] bg-forest/5 dark:bg-neutral-800 p-1.5 no-scrollbar border border-forest/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* ── Members tab ────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search team members…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
            />
          </div>

          <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                  <tr>
                    <th className="px-8 py-5">Member</th>
                    <th className="px-8 py-5">Role</th>
                    <th className="px-8 py-5 text-right">Transactions</th>
                    <th className="px-8 py-5 text-right">Total Value</th>
                    <th className="px-8 py-5">Last Active</th>
                    <th className="px-8 py-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                  {filteredTeam.map((m) => (
                    <tr key={m.UserId} className="group hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/5 dark:bg-neutral-800 text-forest dark:text-neutral-400 shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-forest dark:text-white">{m.Username}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize', ROLE_STYLES[m.Role] ?? ROLE_STYLES.user)}>
                          {m.Role}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={cn('font-bold', m.transaction_count > 0 ? 'text-forest dark:text-white' : 'text-forest/30 dark:text-neutral-600')}>
                          {m.transaction_count}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-bold text-forest dark:text-white">
                        {m.total_value > 0 ? `$${m.total_value.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-8 py-5 text-forest/60 dark:text-neutral-400 font-medium">
                        {m.last_active ? fmtDate(m.last_active) : 'Never'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {m.transaction_count > 0 && (
                          <button
                            onClick={() => openMember(m)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-forest/5 dark:bg-neutral-800 px-4 py-2 text-xs font-bold text-forest/60 dark:text-neutral-400 hover:bg-brown/10 hover:text-brown transition-colors"
                          >
                            View
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Daily Activity tab ─────────────────────────────────────────── */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Chart */}
          <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
            <h2 className="text-lg font-display font-bold text-forest dark:text-white mb-6">Transactions & Items (Last 30 Days)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyChartData}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={AXIS_TICK}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} labelFormatter={(d: string) => fmtDate(d)} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="transactions" name="Transactions" fill={C.forest} radius={[6, 6, 0, 0]} />
                <Bar dataKey="items" name="Items" fill={C.sage} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily log table */}
          <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                  <tr>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Member</th>
                    <th className="px-8 py-5 text-right">Transactions</th>
                    <th className="px-8 py-5 text-right">Items</th>
                    <th className="px-8 py-5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                  {daily.slice(0, 50).map((d, i) => (
                    <tr key={`${d.TransactionDate}-${d.Username}-${i}`} className="hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-8 py-4 text-forest/70 dark:text-neutral-300 font-medium">{fmtDate(d.TransactionDate)}</td>
                      <td className="px-8 py-4 font-bold text-forest dark:text-white">{d.Username}</td>
                      <td className="px-8 py-4 text-right font-medium text-forest/60 dark:text-neutral-400">{d.transaction_count}</td>
                      <td className="px-8 py-4 text-right font-medium text-forest/60 dark:text-neutral-400">{d.items_distributed}</td>
                      <td className="px-8 py-4 text-right font-bold text-forest dark:text-white">${d.total_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {(selectedMember) && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              {memberLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-brown" />
                </div>
              ) : memberActivity && (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-display font-bold text-forest dark:text-white">{selectedMember.Username}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize', ROLE_STYLES[selectedMember.Role])}>
                          {selectedMember.Role}
                        </span>
                        <span className="text-sm text-forest/40 dark:text-neutral-500 font-medium">
                          {memberActivity.total_transactions} transactions · {memberActivity.total_items} items distributed
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMember(null)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90">
                      <X className="h-6 w-6 text-forest/40" />
                    </button>
                  </div>

                  {/* Program breakdown */}
                  {memberActivity.program_breakdown.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {memberActivity.program_breakdown.map((pb) => (
                        <div key={pb.Program} className="rounded-[24px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-5">
                          <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">
                            {pb.Program === 'grocery' ? 'Grocery Store' : 'Open Market'}
                          </p>
                          <p className="text-xl font-display font-bold text-forest dark:text-white">{pb.transaction_count} <span className="text-sm font-medium text-forest/40">txns</span></p>
                          <p className="text-sm font-bold text-brown">${pb.total_value.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Transactions grouped by date */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-forest/40 uppercase tracking-widest">Transaction History</h3>
                    {groupedTransactions.length === 0 ? (
                      <p className="text-center py-8 text-forest/40 dark:text-neutral-500 font-medium">No transactions found.</p>
                    ) : groupedTransactions.map(([date, txs]) => {
                      const isExpanded = expandedDates.has(date);
                      const dayTotal = txs.reduce((s, tx) => s + tx.TotalAmount, 0);
                      return (
                        <div key={date} className="rounded-[24px] border border-forest/5 dark:border-neutral-700 overflow-hidden">
                          <button
                            onClick={() => toggleDate(date)}
                            className="w-full flex items-center justify-between px-5 py-3.5 bg-forest/[0.03] dark:bg-neutral-800/50 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-forest/40" /> : <ChevronRight className="h-4 w-4 text-forest/40" />}
                              <span className="text-sm font-bold text-forest dark:text-white">{fmtDate(date)}</span>
                              <span className="text-[10px] font-bold text-forest/40 dark:text-neutral-500">{txs.length} txn{txs.length !== 1 ? 's' : ''}</span>
                            </div>
                            <span className="text-sm font-bold text-brown">${dayTotal.toFixed(2)}</span>
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-forest/5 dark:divide-neutral-700">
                              {txs.map((tx) => (
                                <div key={tx.TransactionId} className="px-5 py-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-forest/60 dark:text-neutral-400">#{tx.TransactionId}</span>
                                      <span className={cn(
                                        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                                        tx.Program === 'grocery'
                                          ? 'bg-sage/10 text-sage dark:bg-sage/5'
                                          : 'bg-forest/5 text-forest/50 dark:bg-neutral-800 dark:text-neutral-500'
                                      )}>
                                        {tx.Program === 'grocery' ? 'Grocery' : 'Open Market'}
                                      </span>
                                    </div>
                                    <span className="text-xs font-bold text-forest dark:text-white">${tx.TotalAmount.toFixed(2)}</span>
                                  </div>
                                  {tx.items && tx.items.length > 0 && (
                                    <div className="space-y-1 pl-3 border-l-2 border-forest/10 dark:border-neutral-700">
                                      {tx.items.map((item) => (
                                        <div key={item.TransactionItemId} className="flex items-center justify-between text-xs">
                                          <span className="text-forest/60 dark:text-neutral-400 font-medium">
                                            {item.ProductName} <span className="text-forest/30">({item.CategoryName})</span>
                                          </span>
                                          <span className="font-bold text-forest/70 dark:text-neutral-300 shrink-0 ml-4">
                                            {item.Quantity} x ${item.ProductPrice.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

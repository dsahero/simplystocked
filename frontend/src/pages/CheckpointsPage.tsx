import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Plus, Calendar, Loader2, AlertCircle, X, CheckCircle2,
  ChevronRight, ChevronDown, ArrowRightLeft, Package, BarChart3, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  getAllCheckpoints, createCheckpoint, getTransactionsByCheckpoint, getYearEndSummary, rollover,
  ApiCheckpoint, ApiTransaction, ApiYearEndSummary, ApiRolloverResult,
} from '../api/checkpoints';

type TabType = 'checkpoints' | 'rollover';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CheckpointsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('checkpoints');
  const [checkpoints, setCheckpoints] = useState<ApiCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create checkpoint modal
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ date: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Transaction detail modal
  const [detailCheckpoint, setDetailCheckpoint] = useState<(ApiCheckpoint & { transactions: ApiTransaction[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState<'all' | 'open_market' | 'grocery'>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Rollover tab state
  const [selectedCpId, setSelectedCpId] = useState<number | ''>('');
  const [summary, setSummary] = useState<ApiYearEndSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [rolloverDates, setRolloverDates] = useState({ start: '', end: '' });
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [rolloverResult, setRolloverResult] = useState<ApiRolloverResult | null>(null);

  useEffect(() => { loadCheckpoints(); }, []);

  const loadCheckpoints = async () => {
    setLoading(true);
    try {
      setCheckpoints(await getAllCheckpoints());
    } catch { setError('Failed to load checkpoints.'); }
    finally { setLoading(false); }
  };

  // ── Create checkpoint ───────────────────────────────────────────────
  const openCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setCreateForm({ date: today, start_date: today, end_date: '' });
    setCreateError('');
    setIsCreating(true);
  };

  const handleCreate = async () => {
    if (!createForm.date || !createForm.start_date || !createForm.end_date) {
      setCreateError('All three date fields are required.');
      return;
    }
    setSaving(true);
    setCreateError('');
    try {
      await createCheckpoint(createForm.date, createForm.start_date, createForm.end_date);
      setIsCreating(false);
      await loadCheckpoints();
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create checkpoint.');
    } finally { setSaving(false); }
  };

  // ── View transactions ───────────────────────────────────────────────
  const openDetail = async (cp: ApiCheckpoint) => {
    setDetailLoading(true);
    setDetailCheckpoint(null);
    setProgramFilter('all');
    setExpandedDates(new Set());
    try {
      const data = await getTransactionsByCheckpoint(cp.CheckPointId);
      setDetailCheckpoint(data);
      // Auto-expand the first 3 dates
      const dates = new Set<string>();
      for (const tx of data.transactions) {
        if (tx.TransactionDate && dates.size < 3) dates.add(tx.TransactionDate);
      }
      setExpandedDates(dates);
    } catch { setError('Failed to load transactions.'); }
    finally { setDetailLoading(false); }
  };

  // Group transactions by date, filtered by program
  const groupedTransactions = useMemo(() => {
    if (!detailCheckpoint) return [];
    const filtered = programFilter === 'all'
      ? detailCheckpoint.transactions
      : detailCheckpoint.transactions.filter(tx => tx.Program === programFilter);

    const grouped = new Map<string, ApiTransaction[]>();
    for (const tx of filtered) {
      const date = tx.TransactionDate ?? 'Unknown';
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date)!.push(tx);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [detailCheckpoint, programFilter]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  // ── Load summary for rollover ───────────────────────────────────────
  const handleLoadSummary = async () => {
    if (selectedCpId === '') return;
    setSummaryLoading(true);
    setSummary(null);
    setRolloverResult(null);
    try {
      setSummary(await getYearEndSummary(Number(selectedCpId)));
    } catch { setError('Failed to load summary.'); }
    finally { setSummaryLoading(false); }
  };

  const handleRollover = async () => {
    if (selectedCpId === '' || !rolloverDates.start || !rolloverDates.end) return;
    setRolloverLoading(true);
    try {
      const res = await rollover(Number(selectedCpId), rolloverDates.start, rolloverDates.end);
      setRolloverResult(res);
      await loadCheckpoints();
    } catch (err: any) {
      setError(err.message ?? 'Rollover failed.');
    } finally { setRolloverLoading(false); }
  };

  const tabs: { id: TabType; name: string; icon: typeof ClipboardCheck }[] = [
    { id: 'checkpoints', name: 'Checkpoints', icon: ClipboardCheck },
    { id: 'rollover', name: 'Year-End Rollover', icon: ArrowRightLeft },
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Inventory Checkpoints</h1>
          <p className="text-forest/60 dark:text-neutral-400">Set baselines, track distribution periods, and perform year-end rollover.</p>
        </div>
        {activeTab === 'checkpoints' && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-2xl bg-brown px-6 py-3 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            New Checkpoint
          </button>
        )}
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

      {/* ── Checkpoints tab ──────────────────────────────────────────────── */}
      {activeTab === 'checkpoints' && (
        <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                <tr>
                  <th className="px-8 py-5">Checkpoint</th>
                  <th className="px-8 py-5">Recorded</th>
                  <th className="px-8 py-5">Period Start</th>
                  <th className="px-8 py-5">Period End</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                {checkpoints.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-forest/40 dark:text-neutral-500 font-medium">
                      No checkpoints yet. Create one to start a new inventory period.
                    </td>
                  </tr>
                ) : checkpoints.map((cp) => (
                  <tr key={cp.CheckPointId} className="group hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brown/10 text-brown shrink-0">
                          <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-forest dark:text-white">#{cp.CheckPointId}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-forest/70 dark:text-neutral-300 font-medium">
                      {fmtDate(cp.Date)}
                    </td>
                    <td className="px-8 py-5 text-forest/70 dark:text-neutral-300 font-medium">
                      {fmtDate(cp.StartDate)}
                    </td>
                    <td className="px-8 py-5 text-forest/70 dark:text-neutral-300 font-medium">
                      {fmtDate(cp.EndDate)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => openDetail(cp)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest/5 dark:bg-neutral-800 px-4 py-2 text-xs font-bold text-forest/60 dark:text-neutral-400 hover:bg-brown/10 hover:text-brown transition-colors"
                      >
                        View Transactions
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Rollover tab ─────────────────────────────────────────────────── */}
      {activeTab === 'rollover' && (
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Select checkpoint */}
          <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm">
            <div className="flex items-center gap-5 mb-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-brown/10 text-brown">
                <BarChart3 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-forest dark:text-white">Year-End Summary & Rollover</h2>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">
                  Select a checkpoint period to view totals and carry remaining stock forward.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Checkpoint Period</label>
                  <select
                    value={selectedCpId}
                    onChange={(e) => { setSelectedCpId(e.target.value === '' ? '' : Number(e.target.value)); setSummary(null); setRolloverResult(null); }}
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  >
                    <option value="">Select checkpoint…</option>
                    {checkpoints.map(cp => (
                      <option key={cp.CheckPointId} value={cp.CheckPointId}>
                        #{cp.CheckPointId} — {fmtDate(cp.StartDate)} to {fmtDate(cp.EndDate)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLoadSummary}
                  disabled={selectedCpId === '' || summaryLoading}
                  className="rounded-2xl bg-forest dark:bg-white px-8 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  {summaryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Load Summary'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary results */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stat cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[28px] border border-forest/5 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-2">Period</p>
                  <p className="text-lg font-display font-bold text-forest dark:text-white">
                    {fmtDate(summary.checkpoint.StartDate)} – {fmtDate(summary.checkpoint.EndDate)}
                  </p>
                </div>
                <div className="rounded-[28px] border border-forest/5 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-2">Total Distributed</p>
                  <p className="text-3xl font-display font-bold text-brown">{summary.total_distributed.toLocaleString()}</p>
                  <p className="text-xs text-forest/40 font-medium mt-1">units across all products</p>
                </div>
                <div className="rounded-[28px] border border-forest/5 bg-white dark:bg-neutral-900 p-6 shadow-sm">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-2">Remaining Stock</p>
                  <p className="text-3xl font-display font-bold text-forest dark:text-white">{summary.remaining_stock.toLocaleString()}</p>
                  <p className="text-xs text-forest/40 font-medium mt-1">units to carry forward</p>
                </div>
              </div>

              {/* Product breakdown */}
              {summary.products.length > 0 && (
                <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                        <tr>
                          <th className="px-6 py-4">Product</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4 text-right">Distributed</th>
                          <th className="px-6 py-4 text-right">Open Market</th>
                          <th className="px-6 py-4 text-right">Grocery</th>
                          <th className="px-6 py-4 text-right">Total Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                        {summary.products.map((p) => (
                          <tr key={p.FoodProductId} className="hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-forest dark:text-white">{p.ProductName}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center rounded-xl bg-forest/5 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-forest/60 dark:text-neutral-400">
                                {p.CategoryName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-brown">{p.total_distributed}</td>
                            <td className="px-6 py-4 text-right text-forest/60 dark:text-neutral-400 font-medium">{p.OpenMarketQuantity}</td>
                            <td className="px-6 py-4 text-right text-forest/60 dark:text-neutral-400 font-medium">{p.GroceryStoreQuantity}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={cn(
                                'font-bold',
                                p.current_stock <= 0 ? 'text-red-500' : 'text-forest dark:text-white'
                              )}>
                                {p.current_stock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rollover action */}
              {!rolloverResult ? (
                <div className="rounded-[40px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-10 shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-forest dark:text-white">Perform Rollover</h3>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium leading-relaxed">
                    This will close checkpoint <span className="font-bold text-forest dark:text-white">#{summary.checkpoint.CheckPointId}</span> and create a new period.
                    Remaining stock ({summary.remaining_stock.toLocaleString()} units) is preserved — no quantities are reset.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">New Period Start</label>
                      <input
                        type="date"
                        value={rolloverDates.start}
                        onChange={(e) => setRolloverDates({ ...rolloverDates, start: e.target.value })}
                        className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">New Period End</label>
                      <input
                        type="date"
                        value={rolloverDates.end}
                        onChange={(e) => setRolloverDates({ ...rolloverDates, end: e.target.value })}
                        className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRollover}
                    disabled={rolloverLoading || !rolloverDates.start || !rolloverDates.end}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-brown px-6 py-5 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95 disabled:opacity-50"
                  >
                    {rolloverLoading ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Processing Rollover…</>
                    ) : (
                      <><ArrowRightLeft className="h-5 w-5" /> Close Period & Start New</>
                    )}
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[40px] border border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/20 p-10 text-center"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-6">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-forest dark:text-white mb-2">Rollover Complete</h3>
                  <p className="text-sm text-forest/60 dark:text-neutral-400 font-medium leading-relaxed">
                    Checkpoint #{rolloverResult.closed_checkpoint_id} is now closed.<br />
                    New period <span className="font-bold text-forest dark:text-white">#{rolloverResult.new_checkpoint_id}</span> runs from{' '}
                    <span className="font-bold">{fmtDate(rolloverResult.new_start_date)}</span> to{' '}
                    <span className="font-bold">{fmtDate(rolloverResult.new_end_date)}</span>.
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ── Create Checkpoint Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isCreating && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-forest dark:text-white">New Checkpoint</h2>
                <button onClick={() => setIsCreating(false)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90">
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              {createError && (
                <div className="flex items-center gap-3 mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 text-brown shrink-0" />
                  <p className="text-sm font-bold text-brown">{createError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Date Recorded</label>
                  <input
                    type="date"
                    value={createForm.date}
                    onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Period Start</label>
                    <input
                      type="date"
                      value={createForm.start_date}
                      onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Period End</label>
                    <input
                      type="date"
                      value={createForm.end_date}
                      onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-10">
                <button
                  onClick={() => setIsCreating(false)}
                  className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Create Checkpoint
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Transaction Detail Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {(detailCheckpoint || detailLoading) && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setDetailCheckpoint(null); setDetailLoading(false); }}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              {detailLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-brown" />
                </div>
              ) : detailCheckpoint && (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-display font-bold text-forest dark:text-white">
                        Checkpoint #{detailCheckpoint.CheckPointId}
                      </h2>
                      <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-1">
                        {fmtDate(detailCheckpoint.StartDate)} – {fmtDate(detailCheckpoint.EndDate)}
                      </p>
                    </div>
                    <button onClick={() => setDetailCheckpoint(null)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90">
                      <X className="h-6 w-6 text-forest/40" />
                    </button>
                  </div>

                  {/* Program filter */}
                  <div className="flex items-center gap-2 mb-6">
                    <Filter className="h-4 w-4 text-forest/30 shrink-0" />
                    {[
                      { value: 'all' as const, label: 'All Programs' },
                      { value: 'open_market' as const, label: 'Open Market' },
                      { value: 'grocery' as const, label: 'Grocery Store' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setProgramFilter(opt.value)}
                        className={cn(
                          'rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95',
                          programFilter === opt.value
                            ? 'bg-brown text-white shadow-sm'
                            : 'bg-forest/5 dark:bg-neutral-800 text-forest/50 dark:text-neutral-400 hover:bg-forest/10 dark:hover:bg-neutral-700'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <span className="ml-auto text-xs font-bold text-forest/40 dark:text-neutral-500">
                      {groupedTransactions.reduce((s, [, txs]) => s + txs.length, 0)} transactions
                    </span>
                  </div>

                  {/* Grouped by date */}
                  {groupedTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-forest/5 mb-4">
                        <Package className="h-8 w-8 text-forest/20" />
                      </div>
                      <p className="text-forest/40 dark:text-neutral-500 font-medium">
                        {detailCheckpoint.transactions.length === 0
                          ? 'No transactions recorded for this period.'
                          : 'No transactions match the selected program.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupedTransactions.map(([date, txs]) => {
                        const isExpanded = expandedDates.has(date);
                        const dayTotal = txs.reduce((s, tx) => s + tx.TotalAmount, 0);
                        const dayItems = txs.reduce((s, tx) => s + (tx.items?.reduce((a, i) => a + i.Quantity, 0) ?? 0), 0);
                        const omCount = txs.filter(tx => tx.Program === 'open_market').length;
                        const grCount = txs.filter(tx => tx.Program === 'grocery').length;

                        return (
                          <div key={date} className="rounded-[24px] border border-forest/5 dark:border-neutral-700 overflow-hidden">
                            {/* Date header — always visible, clickable */}
                            <button
                              onClick={() => toggleDate(date)}
                              className="w-full flex items-center justify-between px-6 py-4 bg-forest/[0.03] dark:bg-neutral-800/50 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-forest/40 shrink-0" />
                                  : <ChevronRight className="h-4 w-4 text-forest/40 shrink-0" />
                                }
                                <div>
                                  <span className="text-sm font-bold text-forest dark:text-white">
                                    {date !== 'Unknown' ? fmtDate(date) : 'Unknown Date'}
                                  </span>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] font-bold text-forest/40 dark:text-neutral-500">
                                      {txs.length} transaction{txs.length !== 1 ? 's' : ''} · {dayItems} items
                                    </span>
                                    {omCount > 0 && (
                                      <span className="inline-flex items-center rounded-md bg-forest/5 dark:bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold text-forest/50 dark:text-neutral-500">
                                        OM {omCount}
                                      </span>
                                    )}
                                    {grCount > 0 && (
                                      <span className="inline-flex items-center rounded-md bg-sage/10 dark:bg-neutral-800 px-1.5 py-0.5 text-[9px] font-bold text-sage dark:text-neutral-500">
                                        GS {grCount}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-brown shrink-0">${dayTotal.toFixed(2)}</span>
                            </button>

                            {/* Expanded transaction list */}
                            {isExpanded && (
                              <div className="divide-y divide-forest/5 dark:divide-neutral-700">
                                {txs.map((tx) => (
                                  <div key={tx.TransactionId} className="px-6 py-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-forest/60 dark:text-neutral-400">
                                          #{tx.TransactionId}
                                        </span>
                                        {tx.Username && (
                                          <span className="text-[10px] font-medium text-forest/40 dark:text-neutral-500">
                                            by {tx.Username}
                                          </span>
                                        )}
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
                                              {item.Quantity} × ${item.ProductPrice.toFixed(2)}
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
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

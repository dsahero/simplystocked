import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, X, FileText, ChevronRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getAllVendors, createVendor, updateVendor, deleteVendor, ApiVendor } from '../api/vendors';
import { getAllInvoices, ApiInvoice } from '../api/invoices';

type TabType = 'vendors' | 'invoices';

const emptyVendor: Omit<ApiVendor, 'VendorId'> = {
  VendorName: '', Email: '', Phone: '', HQAddress: '', HQCity: '', HQState: '', HQZip: '',
};

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('vendors');
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [filterVendorId, setFilterVendorId] = useState<number | ''>('');

  // Modal state
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<ApiVendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<ApiVendor | null>(null);
  const [formData, setFormData] = useState(emptyVendor);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Invoice detail
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, inv] = await Promise.all([getAllVendors(), getAllInvoices()]);
      setVendors(v);
      setInvoices(inv);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered lists ──────────────────────────────────────────────────
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(v =>
      v.VendorName.toLowerCase().includes(q) ||
      v.HQCity.toLowerCase().includes(q) ||
      v.Email.toLowerCase().includes(q)
    );
  }, [vendors, searchQuery]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (filterVendorId !== '') {
      list = list.filter(i => i.VendorId === filterVendorId);
    }
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase();
      list = list.filter(i =>
        i.Desc.toLowerCase().includes(q) ||
        (i.VendorName ?? '').toLowerCase().includes(q) ||
        String(i.InvoiceId).includes(q)
      );
    }
    return list;
  }, [invoices, filterVendorId, invoiceSearch]);

  // ── Vendor CRUD handlers ────────────────────────────────────────────
  const openAdd = () => {
    setFormData(emptyVendor);
    setFormError('');
    setIsAddingVendor(true);
  };

  const openEdit = (v: ApiVendor) => {
    setFormData({
      VendorName: v.VendorName, Email: v.Email, Phone: v.Phone,
      HQAddress: v.HQAddress, HQCity: v.HQCity, HQState: v.HQState, HQZip: v.HQZip,
    });
    setFormError('');
    setEditingVendor(v);
  };

  const handleSave = async () => {
    if (!formData.VendorName.trim()) { setFormError('Vendor name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.VendorId, formData);
      } else {
        await createVendor(formData);
      }
      setIsAddingVendor(false);
      setEditingVendor(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to save vendor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vendorToDelete) return;
    try {
      await deleteVendor(vendorToDelete.VendorId);
      setVendorToDelete(null);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete vendor.');
      setVendorToDelete(null);
    }
  };

  // ── Tabs ────────────────────────────────────────────────────────────
  const tabs: { id: TabType; name: string; icon: typeof Truck }[] = [
    { id: 'vendors', name: 'Vendors', icon: Truck },
    { id: 'invoices', name: 'Invoice History', icon: FileText },
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
          <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Vendors & Invoices</h1>
          <p className="text-forest/60 dark:text-neutral-400">Manage vendors and track incoming invoices.</p>
        </div>
        {activeTab === 'vendors' && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-2xl bg-brown px-6 py-3 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Add Vendor
          </button>
        )}
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30">
          <AlertCircle className="h-5 w-5 text-brown shrink-0" />
          <p className="text-sm font-bold text-brown">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-brown/40 hover:text-brown">
            <X className="h-4 w-4" />
          </button>
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

      {/* ── Vendors tab ──────────────────────────────────────────────────── */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search vendors by name, city, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
            />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                  <tr>
                    <th className="px-8 py-5">Vendor Name</th>
                    <th className="px-8 py-5">Location</th>
                    <th className="px-8 py-5">Contact</th>
                    <th className="px-8 py-5">Invoices</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-forest/40 dark:text-neutral-500 font-medium">
                        {vendors.length === 0 ? 'No vendors yet. Add your first vendor above.' : 'No vendors match your search.'}
                      </td>
                    </tr>
                  ) : filteredVendors.map((v) => {
                    const vendorInvoiceCount = invoices.filter(i => i.VendorId === v.VendorId).length;
                    return (
                      <tr key={v.VendorId} className="group hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/5 dark:bg-neutral-800 text-forest dark:text-neutral-400 shrink-0">
                              <Truck className="h-5 w-5" />
                            </div>
                            <div className="font-bold text-forest dark:text-white">{v.VendorName || `Vendor #${v.VendorId}`}</div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-forest/70 dark:text-neutral-300 font-medium">{v.HQCity}, {v.HQState} {v.HQZip}</div>
                          <div className="text-xs text-forest/40 dark:text-neutral-500">{v.HQAddress}</div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-forest/70 dark:text-neutral-300 font-medium">{v.Email}</div>
                          <div className="text-xs text-forest/40 dark:text-neutral-500">{v.Phone}</div>
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => { setFilterVendorId(v.VendorId); setActiveTab('invoices'); }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-forest/5 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-forest/60 dark:text-neutral-400 hover:bg-brown/10 hover:text-brown transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            {vendorInvoiceCount}
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(v)}
                              className="rounded-xl p-2.5 text-forest/30 hover:bg-forest/10 hover:text-forest transition-colors"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setVendorToDelete(v)}
                              className="rounded-xl p-2.5 text-forest/30 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoices tab ─────────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search invoices…"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-10 pr-4 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-neutral-400 shrink-0" />
              <select
                value={filterVendorId}
                onChange={(e) => setFilterVendorId(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 pl-3 pr-8 text-sm focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/20 dark:text-white"
              >
                <option value="">All Vendors</option>
                {vendors.map(v => (
                  <option key={v.VendorId} value={v.VendorId}>{v.VendorName || `Vendor #${v.VendorId}`}</option>
                ))}
              </select>
              {filterVendorId !== '' && (
                <button
                  onClick={() => setFilterVendorId('')}
                  className="rounded-lg p-1 text-forest/30 hover:text-forest transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Invoices table */}
          <div className="overflow-hidden rounded-[32px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-forest/5 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-forest/40 dark:text-neutral-400">
                  <tr>
                    <th className="px-8 py-5">Invoice #</th>
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Vendor</th>
                    <th className="px-8 py-5">Description</th>
                    <th className="px-8 py-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5 dark:divide-neutral-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-forest/40 dark:text-neutral-500 font-medium">
                        {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match your filters.'}
                      </td>
                    </tr>
                  ) : filteredInvoices.map((inv) => (
                    <tr
                      key={inv.InvoiceId}
                      className="group hover:bg-cream/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center gap-2 font-bold text-forest dark:text-white">
                          <FileText className="h-4 w-4 text-forest/30" />
                          #{inv.InvoiceId}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-forest/70 dark:text-neutral-300 font-medium">
                        {new Date(inv.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex items-center rounded-xl bg-forest/5 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-forest/60 dark:text-neutral-400">
                          {inv.VendorName ?? inv.VendorCity ?? `Vendor #${inv.VendorId}`}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-forest/60 dark:text-neutral-400 font-medium max-w-xs truncate">
                        {inv.Desc}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className={cn(
                          'font-bold text-base',
                          inv.TotalPrice > 500 ? 'text-forest dark:text-white' : 'text-forest/60 dark:text-neutral-300'
                        )}>
                          ${inv.TotalPrice.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {filteredInvoices.length > 0 && (
            <div className="flex items-center justify-end gap-6 px-2 text-sm">
              <span className="text-forest/40 dark:text-neutral-500 font-medium">
                {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
              </span>
              <span className="font-bold text-forest dark:text-white">
                Total: ${filteredInvoices.reduce((sum, i) => sum + i.TotalPrice, 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Vendor Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {(isAddingVendor || editingVendor) && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-forest dark:text-white">
                  {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                </h2>
                <button
                  onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
                  className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              {formError && (
                <div className="flex items-center gap-3 mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 text-brown shrink-0" />
                  <p className="text-sm font-bold text-brown">{formError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Vendor Name</label>
                  <input
                    type="text"
                    value={formData.VendorName}
                    onChange={(e) => setFormData({ ...formData, VendorName: e.target.value })}
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    placeholder="e.g. Feeding Southwest Virginia"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Email</label>
                    <input
                      type="email"
                      value={formData.Email}
                      onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="vendor@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Phone</label>
                    <input
                      type="tel"
                      value={formData.Phone}
                      onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="(540) 555-0100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Address</label>
                  <input
                    type="text"
                    value={formData.HQAddress}
                    onChange={(e) => setFormData({ ...formData, HQAddress: e.target.value })}
                    className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    placeholder="1025 Electric Rd"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">City</label>
                    <input
                      type="text"
                      value={formData.HQCity}
                      onChange={(e) => setFormData({ ...formData, HQCity: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="Salem"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">State</label>
                    <input
                      type="text"
                      value={formData.HQState}
                      onChange={(e) => setFormData({ ...formData, HQState: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="VA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">ZIP</label>
                    <input
                      type="text"
                      value={formData.HQZip}
                      onChange={(e) => setFormData({ ...formData, HQZip: e.target.value })}
                      className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-6 py-4 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                      placeholder="24153"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-10">
                <button
                  type="button"
                  onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
                  className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {editingVendor ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {vendorToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setVendorToDelete(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl text-center border border-forest/5"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-red-50 text-brown mb-6 shadow-lg shadow-red-100">
                <Trash2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-display font-bold text-forest dark:text-white mb-2">Delete Vendor?</h2>
              <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mb-10 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-forest dark:text-white">{vendorToDelete.VendorName || `Vendor #${vendorToDelete.VendorId}`}</span>? This will also affect linked invoices.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setVendorToDelete(null)}
                  className="flex-1 rounded-2xl border border-forest/10 px-6 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-2xl bg-brown px-6 py-4 text-sm font-bold text-white hover:bg-brown-dark transition-all shadow-xl shadow-brown/20 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Invoice Detail Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-forest dark:text-white">Invoice #{selectedInvoice.InvoiceId}</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-1">
                    {selectedInvoice.VendorName ?? selectedInvoice.VendorCity} · {new Date(selectedInvoice.Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
                >
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm font-bold text-forest dark:text-white">{selectedInvoice.Desc || '—'}</p>
                </div>
                <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                  <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-xl font-display font-bold text-forest dark:text-white">${selectedInvoice.TotalPrice.toFixed(2)}</p>
                </div>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Line Items</h3>
                  {selectedInvoice.items.map((item) => (
                    <div key={item.InvoiceItemId} className="flex items-center justify-between p-4 rounded-[24px] border border-forest/5 dark:border-neutral-700 bg-cream/10 dark:bg-neutral-800/50">
                      <div>
                        <p className="text-sm font-bold text-forest dark:text-white">{item.ProductName}</p>
                        <p className="text-xs text-forest/40 dark:text-neutral-500">{item.CategoryName}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-bold text-forest dark:text-white">
                          {item.Quantity} × ${item.UnitPrice.toFixed(2)}
                        </p>
                        <p className="text-xs text-forest/40 dark:text-neutral-500">
                          ${(item.Quantity * item.UnitPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-forest/40 dark:text-neutral-500 text-center py-6 font-medium">
                  Line item details are loaded when the invoice is fetched individually.
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

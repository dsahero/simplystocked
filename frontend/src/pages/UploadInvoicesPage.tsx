import React, { useState, useRef, useEffect } from 'react';
import { FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, X, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractInvoiceData } from '../services/geminiService';
import { InvoiceData, InvoiceItem } from '../types';
import { cn } from '../lib/utils';
import { ProductSearchInput } from '../components/ui/ProductSearchInput';
import { ApiProduct } from '../api/products';
import { createInvoice, InvoiceLineItem } from '../api/invoices';
import { getAllVendors, ApiVendor } from '../api/vendors';

type Program = 'open_market' | 'grocery';
const PROGRAMS: { value: Program; label: string }[] = [
  { value: 'open_market', label: 'Open Market' },
  { value: 'grocery', label: 'Grocery Store' },
];

// ── Field hint tooltip ───────────────────────────────────────────────────────
function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center ml-1.5 cursor-help align-middle">
      <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
      <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 rounded-2xl bg-forest dark:bg-neutral-800 text-white text-[10px] leading-relaxed px-3 py-2.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-[200] font-medium shadow-xl whitespace-normal">
        {children}
      </span>
    </span>
  );
}

// ── Storage type badge ───────────────────────────────────────────────────────
function StorageBadge({ type }: { type?: string }) {
  if (!type) return null;
  const styles: Record<string, string> = {
    Frozen: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    Refrigerated: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    Dry: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  };
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold', styles[type] ?? 'bg-forest/5 text-forest/60')}>
      {type}
    </span>
  );
}

// ── Blank item factory ───────────────────────────────────────────────────────
function blankItem(): InvoiceItem {
  return { name: '', unit: 'Case', quantity: 1, unitPrice: 0, cost: 0, isPerishable: false };
}

// ── Item card ────────────────────────────────────────────────────────────────
interface ItemCardProps {
  item: InvoiceItem;
  idx: number;
  matched: ApiProduct | null;
  program: Program;
  onChange: (idx: number, updates: Partial<InvoiceItem>) => void;
  onSelect: (idx: number, product: ApiProduct) => void;
  onClear: (idx: number) => void;
  onProgramChange: (idx: number, program: Program) => void;
  onRemove?: (idx: number) => void;
}

function ItemCard({ item, idx, matched, program, onChange, onSelect, onClear, onProgramChange, onRemove }: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const qtyMismatch = item.quantityOrdered !== undefined && item.quantityOrdered !== item.quantity;
  const isDonationPricing = item._priceLabel === 'Unit Fee' || item.unitPrice < 1;

  return (
    <div className={cn(
      'rounded-[28px] border bg-white dark:bg-neutral-800 shadow-sm overflow-hidden transition-all',
      matched ? 'border-brown/20' : 'border-forest/5 dark:border-neutral-700'
    )}>
      {/* Card header — always visible */}
      <div className="p-5">
        {/* Match row */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
              Match to Existing Product
            </label>
            <div className="flex items-center gap-2">
              {matched && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brown">
                  <CheckCircle className="h-3 w-3" /> Matched
                </span>
              )}
              {!matched && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forest/30 dark:text-neutral-500">
                  <AlertTriangle className="h-3 w-3" /> Unmatched — will be skipped
                </span>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="rounded-lg p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-forest/20 hover:text-red-500 transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <ProductSearchInput
            selected={matched}
            onSelect={(p) => onSelect(idx, p)}
            onClear={() => onClear(idx)}
            placeholder={`Search for "${item.name}"…`}
          />
        </div>

        {/* Core info row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Item Name */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Item Name</label>
            <input
              type="text"
              value={item.name}
              onChange={(e) => onChange(idx, { name: e.target.value })}
              className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
            />
          </div>

          {/* Qty */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
              Qty Received
              <FieldHint>
                Keany invoices show both "QTY Ordered" and "QTY Shipped" — this uses the shipped amount.
                FSWV and US Foods have a single quantity column.
              </FieldHint>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={item.quantity}
                onChange={(e) => onChange(idx, { quantity: parseFloat(e.target.value) || 0 })}
                className={cn(
                  'w-full rounded-xl border bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all',
                  qtyMismatch
                    ? 'border-amber-300 focus:border-amber-400'
                    : 'border-forest/10 dark:border-neutral-700 focus:border-brown'
                )}
              />
              {qtyMismatch && (
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Ordered: {item.quantityOrdered}
                </div>
              )}
            </div>
          </div>

          {/* Unit Price */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
              {item._priceLabel ?? 'Unit Price'}
              <FieldHint>
                FSWV calls this "Unit Fee" — often $0–$4 for donated/subsidized items.
                Keany and US Foods call it "Unit Price". Same meaning: cost per case or pound.
              </FieldHint>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-forest/40">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.unitPrice}
                onChange={(e) => onChange(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                className={cn(
                  'w-full rounded-xl border bg-cream/20 dark:bg-neutral-900 pl-6 pr-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all',
                  isDonationPricing
                    ? 'border-amber-200 focus:border-amber-400'
                    : 'border-forest/10 dark:border-neutral-700 focus:border-brown'
                )}
              />
              {isDonationPricing && (
                <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600">
                  <HelpCircle className="h-3 w-3" />
                  Donation / subsidized price
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Program selector */}
        <div className="mt-4">
          <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Assign to Program</label>
          <div className="flex gap-2 mt-1.5">
            {PROGRAMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onProgramChange(idx, p.value)}
                className={cn(
                  'flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95',
                  program === p.value
                    ? 'border-brown bg-brown/5 text-brown dark:bg-brown/10'
                    : 'border-forest/10 dark:border-neutral-700 text-forest/50 dark:text-neutral-400 hover:border-brown/30'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-forest/[0.02] dark:bg-neutral-900/50 border-t border-forest/5 dark:border-neutral-700 text-[10px] font-bold text-forest/40 dark:text-neutral-500 hover:bg-forest/5 transition-colors"
      >
        <span>Additional details (SKU, pack size, brand, weight)</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* Expanded detail fields */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-forest/5 dark:border-neutral-700">
              {/* Vendor SKU */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Vendor SKU
                  <FieldHint>
                    FSWV: "Item No." (e.g. DF10073) · Keany: item code (e.g. P0100) · US Foods: "Product Number" (e.g. 0149591)
                  </FieldHint>
                </label>
                <input
                  type="text"
                  value={item.vendorSku ?? ''}
                  onChange={(e) => onChange(idx, { vendorSku: e.target.value })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  placeholder="e.g. DF10073"
                />
              </div>

              {/* Pack Size */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Pack Size
                  <FieldHint>
                    How the case is packed: · FSWV: embedded in name e.g. "12/15 oz. Cans" · Keany: separate column e.g. "40 LB" or "88/100 CT" · US Foods: "48/4.25 OZ" = 48 pieces × 4.25 oz
                  </FieldHint>
                </label>
                <input
                  type="text"
                  value={item.packSize ?? ''}
                  onChange={(e) => onChange(idx, { packSize: e.target.value })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  placeholder="e.g. 40 LB, 48/4.25 OZ"
                />
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Unit
                  <FieldHint>
                    FSWV: "Case" or "Pound" · Keany: "Case" (pack weight in Pack Size field) · US Foods: "CS" (= Case). All refer to the outer shipping unit.
                  </FieldHint>
                </label>
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) => onChange(idx, { unit: e.target.value })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  placeholder="Case / Pound / CS"
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Brand / Label
                  <FieldHint>
                    US Foods: explicit "Label" column (e.g. YOPLAIT, KRAFT) · FSWV: encoded in description e.g. "(KA)" = Kroger · Keany produce: no brand
                  </FieldHint>
                </label>
                <input
                  type="text"
                  value={item.brand ?? ''}
                  onChange={(e) => onChange(idx, { brand: e.target.value })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  placeholder="e.g. KRAFT, Yoplait"
                />
              </div>

              {/* Gross Weight */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Weight (lbs)
                  <FieldHint>
                    FSWV: "Gross Weight" column = total lbs for that line · Keany: per-unit pack weight (from Pack field) · US Foods: shown for weight-priced items only
                  </FieldHint>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={item.grossWeightLbs ?? ''}
                  onChange={(e) => onChange(idx, { grossWeightLbs: parseFloat(e.target.value) || undefined })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  placeholder="lbs"
                />
              </div>

              {/* Storage type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center">
                  Storage Type
                  <FieldHint>
                    US Foods explicitly categorizes lines as Dry, Refrigerated, or Frozen. FSWV and Keany don't — inferred from the product type.
                  </FieldHint>
                </label>
                <select
                  value={item.storageType ?? ''}
                  onChange={(e) => onChange(idx, { storageType: e.target.value || undefined })}
                  className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                >
                  <option value="">Unknown</option>
                  <option value="Dry">Dry</option>
                  <option value="Refrigerated">Refrigerated</option>
                  <option value="Frozen">Frozen</option>
                </select>
              </div>

              {/* Line total */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Line Total ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-forest/40">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.cost}
                    onChange={(e) => onChange(idx, { cost: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 pl-6 pr-3 py-2.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                  />
                </div>
              </div>

              {/* Perishable */}
              <div className="sm:col-span-2 flex items-start gap-4 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isPerishable}
                    onChange={(e) => onChange(idx, { isPerishable: e.target.checked })}
                    className="h-4 w-4 rounded border-forest/10 text-brown focus:ring-brown"
                  />
                  <span className="text-sm font-bold text-forest/60 dark:text-neutral-300">Perishable</span>
                </label>
                {item.isPerishable && (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold text-forest/40 uppercase tracking-widest whitespace-nowrap">Exp. Date</span>
                    <input
                      type="date"
                      value={item.expirationDate ?? ''}
                      onChange={(e) => onChange(idx, { expirationDate: e.target.value })}
                      className="rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-1.5 text-xs font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                    />
                  </div>
                )}
                {item.storageType && <StorageBadge type={item.storageType} />}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function UploadInvoicesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [rawText, setRawText] = useState('');
  const [reviewData, setReviewData] = useState<InvoiceData | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [error, setError] = useState('');
  const [commitError, setCommitError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const [matchedProducts, setMatchedProducts] = useState<{ [idx: number]: ApiProduct | null }>({});
  const [itemPrograms, setItemPrograms] = useState<{ [idx: number]: Program }>({});
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [vendorId, setVendorId] = useState<number | null>(null);

  useEffect(() => {
    getAllVendors().then(setVendors).catch(() => {});
  }, []);

  useEffect(() => {
    if (reviewData) {
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [reviewData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const data = await extractInvoiceData({ data: base64, mimeType: file.type });
        setReviewData(data);
        setIsProcessing(false);
      } catch {
        setError('Failed to process file. Please try again or paste text.');
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError('');
    try {
      const data = await extractInvoiceData(rawText);
      setReviewData(data);
    } catch {
      setError('Failed to parse text. Please check the format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    setIsManualEntry(true);
    setError('');
    setCommitError('');
    setMatchedProducts({});
    setItemPrograms({});
    setReviewData({
      vendorName: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      totalCost: 0,
      items: [blankItem()],
    });
  };

  const handleAddItem = () => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, items: [...reviewData.items, blankItem()] });
  };

  const handleRemoveItem = (idx: number) => {
    if (!reviewData) return;
    const newItems = reviewData.items.filter((_, i) => i !== idx);
    const newMatched = Object.fromEntries(
      Object.entries(matchedProducts)
        .filter(([k]) => Number(k) !== idx)
        .map(([k, v]) => [Number(k) > idx ? Number(k) - 1 : k, v])
    );
    const newPrograms = Object.fromEntries(
      Object.entries(itemPrograms)
        .filter(([k]) => Number(k) !== idx)
        .map(([k, v]) => [Number(k) > idx ? Number(k) - 1 : k, v])
    );
    setReviewData({ ...reviewData, items: newItems });
    setMatchedProducts(newMatched);
    setItemPrograms(newPrograms as typeof itemPrograms);
  };

  const handleItemChange = (idx: number, updates: Partial<InvoiceItem>) => {
    if (!reviewData) return;
    const newItems = [...reviewData.items];
    newItems[idx] = { ...newItems[idx], ...updates };
    setReviewData({ ...reviewData, items: newItems });
  };

  const handleCommit = async () => {
    if (!reviewData) return;
    setIsCommitting(true);
    setCommitError('');

    const matchedItems: InvoiceLineItem[] = reviewData.items
      .map((item, idx) => {
        const product = matchedProducts[idx];
        if (!product) return null;
        return {
          product_id: product.FoodProductId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          program: itemPrograms[idx] ?? 'open_market',
        } as InvoiceLineItem;
      })
      .filter((x): x is InvoiceLineItem => x !== null);

    if (matchedItems.length === 0) {
      setCommitError('Match at least one item to an existing product before committing.');
      setIsCommitting(false);
      return;
    }

    const blank = { attn: '', address: '', city: '', state: '', zip_code: '', phone: '', email: '' };
    try {
      await createInvoice({
        date: reviewData.date,
        desc: reviewData.vendorName ?? 'Invoice',
        vendor_id: vendorId ?? (vendors[0]?.VendorId ?? 1),
        from_details: blank,
        bill_to_details: blank,
        delivery_details: blank,
        items: matchedItems,
      });
      setCommitSuccess(true);
      setReviewData(null);
      setIsManualEntry(false);
      setRawText('');
      setMatchedProducts({});
      setItemPrograms({});
      setVendorId(null);
      setTimeout(() => setCommitSuccess(false), 4000);
    } catch (err: any) {
      setCommitError(err.message ?? 'Failed to commit invoice.');
    } finally {
      setIsCommitting(false);
    }
  };

  const matchedCount = reviewData ? reviewData.items.filter((_, i) => matchedProducts[i]).length : 0;
  const totalCount = reviewData?.items.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Upload Invoices</h1>
        <p className="text-forest/60 dark:text-neutral-400 font-medium">Extract inventory data from images or PDFs using AI — supports FSWV, Keany, and US Foods formats.</p>
      </header>

      {commitSuccess && (
        <div className="flex items-center gap-4 rounded-[24px] bg-green-50 dark:bg-green-900/20 p-6 border border-green-100 dark:border-green-900/30">
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-bold text-green-700 dark:text-green-400">Invoice committed successfully! Stock has been updated.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Image / PDF Upload */}
        <div className="rounded-[40px] border-2 border-dashed border-forest/10 bg-white dark:bg-neutral-900 p-10 text-center hover:border-brown transition-all group cursor-pointer shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-forest/5 text-forest group-hover:scale-110 group-hover:bg-forest group-hover:text-white transition-all duration-500">
            <ImageIcon className="h-10 w-10" />
          </div>
          <h3 className="mt-6 text-xl font-display font-bold text-forest dark:text-white">Upload Invoice</h3>
          <p className="mt-2 text-sm text-forest/40 dark:text-neutral-400 font-medium leading-relaxed">Upload a photo, scan, or PDF of your invoice (JPG, PNG, PDF).</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="mt-8 w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
          >
            Select File
          </button>
        </div>

        {/* Text Paste */}
        <div className="rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-forest/5 text-forest shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-forest dark:text-white">Paste Raw Text</h3>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste invoice details here..."
            className="flex-1 min-h-[9rem] w-full rounded-[24px] border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 p-5 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white resize-none"
          />
          <button
            onClick={handleTextSubmit}
            disabled={isProcessing || !rawText.trim()}
            className="mt-5 w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
          >
            Process Text
          </button>
        </div>

        {/* Manual Entry */}
        <div className="rounded-[40px] border-2 border-dashed border-forest/10 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 shadow-sm flex flex-col items-center text-center hover:border-brown transition-all group">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-forest/5 text-forest group-hover:scale-110 group-hover:bg-forest group-hover:text-white transition-all duration-500 mb-5">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-display font-bold text-forest dark:text-white">Manual Entry</h3>
          <p className="mt-2 text-sm text-forest/40 dark:text-neutral-400 font-medium leading-relaxed flex-1">
            No image? Fill out the invoice form by hand — line by line.
          </p>
          <button
            onClick={handleManualEntry}
            className="mt-6 w-full rounded-2xl bg-forest/5 dark:bg-neutral-800 border border-forest/10 dark:border-neutral-700 px-6 py-4 text-sm font-bold text-forest dark:text-white hover:bg-forest hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 transition-all active:scale-95"
          >
            Start Manual Entry
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-brown/20 animate-ping" />
            <Loader2 className="h-16 w-16 animate-spin text-brown relative z-10" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-forest dark:text-white">AI is reading your invoice…</p>
            <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-2">This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-4 rounded-[24px] bg-red-50 dark:bg-red-900/20 p-6 text-brown dark:text-red-400 border border-red-100 dark:border-red-900/30 shadow-sm">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* ── Review panel (inline, not a modal) ────────────────────────────── */}
      <AnimatePresence>
        {reviewData && (
          <motion.div
            ref={reviewRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="rounded-[48px] border border-forest/5 bg-white dark:bg-neutral-900 shadow-2xl p-8 space-y-8"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-forest dark:text-white">
                  {isManualEntry ? 'Manual Invoice Entry' : 'Review Invoice'}
                </h2>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-1">
                  {isManualEntry
                    ? 'Add each line item, match to a product, then commit.'
                    : 'Verify AI-extracted data, match each item to a product, then commit.'}
                </p>
              </div>
              <button
                onClick={() => { setReviewData(null); setIsManualEntry(false); }}
                className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
              >
                <X className="h-6 w-6 text-forest/40" />
              </button>
            </div>

            {/* Invoice meta */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Vendor</p>
                <input
                  type="text"
                  value={reviewData.vendorName ?? ''}
                  onChange={(e) => setReviewData({ ...reviewData, vendorName: e.target.value })}
                  className="text-sm font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                  placeholder="Vendor name"
                />
              </div>
              <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Invoice #</p>
                <input
                  type="text"
                  value={reviewData.invoiceNumber ?? ''}
                  onChange={(e) => setReviewData({ ...reviewData, invoiceNumber: e.target.value })}
                  className="text-sm font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                  placeholder="e.g. GR-112422"
                />
              </div>
              <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Invoice Date</p>
                <input
                  type="date"
                  value={reviewData.date}
                  onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                  className="text-sm font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                />
              </div>
              <div className="rounded-[20px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-4">
                <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Total</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-forest dark:text-white">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={reviewData.totalCost}
                    onChange={(e) => setReviewData({ ...reviewData, totalCost: parseFloat(e.target.value) || 0 })}
                    className="text-sm font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Vendor selector */}
            {vendors.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                  Link to Vendor Record
                </label>
                <select
                  value={vendorId ?? ''}
                  onChange={(e) => setVendorId(Number(e.target.value) || null)}
                  className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-5 py-3.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.VendorId} value={v.VendorId}>
                      {v.HQCity}, {v.HQState} — {v.Email || `Vendor #${v.VendorId}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-forest dark:text-white">
                  Line Items
                </h3>
                <span className={cn(
                  'text-sm font-bold px-3 py-1 rounded-full',
                  matchedCount === totalCount
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                )}>
                  {matchedCount}/{totalCount} matched
                </span>
              </div>

              {reviewData.items.map((item, idx) => (
                <ItemCard
                  key={idx}
                  item={item}
                  idx={idx}
                  matched={matchedProducts[idx] ?? null}
                  program={itemPrograms[idx] ?? 'open_market'}
                  onChange={handleItemChange}
                  onSelect={(i, p) => setMatchedProducts({ ...matchedProducts, [i]: p })}
                  onClear={(i) => setMatchedProducts({ ...matchedProducts, [i]: null })}
                  onProgramChange={(i, p) => setItemPrograms({ ...itemPrograms, [i]: p })}
                  onRemove={reviewData.items.length > 1 ? handleRemoveItem : undefined}
                />
              ))}

              {/* Add line item button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full flex items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-forest/10 dark:border-neutral-700 py-4 text-sm font-bold text-forest/40 dark:text-neutral-500 hover:border-brown hover:text-brown dark:hover:border-brown dark:hover:text-brown transition-all active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Add Line Item
              </button>
            </div>

            {/* Commit section */}
            {commitError && (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-5 w-5 text-brown shrink-0" />
                <p className="text-sm font-bold text-brown">{commitError}</p>
              </div>
            )}

            {matchedCount < totalCount && (
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-5 border border-amber-100 dark:border-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  <span className="font-bold">{totalCount - matchedCount} item{totalCount - matchedCount !== 1 ? 's' : ''}</span> will be skipped — they need to be matched to an existing product before they can be committed.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-2">
              <button
                onClick={() => { setReviewData(null); setIsManualEntry(false); }}
                className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={isCommitting || matchedCount === 0}
                className="flex items-center gap-3 rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95 disabled:opacity-50"
              >
                {isCommitting ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Committing…</>
                ) : (
                  <><CheckCircle className="h-5 w-5" /> Commit {matchedCount} Item{matchedCount !== 1 ? 's' : ''}</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

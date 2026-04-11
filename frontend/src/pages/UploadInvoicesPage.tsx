import React, { useState, useRef, useEffect } from 'react';
import { FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, X, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, ClipboardList, Plus, Trash2, Cpu, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InvoiceData, InvoiceItem } from '../types';
import { cn } from '../lib/utils';
import { ProductSearchInput } from '../components/ui/ProductSearchInput';
import { ApiProduct } from '../api/products';
import { createInvoice, InvoiceLineItem } from '../api/invoices';
import { getAllVendors, ApiVendor, createVendor } from '../api/vendors';
import { checkOcrHealth, ocrImageToInvoice, ocrTextToInvoice, OcrHealthResponse } from '../api/ocr';
import { getAllProducts, createProduct } from '../api/products';
import { getAllCategories, ApiCategory } from '../api/categories';

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

// ── Image Downscaler ─────────────────────────────────────────────────────────
const downscaleImageBase64 = (dataUrl: string, mimeType: string, maxDim: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    console.log(`[DEBUG - Frontend] downscaleImageBase64: Init called with mimeType=${mimeType}, maxDim=${maxDim}`);
    if (!mimeType.startsWith('image/')) {
      console.log(`[DEBUG - Frontend] downscaleImageBase64: Not an image (${mimeType}), bypassing logic`);
      resolve(dataUrl.split(',')[1]);
      return;
    }
    const img = new Image();
    img.onload = () => {
      console.log(`[DEBUG - Frontend] downscaleImageBase64: Image natively loaded (${img.width}x${img.height})`);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn(`[DEBUG - Frontend] downscaleImageBase64: Canvas ctx could not be established`);
        resolve(dataUrl.split(',')[1]);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      console.log(`[DEBUG - Frontend] downscaleImageBase64: Canvas drawImage completed. Extracting DataUrl base64...`);
      resolve(canvas.toDataURL(mimeType, 0.85).split(',')[1]);
    };
    img.onerror = (err) => {
      console.error(`[DEBUG - Frontend] downscaleImageBase64: FAILED TO LOAD IMAGE`, err);
      reject(err);
    };
    console.log(`[DEBUG - Frontend] downscaleImageBase64: Assigning src dataUrl...`);
    img.src = dataUrl;
  });
};

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
            {matched && matched.FoodProductId !== -1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brown">
                  <CheckCircle className="h-3 w-3" /> Matched
                </span>
              )}
              {matched && matched.FoodProductId === -1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
                  <Plus className="h-3 w-3" /> New Product
                </span>
              )}
              {!matched && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forest/30 dark:text-neutral-500">
                  <AlertTriangle className="h-3 w-3" /> Unmatched
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

        {/* New Product Specific: Category Selection */}
        {matched?.FoodProductId === -1 && (
          <div className="mt-4 space-y-1">
            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
              Assign Category for New Product <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-900/5 px-3 py-2 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
              value={matched.CategoryId}
              onChange={(e) => {
                const catId = Number(e.target.value);
                const catName = categories.find(c => c.CategoryId === catId)?.CategoryName ?? 'Unknown';
                onSelect(idx, { ...matched, CategoryId: catId, CategoryName: catName });
              }}
            >
              <option value="-1">Select a category...</option>
              {categories.map(c => (
                <option key={c.CategoryId} value={c.CategoryId}>{c.CategoryName}</option>
              ))}
            </select>
          </div>
        )}

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

// ── String Similarity Helper ────────────────────────────────────────────────
function getSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const v1 = s1.toLowerCase().trim();
  const v2 = s2.toLowerCase().trim();
  if (v1 === v2) return 1.0;
  
  // Very basic overlap matching
  const words1 = v1.split(/\s+/);
  const words2 = v2.split(/\s+/);
  let matches = 0;
  for (const w1 of words1) {
    if (words2.some(w2 => w2 === w1 || w2.includes(w1) || w1.includes(w2))) {
      matches++;
    }
  }
  return matches / Math.max(words1.length, words2.length);
}

// ── Auto-matching Logic ───────────────────────────────────────────────────
function autoMatchEntities(
  invoiceData: InvoiceData,
  currentVendors: ApiVendor[],
  currentProducts: ApiProduct[],
  setVendorId: (id: number | null) => void,
  setIsNewVendor: (val: boolean) => void,
  setMatchedProducts: (matched: { [idx: number]: ApiProduct | null }) => void
) {
  // 1. Match Vendor
  console.log(`[DEBUG - AutoMatch] Matching Vendor: "${invoiceData.vendorName}" against ${currentVendors.length} vendors`);
  if (invoiceData.vendorName) {
    let bestMatch: ApiVendor | null = null;
    let maxSim = 0;
    for (const v of currentVendors) {
      const sim = getSimilarity(invoiceData.vendorName, v.VendorName);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = v;
      }
    }
    console.log(`[DEBUG - AutoMatch] Best Vendor Match: "${bestMatch?.VendorName}" (Score: ${maxSim.toFixed(2)})`);
    if (bestMatch && maxSim > 0.6) {
      setVendorId(bestMatch.VendorId);
      setIsNewVendor(false);
    } else {
      setVendorId(null);
      setIsNewVendor(true); 
    }
  }

  // 2. Match Products
  console.log(`[DEBUG - AutoMatch] Matching ${invoiceData.items.length} items against ${currentProducts.length} products`);
  const newMatches: { [idx: number]: ApiProduct | null } = {};
  invoiceData.items.forEach((item, idx) => {
    let bestMatch: ApiProduct | null = null;
    let maxSim = 0;
    for (const p of currentProducts) {
      const sim = getSimilarity(item.name, p.ProductName);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = p;
      }
    }
    console.log(`[DEBUG - AutoMatch] Item [${idx}] "${item.name}" -> Best Match: "${bestMatch?.ProductName}" (Score: ${maxSim.toFixed(2)})`);
    if (bestMatch && maxSim > 0.3) { // Greedy matching
      newMatches[idx] = bestMatch;
    } else {
      newMatches[idx] = {
        FoodProductId: -1,
        ProductName: item.name,
        ProductPrice: item.unitPrice || 0,
        CategoryId: -1,
        CategoryName: 'New Product',
        StockLevelId: null,
        StockLevel: null,
        Quantity: 0,
        OpenMarketQuantity: 0,
        GroceryStoreQuantity: 0,
        LastUpdated: null
      };
    }
  });
  setMatchedProducts(newMatches);
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function UploadInvoicesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [visionModel, setVisionModel] = useState('qwen2.5vl:3b');
  const [parsingModel, setParsingModel] = useState('llama3.2');
  const [processingPhase, setProcessingPhase] = useState<'reading' | 'parsing' | 'finalizing' | null>(null);
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
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [isNewVendor, setIsNewVendor] = useState(false);
  const [rawScanText, setRawScanText] = useState('');
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);

  // Lists for auto-matching
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  // ── Local Ollama status ───────────────────────────────────────────────────
  const [ollamaStatus, setOllamaStatus] = useState<OcrHealthResponse | null>(null);

  useEffect(() => {
    getAllVendors().then(setVendors).catch(() => {});
    getAllProducts().then(setProducts).catch(() => {});
    getAllCategories().then(setCategories).catch(() => {});

    // Probe Ollama health on mount so we can show the status badge immediately
    checkOcrHealth().then(setOllamaStatus).catch(() =>
      setOllamaStatus({ available: false, models: [], error: 'Could not reach backend' })
    );
  }, []);

  useEffect(() => {
    if (reviewData) {
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [reviewData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`[DEBUG - Frontend] handleFileUpload: Button clicked`);
    const file = e.target.files?.[0];
    if (!file) {
      console.log(`[DEBUG - Frontend] handleFileUpload: No file selected`);
      return;
    }
    console.log(`[DEBUG - Frontend] handleFileUpload: Selected File Info -> Name: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

    // Reset input so the same file can be re-uploaded if needed
    e.target.value = '';

    setIsProcessing(true);
    setProcessingPhase('ocr');
    setError('');

    const reader = new FileReader();
    reader.onload = async () => {
      console.log(`[DEBUG - Frontend] handleFileUpload: FileReader onload successfully triggered`);
      try {
        const dataUrl = reader.result as string;
        
        // Phase 1: Image Processing
        setProcessingPhase('reading');
        
        let base64: string;
        console.log(`[DEBUG - Frontend] handleFileUpload: Attempting data processing step...`);
        if (file.type.startsWith('image/')) {
          console.log(`[DEBUG - Frontend] handleFileUpload: Resolving image downscaler pipeline...`);
          base64 = await downscaleImageBase64(dataUrl, file.type, 1280);
          console.log(`[DEBUG - Frontend] handleFileUpload: Image downscaler resolved successfully`);
        } else {
          console.log(`[DEBUG - Frontend] handleFileUpload: File is PDF/other, extracting raw base64 split...`);
          base64 = dataUrl.split(',')[1];
          console.log(`[DEBUG - Frontend] handleFileUpload: Base64 string split success`);
        }

        // Phase 2: AI Parsing
        setProcessingPhase('parsing');

        console.log(`[DEBUG - Frontend] handleFileUpload: Launching fetch command to API backend endpoint 'ocrImageToInvoice' with model '${ocrModel}'...`);
        const result = await ocrImageToInvoice(base64, file.type, ocrModel);
        console.log(`[DEBUG - Frontend] handleFileUpload: API fetch returned!`, result);
        console.log(`[DEBUG - Frontend] handleFileUpload: Invoice Data:`, result.invoice_data);
        setRawApiResponse(result.invoice_data);

        setRawScanText(result.raw_text || ''); 

        // Phase 3: Finalizing UI
        setProcessingPhase('finalizing');
        
        console.log(`[DEBUG - Frontend] Launching Auto-Match... Vendors: ${vendors.length}, Products: ${products.length}`);
        autoMatchEntities(
          result.invoice_data,
          vendors,
          products,
          setVendorId,
          setIsNewVendor,
          setMatchedProducts
        );

        // Small delay so the user sees the 'Finalizing' state
        await new Promise(r => setTimeout(r, 800));

        setReviewData(result.invoice_data);
        // setRawScanText(''); // KEEP raw text for debugging as requested
        setIsManualEntry(true); 
        setProcessingPhase(null);
        setIsProcessing(false);
        console.log(`[DEBUG - Frontend] handleFileUpload: Success path finished`);
      } catch (err: any) {
        console.error(`[DEBUG - Frontend] handleFileUpload: CAUGHT ERROR IN PIPELINE:`, err);
        setError(
          err.message ?? 'Local OCR failed. Make sure Ollama is running and the model is pulled.'
        );
        setIsProcessing(false);
        setProcessingPhase(null);
      }
    };
    reader.onerror = (err) => {
        console.error(`[DEBUG - Frontend] handleFileUpload: FileReader encountered an error:`, err);
        setError('Error reading local file.');
        setIsProcessing(false);
        setProcessingPhase(null);
    }
    console.log(`[DEBUG - Frontend] handleFileUpload: Triggering readAsDataURL`);
    reader.readAsDataURL(file);
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setProcessingPhase('parsing');
    setError('');
    try {
      const result = await ocrTextToInvoice(rawText, ocrModel);
      setRawScanText(rawText);
      setProcessingPhase('finalizing');

      autoMatchEntities(
        result.invoice_data,
        vendors,
        products,
        setVendorId,
        setIsNewVendor,
        setMatchedProducts
      );

      await new Promise(r => setTimeout(r, 600));
      setReviewData(result.invoice_data);
      setIsManualEntry(true);
    } catch (err: any) {
      setError(
        err.message ?? 'Local parse failed. Make sure Ollama is running and the model is pulled.'
      );
    } finally {
      setProcessingPhase(null);
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
    setCommitSuccess(false);

    try {
      // 1. Resolve Vendor ID (Create if new)
      let finalVendorId = vendorId;
      if (isNewVendor) {
        console.log(`[DEBUG - Frontend] handleCommit: Creating new vendor: ${reviewData.vendorName}`);
        const newVendor = await createVendor({
          VendorName: reviewData.vendorName ?? 'New Vendor',
          Email: 'info@vendor.com', // Placeholder
          Phone: '',
          HQAddress: '',
          HQCity: '',
          HQState: '',
          HQZip: ''
        });
        finalVendorId = newVendor.VendorId;
        // Update local list for future use
        setVendors(prev => [...prev, newVendor]);
      }

      if (!finalVendorId) {
        throw new Error('Please select or create a vendor.');
      }

      // 2. Resolve Product IDs (Create if new)
      const updatedMatchedProducts = { ...matchedProducts };
      for (const [idxStr, product] of Object.entries(matchedProducts)) {
        const idx = Number(idxStr);
        if (product && product.FoodProductId === -1) {
          console.log(`[DEBUG - Frontend] handleCommit: Creating new product: ${product.ProductName}`);
          
          if (product.CategoryId === -1) {
            throw new Error(`Please assign a category for new product: ${product.ProductName}`);
          }

          const newProd = await createProduct(
            product.ProductName,
            product.ProductPrice || 0,
            product.CategoryId,
            0, 0
          );
          updatedMatchedProducts[idx] = newProd;
          // Update local products list
          setProducts(prev => [...prev, newProd]);
        }
      }
      setMatchedProducts(updatedMatchedProducts);

      // 3. Prepare Line Items
      const matchedItems = reviewData.items
        .map((item, idx) => {
          const product = updatedMatchedProducts[idx];
          if (!product || product.FoodProductId === -1) return null;
          return {
            product_id: product.FoodProductId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            program: itemPrograms[idx] ?? 'open_market',
          } as InvoiceLineItem;
        })
        .filter((x): x is InvoiceLineItem => x !== null);

      if (matchedItems.length === 0) {
        throw new Error('Match or create at least one item before committing.');
      }

      // 4. Create Invoice
      const blank = { attn: '', address: '', city: '', state: '', zip_code: '', phone: '', email: '' };
      await createInvoice({
        date: reviewData.date,
        desc: reviewData.vendorName ?? 'Invoice',
        vendor_id: finalVendorId,
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
      setIsNewVendor(false);
      setRawScanText('');
      setTimeout(() => setCommitSuccess(false), 4000);
    } catch (err: any) {
      console.error(`[DEBUG - Frontend] handleCommit: FAILED`, err);
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
        {/* Image / PDF Upload — local Ollama OCR */}
        <div className="rounded-[40px] border-2 border-dashed border-forest/10 bg-white dark:bg-neutral-900 p-8 text-center hover:border-brown transition-all group cursor-pointer shadow-sm flex flex-col">
          {/* Ollama status badge */}
          <div className="flex justify-center mb-3">
            {ollamaStatus === null ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold bg-forest/5 text-forest/40">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking Ollama…
              </span>
            ) : ollamaStatus.available ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <Wifi className="h-3 w-3" /> Ollama online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" title={ollamaStatus.error}>
                <WifiOff className="h-3 w-3" /> Ollama offline
              </span>
            )}
          </div>

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-forest/5 text-forest group-hover:scale-110 group-hover:bg-forest group-hover:text-white transition-all duration-500">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-display font-bold text-forest dark:text-white">Upload Invoice</h3>
          <p className="mt-1.5 text-sm text-forest/40 dark:text-neutral-400 font-medium leading-relaxed">
            Photo, scan, or PDF processed 100% on-device via local AI. No cloud.
          </p>

          {/* Dual-Model selectors */}
          <div className="mt-6 flex flex-col gap-4 text-left">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Cpu className="h-3 w-3" /> The Eye (Vision)
              </label>
              <select
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2 text-xs font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all shadow-sm"
              >
                {['qwen2.5vl:3b', 'llama3.2-vision', 'moondream:latest', 'llava:13b']
                  .concat(
                    (ollamaStatus?.models ?? []).filter(
                      (m) => m.includes('vision') || m.includes('vl') || m.includes('moondream') || m.includes('llava')
                    ).filter(m => !['qwen2.5vl:3b', 'llama3.2-vision', 'moondream:latest', 'llava:13b'].includes(m))
                  )
                  .map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Fingerprint className="h-3 w-3" /> The Brain (Parser)
              </label>
              <select
                value={parsingModel}
                onChange={(e) => setParsingModel(e.target.value)}
                className="w-full rounded-xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-3 py-2 text-xs font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all shadow-sm"
              >
                {['llama3.2', 'llama3.1', 'mistral', 'phi3']
                  .concat(
                    (ollamaStatus?.models ?? []).filter(
                      (m) => !m.includes('vision') && !m.includes('vl')
                    ).filter(m => !['llama3.2', 'llama3.1', 'mistral', 'phi3'].includes(m))
                  )
                  .map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
              </select>
            </div>
          </div>

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
            className="mt-5 w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
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
            {processingPhase === 'reading' && (
              <>
                <p className="text-2xl font-display font-bold text-forest dark:text-white">📷 Reading image locally…</p>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-2">Step 1 of 3 — Converting scan into pixels via Moondream</p>
              </>
            )}
            {processingPhase === 'parsing' && (
              <>
                <p className="text-2xl font-display font-bold text-forest dark:text-white">🧠 Processing text with Llama…</p>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-2">Step 2 of 3 — Organizing data into invoice fields (Offline)</p>
              </>
            )}
            {processingPhase === 'finalizing' && (
              <>
                <p className="text-2xl font-display font-bold text-forest dark:text-white">✨ Finishing up…</p>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-2">Step 3 of 3 — Preparing your manual entry form</p>
              </>
            )}
            {!processingPhase && (
              <p className="text-2xl font-display font-bold text-forest dark:text-white">Processing…</p>
            )}
          </div>
          
          {/* Live Scan Preview will now show inside the Review Panel when active */}
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
            {/* Raw Scan Output (Diagnostic Context) */}
            {rawScanText && (
              <div className="w-full pb-8 border-b border-forest/5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-forest/40" />
                  <span className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Raw OCR Transcription (Diagnostics)</span>
                </div>
                <div className="rounded-2xl border border-forest/5 bg-forest/[0.02] dark:bg-neutral-900/50 p-4 font-mono text-[10px] text-forest/60 dark:text-neutral-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {rawScanText}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-forest dark:text-white">
                  Invoice Entry
                </h2>
                <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-1">
                  Add or edit line items, match them to products, and commit to inventory.
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
            {!isNewVendor && vendors.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">
                    Link to Vendor Record
                  </label>
                  <button 
                    onClick={() => setIsNewVendor(true)}
                    className="text-[10px] font-bold text-brown hover:underline"
                  >
                    + Create as new vendor
                  </button>
                </div>
                <select
                  value={vendorId ?? ''}
                  onChange={(e) => setVendorId(Number(e.target.value) || null)}
                  className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 px-5 py-3.5 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.VendorId} value={v.VendorId}>
                      {v.VendorName || `${v.HQCity}, ${v.HQState}`} — {v.Email || `Vendor #${v.VendorId}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <Plus className="h-3 w-3" /> New Vendor Creation
                  </label>
                  <button 
                    onClick={() => setIsNewVendor(false)}
                    className="text-[10px] font-bold text-forest/40 hover:underline"
                  >
                    Use existing vendor instead
                  </button>
                </div>
                <div className="rounded-2xl border-2 border-dashed border-amber-200 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-900/5 px-5 py-4">
                  <p className="text-sm font-bold text-forest dark:text-white">
                    {reviewData.vendorName || "Unknown Vendor"}
                  </p>
                  <p className="text-xs text-forest/40 dark:text-neutral-400 mt-1">
                    This vendor will be created automatically in your database during commit.
                  </p>
                </div>
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

              {/* Diagnostic/Debug Section */}
              {rawApiResponse && (
                <div className="mt-12 pt-8 border-t border-forest/5 dark:border-neutral-800">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none text-[10px] font-bold text-forest/30 uppercase tracking-widest hover:text-brown transition-colors">
                      <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                      Developer: Raw AI Response (Diagnostics)
                    </summary>
                    <div className="mt-4 rounded-2xl bg-forest/[0.02] dark:bg-neutral-900/50 p-4 font-mono text-[10px] text-forest/40 dark:text-neutral-500 overflow-x-auto">
                      <pre>{JSON.stringify(rawApiResponse, null, 2)}</pre>
                    </div>
                  </details>
                </div>
              )}
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
            {/* Diagnostic Data (Always visible during review) */}
            {rawScanText && (
              <div className="w-full pt-8 mt-8 border-t border-forest/5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-forest/40" />
                  <span className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Live Scan Data Output (Diagnostics)</span>
                </div>
                <div className="rounded-2xl border border-forest/5 bg-forest/[0.02] dark:bg-neutral-900/50 p-4 font-mono text-[10px] text-forest/60 dark:text-neutral-400 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {rawScanText}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

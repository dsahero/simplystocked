import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Loader2 } from 'lucide-react';
import { ApiProduct, searchProducts } from '../../api/products';
import { cn } from '../../lib/utils';

interface ProductSearchInputProps {
  selected: ApiProduct | null;
  onSelect: (product: ApiProduct) => void;
  onClear: () => void;
  placeholder?: string;
}

export function ProductSearchInput({
  selected,
  onSelect,
  onClear,
  placeholder = 'Search for a product by name...',
}: ProductSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProducts(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-brown/30 bg-brown/5 dark:bg-brown/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brown/10 text-brown">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-forest dark:text-white">{selected.ProductName}</p>
            <p className="text-xs text-forest/40 dark:text-neutral-400">
              {selected.CategoryName} · ${selected.ProductPrice.toFixed(2)} · {selected.Quantity ?? 0} in stock
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl p-2 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90"
        >
          <X className="h-4 w-4 text-forest/40" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brown" />
        ) : (
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/30" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-forest/10 dark:border-neutral-800 bg-cream/20 dark:bg-neutral-950 py-4 pl-12 pr-4 text-sm font-bold placeholder-forest/20 focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
        />
      </div>

      <AnimateDropdown isOpen={isOpen}>
        {results.length > 0 ? (
          results.map((product) => (
            <button
              key={product.FoodProductId}
              type="button"
              onMouseDown={() => {
                onSelect(product);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-cream/50 dark:hover:bg-neutral-800 transition-colors text-left border-b border-forest/5 dark:border-neutral-800 last:border-0"
            >
              <div>
                <p className="text-sm font-bold text-forest dark:text-white">{product.ProductName}</p>
                <p className="text-xs text-forest/40 dark:text-neutral-400">{product.CategoryName}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs font-bold text-forest dark:text-white">
                  ${product.ProductPrice.toFixed(2)}
                </p>
                <p className={cn(
                  'text-xs font-bold',
                  product.StockLevel === 'Low' || product.StockLevel === 'Out of Stock'
                    ? 'text-brown'
                    : 'text-forest/40 dark:text-neutral-400'
                )}>
                  {product.Quantity ?? 0} in stock
                </p>
              </div>
            </button>
          ))
        ) : !isLoading && query.length >= 2 ? (
<<<<<<< HEAD
          <div className="px-6 py-5 text-center">
            <p className="text-sm font-bold text-forest/40 dark:text-neutral-400">
              No products found for "{query}"
            </p>
=======
          <div className="flex flex-col">
            <div className="px-6 py-4 text-center border-b border-forest/5 dark:border-neutral-800">
              <p className="text-sm font-bold text-forest/40 dark:text-neutral-400">
                No products found for "{query}"
              </p>
            </div>
            <button
              type="button"
              onMouseDown={() => {
                // Return a mock product object with ID -1 to signal 'New Product'
                onSelect({
                  FoodProductId: -1,
                  ProductName: query,
                  ProductPrice: 0,
                  CategoryId: -1,
                  CategoryName: 'New Product (Staged)',
                  StockLevelId: null,
                  StockLevel: 'Staged',
                  Quantity: 0,
                  OpenMarketQuantity: 0,
                  GroceryStoreQuantity: 0,
                  LastUpdated: null,
                });
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-6 py-4 hover:bg-brown/5 text-brown transition-colors text-left"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-bold">Add "{query}" as a new product</span>
            </button>
>>>>>>> invoice
          </div>
        ) : null}
      </AnimateDropdown>
    </div>
  );
}

function AnimateDropdown({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="absolute z-50 mt-2 w-full rounded-[24px] border border-forest/5 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
      {children}
    </div>
  );
}

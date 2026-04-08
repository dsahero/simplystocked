import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractInvoiceData } from '../services/geminiService';
import { InvoiceData } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { cn } from '../lib/utils';

export default function UploadInvoicesPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [reviewData, setReviewData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addItem, locations } = useInventory();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const data = await extractInvoiceData({ data: base64, mimeType: file.type });
        setReviewData(data);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process image. Please try again or paste text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError('');

    try {
      const data = await extractInvoiceData(rawText);
      setReviewData(data);
    } catch (err) {
      setError('Failed to parse text. Please check the format and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = () => {
    if (!reviewData) return;
    
    reviewData.items.forEach(item => {
      addItem({
        name: item.name,
        category: 'Uncategorized',
        locations: { 'loc-a': item.quantity }, // Default to Main Pantry
        unit: 'units',
        isPerishable: item.isPerishable,
        expirationDate: item.expirationDate,
        costPerUnit: item.cost / item.quantity,
        lastRestocked: new Date().toISOString().split('T')[0],
        minStockLevel: 10,
      });
    });

    setReviewData(null);
    setRawText('');
    // Show success toast here if implemented
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-display font-bold tracking-tight text-forest dark:text-white">Upload Invoices</h1>
        <p className="text-forest/60 dark:text-neutral-400 font-medium">Extract inventory data from images or text using AI.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Image Upload */}
        <div className="rounded-[40px] border-2 border-dashed border-forest/10 bg-white dark:bg-neutral-900 p-10 text-center hover:border-brown transition-all group cursor-pointer shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-forest/5 text-forest group-hover:scale-110 group-hover:bg-forest group-hover:text-white transition-all duration-500">
            <ImageIcon className="h-10 w-10" />
          </div>
          <h3 className="mt-6 text-xl font-display font-bold text-forest dark:text-white">Upload Image</h3>
          <p className="mt-2 text-sm text-forest/40 dark:text-neutral-400 font-medium leading-relaxed">Upload a photo or scan of your invoice (JPG, PNG).</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="mt-8 w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
          >
            Select Image
          </button>
        </div>

        {/* Text Paste */}
        <div className="rounded-[40px] border border-forest/5 bg-white dark:bg-neutral-900 p-10 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-forest/5 text-forest">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-forest dark:text-white">Paste Raw Text</h3>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste invoice details here..."
            className="h-40 w-full rounded-[24px] border border-forest/10 dark:border-neutral-800 bg-cream/30 dark:bg-neutral-950 p-6 text-sm font-bold placeholder-forest/20 focus:border-brown focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-4 focus:ring-brown/5 transition-all dark:text-white resize-none"
          />
          <button
            onClick={handleTextSubmit}
            disabled={isProcessing || !rawText.trim()}
            className="mt-6 w-full rounded-2xl bg-forest dark:bg-white px-6 py-4 text-sm font-bold text-white dark:text-neutral-900 hover:bg-forest-dark dark:hover:bg-neutral-100 shadow-xl shadow-forest/10 transition-all active:scale-95 disabled:opacity-50"
          >
            Process Text
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
            <p className="text-2xl font-display font-bold text-forest dark:text-white">AI is processing your invoice...</p>
            <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium mt-2">This usually takes a few seconds.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-4 rounded-[24px] bg-red-50 dark:bg-red-900/20 p-6 text-brown dark:text-red-400 border border-red-100 dark:border-red-900/30 shadow-sm">
          <AlertCircle className="h-6 w-6" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-forest/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[48px] bg-white dark:bg-neutral-900 p-10 shadow-2xl max-h-[90vh] overflow-y-auto border border-forest/5"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-display font-bold text-forest dark:text-white">Review Data</h2>
                  <p className="text-sm text-forest/40 dark:text-neutral-400 font-medium">Verify and correct the AI-extracted information.</p>
                </div>
                <button onClick={() => setReviewData(null)} className="rounded-2xl p-3 hover:bg-forest/5 dark:hover:bg-neutral-800 transition-all active:scale-90">
                  <X className="h-6 w-6 text-forest/40" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="rounded-[24px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-6">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Invoice Date</p>
                    <input
                      type="date"
                      value={reviewData.date}
                      onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                      className="text-xl font-display font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                    />
                  </div>
                  <div className="rounded-[24px] border border-forest/5 bg-cream/30 dark:bg-neutral-800 p-6">
                    <p className="text-[10px] font-bold text-forest/40 uppercase tracking-widest mb-1">Total Cost</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-display font-bold text-forest dark:text-white">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={reviewData.totalCost}
                        onChange={(e) => setReviewData({ ...reviewData, totalCost: parseFloat(e.target.value) || 0 })}
                        className="text-xl font-display font-bold text-forest dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-forest dark:text-white">Extracted Items</h3>
                  {reviewData.items.map((item, idx) => (
                    <div key={idx} className="rounded-[32px] border border-forest/5 bg-white dark:bg-neutral-800 p-6 space-y-6 shadow-sm">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Item Name</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...reviewData.items];
                              newItems[idx].name = e.target.value;
                              setReviewData({ ...reviewData, items: newItems });
                            }}
                            className="w-full rounded-2xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Qty</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...reviewData.items];
                                newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                setReviewData({ ...reviewData, items: newItems });
                              }}
                              className="w-full rounded-2xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-forest/40 uppercase tracking-widest">Cost</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.cost}
                              onChange={(e) => {
                                const newItems = [...reviewData.items];
                                newItems[idx].cost = parseFloat(e.target.value) || 0;
                                setReviewData({ ...reviewData, items: newItems });
                              }}
                              className="w-full rounded-2xl border border-forest/10 dark:border-neutral-700 bg-cream/20 dark:bg-neutral-900 px-4 py-3 text-sm font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5 dark:text-white transition-all"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-3 text-sm font-bold text-forest/60 dark:text-neutral-300 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={item.isPerishable} 
                              onChange={(e) => {
                                const newItems = [...reviewData.items];
                                newItems[idx].isPerishable = e.target.checked;
                                setReviewData({ ...reviewData, items: newItems });
                              }}
                              className="h-5 w-5 rounded-lg border-forest/10 text-brown focus:ring-brown" 
                            />
                            Perishable
                          </label>
                          {item.isPerishable && (
                            <input
                              type="date"
                              value={item.expirationDate}
                              onChange={(e) => {
                                const newItems = [...reviewData.items];
                                newItems[idx].expirationDate = e.target.value;
                                setReviewData({ ...reviewData, items: newItems });
                              }}
                              className="rounded-xl border border-forest/10 bg-cream/20 px-4 py-2 text-xs font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-forest/20" />
                          <select className="rounded-xl border border-forest/10 bg-cream/20 px-4 py-2 text-xs font-bold focus:border-brown focus:outline-none focus:ring-4 focus:ring-brown/5">
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-10">
                <button
                  onClick={() => setReviewData(null)}
                  className="rounded-2xl px-8 py-4 text-sm font-bold text-forest/40 hover:bg-forest/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  className="flex items-center gap-3 rounded-2xl bg-brown px-10 py-4 text-sm font-bold text-white shadow-xl shadow-brown/20 hover:bg-brown-dark transition-all active:scale-95"
                >
                  <CheckCircle className="h-5 w-5" />
                  Confirm & Add
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

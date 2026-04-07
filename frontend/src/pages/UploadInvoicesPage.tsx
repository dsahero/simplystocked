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
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Upload Invoices</h1>
        <p className="text-neutral-500">Extract inventory data from images or text using AI.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Image Upload */}
        <div className="rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-8 text-center hover:border-orange-500 transition-all group">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 group-hover:scale-110 transition-transform">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Upload Image</h3>
          <p className="mt-2 text-sm text-neutral-500">Upload a photo or scan of your invoice (JPG, PNG).</p>
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
            className="mt-6 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-all"
          >
            Select Image
          </button>
        </div>

        {/* Text Paste */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Paste Raw Text</h3>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste invoice details here..."
            className="h-32 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
          <button
            onClick={handleTextSubmit}
            disabled={isProcessing || !rawText.trim()}
            className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-all"
          >
            Process Text
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600" />
          <p className="text-lg font-medium text-neutral-900">AI is processing your invoice...</p>
          <p className="text-sm text-neutral-500">This usually takes a few seconds.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-600 border border-red-100">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
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
              className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-[110] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Review Extracted Data</h2>
                  <p className="text-sm text-neutral-500">Verify and correct the AI-extracted information.</p>
                </div>
                <button onClick={() => setReviewData(null)} className="rounded-lg p-2 hover:bg-neutral-100 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Invoice Date</p>
                    <p className="text-lg font-bold">{reviewData.date}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Cost</p>
                    <p className="text-lg font-bold">${reviewData.totalCost.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-neutral-900">Extracted Items</h3>
                  {reviewData.items.map((item, idx) => (
                    <div key={idx} className="rounded-2xl border border-neutral-200 p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Item Name</label>
                          <input
                            type="text"
                            defaultValue={item.name}
                            className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Qty</label>
                            <input
                              type="number"
                              defaultValue={item.quantity}
                              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Cost</label>
                            <input
                              type="number"
                              defaultValue={item.cost}
                              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                            <input type="checkbox" defaultChecked={item.isPerishable} className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500" />
                            Perishable
                          </label>
                          {item.isPerishable && (
                            <input
                              type="date"
                              defaultValue={item.expirationDate}
                              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-400" />
                          <select className="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setReviewData(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm & Add to Inventory
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

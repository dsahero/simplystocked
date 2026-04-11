import { apiFetch } from './client';
import { InvoiceData } from '../types';

export interface OcrHealthResponse {
  available: boolean;
  models: string[];
  error?: string;
}

export interface ImageToInvoiceResponse {
  invoice_data: InvoiceData;
  raw_text: string;
}

export interface TextToInvoiceResponse {
  invoice_data: InvoiceData;
}

/**
 * Check whether the local Ollama instance is reachable and which
 * vision models are available.
 */
export function checkOcrHealth(): Promise<OcrHealthResponse> {
  return apiFetch<OcrHealthResponse>('/ocr/health');
}

/**
 * Full two-shot local OCR pipeline:
 *   base64 image → raw text (vision LLM) → InvoiceData JSON (text LLM)
 * All inference happens on-device via Ollama — no cloud calls.
 */
export async function ocrImageToInvoice(
  image_base64: string,
  mime_type: string,
  model = 'qwen2.5vl:3b'
): Promise<ImageToInvoiceResponse> {
  return apiFetch<ImageToInvoiceResponse>('/ocr/image-to-invoice', {
    method: 'POST',
    body: JSON.stringify({ image_base64, mime_type, model }),
  });
}

/**
 * Parse raw invoice text into InvoiceData JSON using a local Ollama model.
 * 100% offline — replaces the Gemini text-paste path entirely.
 */
export async function ocrTextToInvoice(
  raw_text: string,
  model = 'qwen2.5vl:3b'
): Promise<TextToInvoiceResponse> {
  return apiFetch<TextToInvoiceResponse>('/ocr/text-to-invoice', {
    method: 'POST',
    body: JSON.stringify({ raw_text, model }),
  });
}


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
 */
export async function ocrImageToInvoice(
  image_base64: string,
  mime_type: string,
  vision_model = 'qwen2.5vl:3b',
  parsing_model = 'llama3.2'
): Promise<ImageToInvoiceResponse> {
  return apiFetch<ImageToInvoiceResponse>('/ocr/image-to-invoice', {
    method: 'POST',
    body: JSON.stringify({ image_base64, mime_type, vision_model, parsing_model }),
  });
}

/**
 * Parse raw invoice text into InvoiceData JSON using a local Ollama model.
 */
export async function ocrTextToInvoice(
  raw_text: string,
  parsing_model = 'llama3.2'
): Promise<TextToInvoiceResponse> {
  return apiFetch<TextToInvoiceResponse>('/ocr/text-to-invoice', {
    method: 'POST',
    body: JSON.stringify({ raw_text, parsing_model }),
  });
}


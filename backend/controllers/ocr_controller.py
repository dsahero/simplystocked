"""
OCR Controller — Local Ollama Invoice Parsing
Pipeline:
  1. Raw image (base64) → vision LLM → plain text
  2. Plain text + invoice-schema prompt → LLM → InvoiceData JSON
No data leaves the machine; all inference runs via local Ollama.
"""

import json
import re
import base64
import ollama
from fastapi import HTTPException


# ── Ollama connectivity helpers ───────────────────────────────────────────────

def check_ollama_health() -> dict:
    """Return available Ollama models; surface a clear error if Ollama is offline."""
    try:
        models_response = ollama.list()
        # ollama.list() returns a ListResponse with a .models attribute (list of Model objects)
        model_names = [m.model for m in models_response.models]
        return {"available": True, "models": model_names}
    except Exception as exc:
        return {"available": False, "models": [], "error": str(exc)}


# ── Step 1: image → raw text ──────────────────────────────────────────────────

def image_to_raw_text(image_base64: str, mime_type: str = "image/jpeg", model: str = "qwen2.5vl:3b") -> str:
    """
    Feed the base64 image (or PDF rasterized to image) to a local vision-capable 
    Ollama model and return the full verbatim text extracted from it.
    """
    image_bytes = base64.b64decode(image_base64)
    
    if mime_type == "application/pdf":
        import fitz  # PyMuPDF
        doc = fitz.open(stream=image_bytes, filetype="pdf")
        page = doc.load_page(0)
        # 150 DPI is usually sufficient for OCR reading
        pix = page.get_pixmap(dpi=150)
        image_bytes = pix.tobytes("png")

    try:
        print(f"DEBUG: Starting Ollama Step 1 (Image -> Text) with model {model}...")
        response = ollama.chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Extract ALL text from this invoice image thoroughly and completely. "
                        "Do NOT miss any words, numbers, column headers, addresses, totals, "
                        "or faint text near edges. "
                        "Preserve the original reading order and table structure as best you can. "
                        "Output the raw text only — no commentary."
                    ),
                    "images": [image_bytes],
                }
            ],
        )
        print("DEBUG: Ollama Step 1 Completed.")
        return response["message"]["content"]
    except Exception as exc:
        print(f"DEBUG: Ollama Step 1 FAILED: {str(exc)}")
        raise HTTPException(
            status_code=503,
            detail=f"Ollama OCR step failed. Is Ollama running and model '{model}' pulled? Error: {str(exc)}"
        )


# ── Step 2: raw text → structured InvoiceData JSON ───────────────────────────

_PARSE_PROMPT = """
You are a food bank inventory data extractor. Parse the following raw invoice text
into structured JSON matching the schema below EXACTLY.

This invoice may come from one of three vendor types:

1. FSWV / Feeding Southwest Virginia (Agency Order):
   Columns: Item No., Description, Unit (Case/Pound), Quantity, Unit Fee, Total Fee, Gross Weight.
   Unit Fee is often very low ($0–$5) for donated items.
   Brand may be embedded in description in parentheses like "(KA)".

2. Keany Produce & Gourmet (fresh produce):
   Columns: Item No., QTY Ordered, QTY Shipped, Unit, Pack (e.g. "40 LB"), Item Description, Unit Price, Ext. Price.
   Use QTY Shipped for quantity; record QTY Ordered in quantityOrdered if different.
   All produce items are perishable.

3. US Foods (food service distributor):
   Columns: Product Number, Description, Pack Size (e.g. "48/4.25 OZ"), Label (brand), Unit Price, Extended Price.
   Items are categorized as Dry, Refrigerated, or Frozen — use this for storageType.

For each real line item (skip freight, fuel surcharge, summary/total rows):
- name: product description (clean, keep brand if embedded)
- vendorSku: item number / product number / SKU (string or null)
- packSize: pack size field if present (string or null)
- unit: unit of measure — "Case", "Pound", "CS", etc.
- quantity: quantity shipped/received (number)
- quantityOrdered: only if different from quantity, else null
- unitPrice: cost per unit/case; 0 if blank (number)
- cost: extended/line total; use unitPrice * quantity if not explicit (number)
- brand: brand/label if in dedicated column or parseable (string or null)
- grossWeightLbs: gross weight in lbs if present (number or null)
- storageType: "Dry", "Refrigerated", or "Frozen" if determinable (string or null)
- isPerishable: true for produce, dairy, frozen, refrigerated; false for shelf-stable (boolean)
- expirationDate: YYYY-MM-DD if listed on invoice (string or null)
- _priceLabel: exact column header used for unit price, e.g. "Unit Fee" or "Unit Price" (string or null)

Top-level fields:
- vendorName: vendor company name from invoice header (string or null)
- invoiceNumber: invoice/order number (string or null)
- date: invoice date in YYYY-MM-DD format (string)
- totalCost: grand total amount (number)
- items: array of line item objects as described above

Return ONLY a valid JSON object. No markdown, no explanation, no code fences.

RAW INVOICE TEXT:
"""


def raw_text_to_invoice_data(raw_text: str, model: str = "qwen2.5vl:3b") -> dict:
    """
    Send the OCR-extracted plain text to Ollama with a structured JSON prompt
    and return a parsed InvoiceData-shaped dict.
    """
    prompt = _PARSE_PROMPT + raw_text

    try:
        print(f"DEBUG: Starting Ollama Step 2 (Text -> JSON) with model {model}...")
        print(f"DEBUG: Raw text length: {len(raw_text)}")
        response = ollama.chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )
        content = response["message"]["content"]
        print("DEBUG: Ollama Step 2 Completed.")
        print(f"DEBUG: Content: {content[:100]}...")
    except Exception as exc:
        print(f"DEBUG: Ollama Step 2 FAILED: {str(exc)}")
        raise HTTPException(
            status_code=503,
            detail=f"Ollama parse step failed. Error: {str(exc)}"
        )

    # Parse and validate
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Attempt to extract JSON block if model leaked extra text
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except Exception:
                raise HTTPException(
                    status_code=422,
                    detail="Ollama returned output that could not be parsed as JSON. Try a larger model."
                )
        else:
            raise HTTPException(
                status_code=422,
                detail="Ollama returned output that could not be parsed as JSON. Try a larger model."
            )

    # Ensure required top-level fields exist with safe defaults
    data.setdefault("vendorName", None)
    data.setdefault("invoiceNumber", None)
    data.setdefault("date", "")
    data.setdefault("totalCost", 0.0)
    data.setdefault("items", [])

    # Normalise each item
    for item in data["items"]:
        item.setdefault("name", "")
        item.setdefault("unit", "Case")
        item.setdefault("quantity", 1)
        item.setdefault("unitPrice", 0.0)
        item.setdefault("cost", 0.0)
        item.setdefault("isPerishable", False)
        item.setdefault("vendorSku", None)
        item.setdefault("packSize", None)
        item.setdefault("quantityOrdered", None)
        item.setdefault("brand", None)
        item.setdefault("grossWeightLbs", None)
        item.setdefault("storageType", None)
        item.setdefault("expirationDate", None)
        item.setdefault("_priceLabel", None)

    return data


# ── Full pipeline ─────────────────────────────────────────────────────────────

def image_to_invoice_data(
    image_base64: str,
    mime_type: str = "image/jpeg",
    model: str = "qwen2.5vl:3b",
) -> dict:
    """
    Full two-shot pipeline:
      image_base64 → raw_text → InvoiceData dict
    Returns both the structured data and the intermediate raw text
    so the caller can surface it for debugging.
    """
    raw_text = image_to_raw_text(image_base64, mime_type, model)
    invoice_data = raw_text_to_invoice_data(raw_text, model)
    return {"invoice_data": invoice_data, "raw_text": raw_text}

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


def preprocess_image(image_bytes: bytes) -> bytes:
    """Enhance image for better OCR: Grayscale, Contrast, Sharpness."""
    try:
        from PIL import Image, ImageEnhance
        import io
        print("[DEBUG - Backend] preprocess_image: Enhancing image for OCR...")
        img = Image.open(io.BytesIO(image_bytes))
        
        # 1. Balanced Saturation
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.2)
        
        # 2. Balanced Contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)
        
        # 3. Balanced Sharpness
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.5)
        
        # 4. Handle massive resolutions (Performance boost)
        # 1024px is the gold standard for Single-Tile Vision LLM performance
        max_dim = 1024
        if max(img.size) > max_dim:
            print(f"[DEBUG - Backend] preprocess_image: Resizing down from {img.size} to {max_dim}px max...")
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        # Switch to JPEG for much faster processing/transfer
        img.save(output, format="JPEG", quality=85)
        new_bytes = output.getvalue()
        print(f"[DEBUG - Backend] preprocess_image: Done. Size changed from {len(image_bytes)/(1024*1024):.1f}MB to {len(new_bytes)/(1024*1024):.1f}MB. Final Dim: {img.size}")
        return new_bytes
    except Exception as e:
        print(f"[DEBUG - Backend] preprocess_image: FAILED, skipping enhancement. Error: {str(e)}")
        return image_bytes


# ── Step 1: image → raw text ──────────────────────────────────────────────────

def image_to_raw_text(image_base64: str, mime_type: str = "image/jpeg", model: str = "moondream:latest") -> str:
    print(f"\n[DEBUG - Backend] image_to_raw_text: Init called. MIME={mime_type}, Model={model}")
    try:
        print("[DEBUG - Backend] image_to_raw_text: Decoding base64 to bytes...")
        image_bytes = base64.b64decode(image_base64)
        print(f"[DEBUG - Backend] image_to_raw_text: Successfully decoded {len(image_bytes)} bytes")
    except Exception as e:
        print(f"[DEBUG - Backend] image_to_raw_text: b64decode FAILED: {str(e)}")
        raise e
    
    if mime_type == "application/pdf":
        print("[DEBUG - Backend] image_to_raw_text: PDF detected! Booting PyMuPDF (fitz)...")
        import fitz  # PyMuPDF
        try:
            doc = fitz.open(stream=image_bytes, filetype="pdf")
            print(f"[DEBUG - Backend] image_to_raw_text: PDF Opened. Total Pages = {len(doc)}")
            page = doc.load_page(0)
            print("[DEBUG - Backend] image_to_raw_text: Parsing page 0 to Pixmap (DPI=180)...")
            pix = page.get_pixmap(dpi=180) # Balanced DPI for speed vs accuracy
            print("[DEBUG - Backend] image_to_raw_text: Pixmap generated. Converting to PNG bytes...")
            image_bytes = pix.tobytes("png")
        except Exception as e:
            print(f"[DEBUG - Backend] image_to_raw_text: PDF Parsing completely FAILED: {str(e)}")
            raise e

    # Apply digital enhancement before sending to AI
    image_bytes = preprocess_image(image_bytes)

    try:
        print(f"[DEBUG - Backend] image_to_raw_text: Passing command to Ollama.chat(model='{model}')...")
        import time
        start_time = time.time()
        response = ollama.chat(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "ULTRA-LITERAL OCR TASK: Transcribe EVERY SINGLE WORD, NUMBER, AND CHARACTER on this page. "
                        "Do not skip anything. Start from the very top-left and read row-by-row to the bottom-right. "
                        "Your goal is 100% literal coverage of all text, headers, and the entire table. "
                        "Do not summarize. Do not explain. Just list the text exactly as it appears."
                    ),
                    "images": [image_bytes],
                }
            ],
        )
        elapsed = time.time() - start_time
        print(f"[DEBUG - Backend] image_to_raw_text: Ollama.chat returned SUCCESSFULLY in {elapsed:.2f} seconds!")
        content = response["message"]["content"]
        return content
    except Exception as exc:
        print(f"DEBUG: Ollama Step 1 FAILED: {str(exc)}")
        raise HTTPException(
            status_code=503,
            detail=f"Ollama OCR step failed. Is Ollama running and model '{model}' pulled? Error: {str(exc)}"
        )


# ── One-Shot Vision JSON Prompt ──────────────────────────────────────────────

_ONE_SHOT_PROMPT = """
You are a high-speed data extractor. Convert the attached invoice image into a JSON object.
Focus on the line items, quantities, and prices. 

EXTRACT THESE FIELDS:
- vendorName: The company providing the goods (e.g. Sysco, US Foods, Keany).
- date: Invoice date (YYYY-MM-DD).
- invoiceNumber: The order or invoice ID.
- totalCost: Grand total balance due.
- items: An array of every product listed in the table.

FOR EACH ITEM:
- name: The full description of the food item.
- quantity: Number of units received (default 1).
- unitPrice: Price per unit (default 0.0).
- cost: Total for that line (quantity * price).
- unit: e.g. 'Case', 'Pound', 'EA'.
- vendorSku: Product code/item #.

RULES:
1. Return RAW JSON ONLY. No explanation.
2. If only one field is found (like vendor name), still return the items array as [].
3. Ensure "Apples" and other fresh items are prioritized.
"""


# ── Step 2: raw text -> structured InvoiceData JSON (Legacy/Text Fallback) ──────

_PARSE_PROMPT = """
You are a precise data extractor. Convert the following RAW OCR TEXT into a JSON object.
The text is messy; your job is to hunt for the specific fields.

EXTRACT THESE FIELDS:
- vendorName: The supplier company (e.g. Sysco, Keany, US Foods). Look at the top headers.
- date: Invoice date. Convert to YYYY-MM-DD.
- invoiceNumber: The order or invoice ID. Look for labels like 'INV #', 'Order No', etc.
- totalCost: The final grand total balance due. (Must be a number).
- items: An array of products listed in the table.

FOR EACH ITEM:
- name: The description of the item.
- quantity: Usually a number before the price.
- unitPrice: Price per unit.
- cost: Total for that line.
- unit: e.g. 'Case', 'LB', 'EA'.
- vendorSku: Product ID code.

RULES:
1. Return RAW JSON ONLY. No explanation or extra text.
2. If vendor name isn't clear, pick the most prominent company header.
3. Skip header/footer rows in the 'items' array.

RAW TEXT:
"""


def raw_text_to_invoice_data(raw_text: str, model: str = "llama3.2") -> dict:
    # We force llama3.2 for the text-parsing phase because it is significantly
    # more reliable at following JSON schemas than vision-centric models.
    parsing_model = "llama3.2"
    
    print(f"\n[DEBUG - Backend] raw_text_to_invoice_data: Init called. Model={parsing_model}, TextLength={len(raw_text)}")
    prompt = _PARSE_PROMPT + raw_text

    try:
        print(f"[DEBUG - Backend] raw_text_to_invoice_data: Passing prompt to Ollama.chat(model='{parsing_model}')...")
        import time
        start_time = time.time()
        response = ollama.chat(
            model=parsing_model,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )
        content = response["message"]["content"]
        elapsed = time.time() - start_time
        print(f"[DEBUG - Backend] raw_text_to_invoice_data: Ollama returned SUCCESS in {elapsed:.2f}s.")
        
        # Clean the output in case Llama wrapped it in markdown code fences
        content = content.strip()
        if content.startswith("```"):
            # Strip ```json ... ``` or just ``` ... ```
            content = re.sub(r'^```(?:json)?\n?|\n?```$', '', content, flags=re.MULTILINE)
        
        print(f"[DEBUG - Backend] raw_text_to_invoice_data: Cleaned Content Snippet: {content[:100]}...")
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

    # Some models return a list of items directly instead of an object with an 'items' array
    if isinstance(data, list):
        data = {"items": data}
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
    model: str = "moondream:latest",
) -> dict:
    """
    Two-step pipeline for stability:
      1. Moondream (Vision) -> Raw Text
      2. Llama 3.2 (Parser) -> Structured JSON
    This provides Moondream's speed without its JSON-formatting issues.
    """
    print(f"\n[DEBUG - Backend] image_to_invoice_data: RELAY Init. Model={model}")
    
    # Step 1: Eye (Vision)
    raw_text = image_to_raw_text(image_base64, mime_type, model)
    
    # Step 2: Brain (Text-to-JSON)
    # Note: We always use llama3.2 for the parsing step even if moondream did the vision
    invoice_data = raw_text_to_invoice_data(raw_text, "llama3.2")
    
    return {"invoice_data": invoice_data, "raw_text": raw_text}

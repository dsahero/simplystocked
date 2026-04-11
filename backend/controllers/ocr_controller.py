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
import time
import os
from datetime import datetime
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


def preprocess_image(image_bytes: bytes, max_dim: int = 1600) -> bytes:
    """Enhance image for better OCR: Grayscale, Contrast, Sharpness."""
    try:
        from PIL import Image, ImageEnhance
        import io
        print("[DEBUG - Backend] preprocess_image: Enhancing image for OCR...")
        img = Image.open(io.BytesIO(image_bytes))
        
        # 1. Balanced Saturation
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.2)
        
        # 2. Mild Contrast (Reduced to avoid artifacts)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)
        
        # 3. Mild Sharpness (Reduced to avoid artifacts)
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.1)
        
        # 4. Handle massive resolutions (Performance boost)
        # Dynamic resolution limit (default 1600, up to 2500 for PDFs)
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
    
    # List to collect transcriptions from all pages
    all_transcriptions = []
    
    # Ensure debug directory exists
    os.makedirs("debug_ocr", exist_ok=True)
    
    if mime_type == "application/pdf":
        print("[DEBUG - Backend] image_to_raw_text: PDF detected! Booting PyMuPDF (fitz)...")
        import fitz  # PyMuPDF
        try:
            doc = fitz.open(stream=image_bytes, filetype="pdf")
            total_pages = len(doc)
            print(f"[DEBUG - Backend] image_to_raw_text: PDF Opened. Total Pages = {total_pages}")
            
            for page_num in range(total_pages):
                print(f"[DEBUG - Backend] image_to_raw_text: Processing Page {page_num + 1} of {total_pages}...")
                page = doc.load_page(page_num)
                # Render at high resolution (300 DPI)
                pix = page.get_pixmap(dpi=300)
                img_data = pix.tobytes("png")
                
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(img_data))
                width, height = img.size
                
                # Split into Top and Bottom tiles for better focus
                tiles = [
                    ("top", img.crop((0, 0, width, height // 2))),
                    ("bottom", img.crop((0, height // 2, width, height)))
                ]
                
                page_text_parts = []
                for label, tile_img in tiles:
                    print(f"[DEBUG - Backend] Processing {label} tile of page {page_num + 1}...")
                    
                    # Convert tile back to bytes
                    tile_io = io.BytesIO()
                    tile_img.save(tile_io, format="PNG")
                    tile_bytes = tile_io.getvalue()
                    
                    # Preprocess tile (resizing to 2500px height is great for half-page density)
                    tile_bytes = preprocess_image(tile_bytes, max_dim=2500)
                    
                    # SAVE DEBUG TILE
                    debug_path = os.path.join("debug_ocr", f"page_{page_num+1}_{label}.jpg")
                    with open(debug_path, "wb") as f:
                        f.write(tile_bytes)
                    
                    # Transcribe tile
                    start_time = time.time()
                    response = ollama.chat(
                        model=model,
                        messages=[{
                            "role": "user",
                            "content": (
                                "ACT AS A HIGH-PRECISION OCR ENGINE. Transcribe EVERY single line of text "
                                "in this image meticulously. List every product, quantity, and price. "
                                "Literal transcription only. No descriptions. No chatter."
                            ),
                            "images": [tile_bytes],
                        }],
                    )
                    t_text = response["message"]["content"].strip()
                    elapsed = time.time() - start_time
                    print(f"[DEBUG - Backend] Tile {label} done in {elapsed:.2f}s. Length: {len(t_text)}")
                    
                    if t_text:
                        page_text_parts.append(t_text)

                if page_text_parts:
                    combined_page = "\n".join(page_text_parts)
                    all_transcriptions.append(f"--- PAGE {page_num + 1} ---\n{combined_page}")
                    
        except Exception as e:
            print(f"[DEBUG - Backend] PDF Parsing completely FAILED: {str(e)}")
            raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")
    else:
        # Standard Single Image Logic
        image_bytes = preprocess_image(image_bytes)
        
        # SAVE DEBUG IMAGE
        debug_path = os.path.join("debug_ocr", "raw_image.jpg")
        with open(debug_path, "wb") as f:
            f.write(image_bytes)
        print(f"[DEBUG - Backend] Saved debug image to: {debug_path}")
        
        try:
            start_time = time.time()
            response = ollama.chat(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": "Please provide a line-by-line transcription of all text, numbers, and data on this image. No explanation needed.",
                        "images": [image_bytes],
                    }
                ],
            )
            content = response["message"]["content"].strip()
            elapsed = time.time() - start_time
            print(f"[DEBUG - Backend] Image transcription done in {elapsed:.2f}s. Length: {len(content)}")
            if content:
                all_transcriptions.append(content)
        except Exception as exc:
            print(f"DEBUG: Ollama Image Step 1 FAILED: {str(exc)}")
            raise HTTPException(status_code=503, detail=f"Ollama OCR step failed: {str(exc)}")

    # Combine all pages
    final_dump = "\n\n".join(all_transcriptions)
    
    # Guard: If AI returns nothing across ALL pages
    if not final_dump.strip():
        print("[WARNING - Backend] OCR returned an EMPTY transcription for the entire document.")
        raise HTTPException(
            status_code=503,
            detail="The AI Vision model was unable to read any text from this document. Please ensure the scan is clear."
        )
            
    return final_dump


# ── One-Shot Vision JSON Prompt ──────────────────────────────────────────────

_ONE_SHOT_PROMPT = """
You are a high-speed data extractor. Convert the attached invoice image into a JSON object.
Focus on the line items, quantities, and prices. 

EXTRACT THESE FIELDS:
- vendorName: The company providing the goods.
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
3. Ensure fresh items are prioritized.
"""


# ── Step 2: raw text -> structured InvoiceData JSON (Legacy/Text Fallback) ──────

_PARSE_PROMPT = """
You are a Master Invoice Data Extractor. Convert the following RAW OCR TEXT DUMP into a precise JSON object.

IDENTITY RECONSTRUCTION:
1. Hunt for the Vendor Name, Date, and Invoice # at the top of the dump.
2. For the items table, align every word with its quantity and price. 

EXAMPLE TRANSFORMATION:
Input: "RESTAURANT SUPPLY 05/10/26 INV-7788 ... CHICKEN BREAST CASE 3 45.00 135.00"
Output: {
  "vendorName": "RESTAURANT SUPPLY",
  "date": "2026-05-10",
  "invoiceNumber": "INV-7788",
  "totalCost": 135.00,
  "items": [{ "name": "CHICKEN BREAST", "quantity": 3, "unitPrice": 45.00, "cost": 135.00, "unit": "CASE" }]
}

EXTRACT THESE FIELDS:
- vendorName, date (YYYY-MM-DD), invoiceNumber, totalCost, items (array)

RULES:
1. Return RAW JSON ONLY. No chatter.
2. BE EXHAUSTIVE: If an item is in the text, it MUST be in the JSON.
3. Use column landmarks like 'Price' or 'Extended' to distinguish unit prices from totals.

RAW TEXT DUMP:
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

    # Parse and validate with aggressive cleaning
    try:
        # 1. Try a direct load
        data = json.loads(content)
    except json.JSONDecodeError:
        # 2. Try to find the LARGEST { ... } block
        # Using a more robust greedy search for the outermost braces
        match = re.search(r'(\{.*\})', content, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            # If there's multiple nested objects, re.search might be greedy. 
            # We trust json.loads to find the primary object.
            try:
                data = json.loads(json_str)
            except Exception:
                # Final Regex-based "Cleanup" (stripping AI chatter inside the block)
                # Removing common markdown artifacts inside the block
                json_str = json_str.replace('```json', '').replace('```', '').strip()
                data = json.loads(json_str)
            except Exception:
                # 3. Final Fallback: regex search for anything resembling a JSON block
                # but this is usually a sign the model gave up
                raise HTTPException(
                    status_code=422,
                    detail="Ollama's 'Brain' step produced malformed data. Try scanning again."
                )
        else:
            raise HTTPException(
                status_code=422,
                detail="Ollama's 'Brain' step failed to generate a structured invoice table. Try scanning a clearer image."
            )

    # Some models return a list of items directly instead of an object with an 'items' array
    if isinstance(data, list):
        data = {"items": data}
    # Ensure required top-level fields exist with safe defaults
    if not data.get("vendorName"):
        data["vendorName"] = "Unknown Vendor"
    if not data.get("invoiceNumber"):
        data["invoiceNumber"] = "NEW-INV"
    if not data.get("date"):
        data["date"] = datetime.today().strftime('%Y-%m-%d')
        
    data.setdefault("totalCost", 0.0)
    data.setdefault("items", [])

    # Normalise each item
    for item in data["items"]:
        if not isinstance(item, dict): continue
        if not item.get("name"):
            item["name"] = "Unknown Item"
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
    vision_model: str = "qwen2.5vl:3b",
    parsing_model: str = "llama3.2"
) -> dict:
    """
    Two-step relay pipeline:
      1. Vision Model (The Eye) -> Raw Text transcription
      2. LLM (The Brain) -> Structured JSON extraction
    """
    print(f"\n[DEBUG - Backend] image_to_invoice_data: RELAY Init.")
    print(f"[DEBUG - Backend] Eye (Vision): {vision_model}")
    print(f"[DEBUG - Backend] Brain (Parsing): {parsing_model}")
    
    # Step 1: Eye (Vision)
    raw_text = image_to_raw_text(image_base64, mime_type, vision_model)
    
    # Step 2: Brain (Text-to-JSON)
    invoice_data = raw_text_to_invoice_data(raw_text, parsing_model)
    
    return {"invoice_data": invoice_data, "raw_text": raw_text}

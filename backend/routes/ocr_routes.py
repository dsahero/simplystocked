from fastapi import APIRouter
from pydantic import BaseModel
from controllers import ocr_controller

router = APIRouter(prefix="/ocr", tags=["OCR"])


class ImageOcrRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    model: str = "moondream:latest"


class TextOcrRequest(BaseModel):
    raw_text: str
    model: str = "moondream:latest"


@router.get("/health")
def ocr_health():
    """Check whether Ollama is reachable and return available models."""
    return ocr_controller.check_ollama_health()


@router.post("/image-to-invoice")
def image_to_invoice(body: ImageOcrRequest):
    """
    Two-shot local OCR pipeline:
    1. Vision LLM extracts raw text from the image
    2. LLM parses raw text into structured InvoiceData JSON

    Returns:
      invoice_data  — InvoiceData-shaped dict ready for the review screen
      raw_text      — intermediate OCR output for debugging
    """
    return ocr_controller.image_to_invoice_data(
        image_base64=body.image_base64,
        mime_type=body.mime_type,
        model=body.model,
    )


@router.post("/text-to-invoice")
def text_to_invoice(body: TextOcrRequest):
    """
    Parse raw invoice text into structured InvoiceData JSON using a local
    Ollama model. Fully offline — no cloud API calls.

    Returns:
      invoice_data  — InvoiceData-shaped dict ready for the review screen
    """
    invoice_data = ocr_controller.raw_text_to_invoice_data(
        raw_text=body.raw_text,
        model=body.model,
    )
    return {"invoice_data": invoice_data}


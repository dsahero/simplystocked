from fastapi import APIRouter
from pydantic import BaseModel
from controllers import ocr_controller

router = APIRouter(prefix="/ocr", tags=["OCR"])


class ImageOcrRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    vision_model: str = "qwen2.5vl:3b"
    parsing_model: str = "llama3.2"


class TextOcrRequest(BaseModel):
    raw_text: str
    parsing_model: str = "llama3.2"


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
    """
    return ocr_controller.image_to_invoice_data(
        image_base64=body.image_base64,
        mime_type=body.mime_type,
        vision_model=body.vision_model,
        parsing_model=body.parsing_model,
    )


@router.post("/text-to-invoice")
def text_to_invoice(body: TextOcrRequest):
    """
    Parse raw invoice text into structured InvoiceData JSON using a local
    Ollama model.
    """
    invoice_data = ocr_controller.raw_text_to_invoice_data(
        raw_text=body.raw_text,
        model=body.parsing_model,
    )
    return {"invoice_data": invoice_data}

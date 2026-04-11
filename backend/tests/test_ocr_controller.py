import pytest
import base64
import json
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from controllers.ocr_controller import image_to_raw_text, raw_text_to_invoice_data

# Dummy tiny 1x1 base64 png
TINY_PNG_B64 = base64.b64encode(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82').decode('utf-8')

# Dummy minimal valid PDF base64
TINY_PDF_B64 = base64.b64encode(b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 100 100]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n188\n%%EOF').decode('utf-8')

@patch("controllers.ocr_controller.ollama.chat")
def test_image_to_raw_text_png(mock_chat):
    """Test that PNG images are passed through decoded correctly to ollama."""
    mock_chat.return_value = {"message": {"content": "raw invoice text here"}}
    
    result = image_to_raw_text(TINY_PNG_B64, mime_type="image/png", model="moondream:latest")
    
    assert result == "raw invoice text here"
    mock_chat.assert_called_once()
    called_args = mock_chat.call_args[1]
    
    # Assert model passed correctly
    assert called_args["model"] == "moondream:latest"
    # Assert image bytes were correctly passed
    images_passed = called_args["messages"][0]["images"]
    assert isinstance(images_passed[0], bytes)
    assert images_passed[0].startswith(b"\x89PNG")

@patch("controllers.ocr_controller.ollama.chat")
def test_image_to_raw_text_pdf(mock_chat):
    """Test that PDFs are appropriately rasterized using PyMuPDF into a PNG before passing to Ollama."""
    mock_chat.return_value = {"message": {"content": "pdf converted text here"}}
    
    result = image_to_raw_text(TINY_PDF_B64, mime_type="application/pdf", model="moondream:latest")
    
    assert result == "pdf converted text here"
    mock_chat.assert_called_once()
    called_args = mock_chat.call_args[1]
    
    # Check if the PDF was indeed converted into a PNG stream
    images_passed = called_args["messages"][0]["images"]
    assert isinstance(images_passed[0], bytes)
    assert images_passed[0].startswith(b"\x89PNG")  # Converted by fitz to png bytes

@patch("controllers.ocr_controller.ollama.chat")
def test_raw_text_to_invoice_data_strips_markdown(mock_chat):
    """Test that markdown code fences (```json ... ```) are correctly parsed out."""
    # Simulate LLM outputting markdown wrapped JSON
    simulated_output = '''Here is your data:
```json
{
  "vendorName": "Test Vendor",
  "invoiceNumber": "123",
  "items": []
}
```
Thanks!'''
    mock_chat.return_value = {"message": {"content": simulated_output}}
    
    # model arg is passed but discarded for llama3.2 internally
    result = raw_text_to_invoice_data("dummy text")
    
    # Verify llama3.2 was used regardless of input
    assert mock_chat.call_args[1]["model"] == "llama3.2"
    
    # The JSON should be parsed
    assert result["vendorName"] == "Test Vendor"
    assert result["invoiceNumber"] == "123"

@patch("controllers.ocr_controller.ollama.chat")
def test_raw_text_to_invoice_data_invalid_json(mock_chat):
    """Test that if the LLM completely fails to provide JSON, it raises a 422 HTTPException."""
    mock_chat.return_value = {"message": {"content": "I couldn't parse any JSON out of this."}}
    
    with pytest.raises(HTTPException) as excinfo:
        raw_text_to_invoice_data("dummy text")
    
    assert excinfo.value.status_code == 422
    assert "could not be parsed as JSON" in str(excinfo.value.detail)


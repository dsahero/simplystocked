import urllib.request
import json
import base64

tiny_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
b64 = base64.b64encode(tiny_png).decode('utf-8')

data = json.dumps({
    "image_base64": b64,
    "mime_type": "image/png",
    "model": "qwen2.5vl:3b"
}).encode('utf-8')

req = urllib.request.Request("http://127.0.0.1:8000/ocr/image-to-invoice", data=data, headers={'Content-Type': 'application/json'})

print("Sending request...")
try:
    with urllib.request.urlopen(req, timeout=60) as res:
        print("Status:", res.status)
        print("Response:", res.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)

# SimplyStocked

Inventory management system for The Market of Virginia Tech.

---

## Run Locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- MySQL 8.0+
- [Ollama](https://ollama.com/download) *(for local invoice image OCR — free, offline)*

---

### 1 · Ollama Setup *(Local Invoice OCR)*

The **Upload Invoice → image/PDF** path uses a local vision model via Ollama.
No image data ever leaves your machine.

```bash
# Install Ollama from https://ollama.com/download, then:

# Pull the default vision model (≈2 GB download, one-time)
ollama pull qwen2.5vl:3b

# Start the Ollama server (keep this running in the background)
ollama serve
```

Other supported vision models you can use instead (swap in the model selector on the upload page):
- `llava:13b` — higher quality, slower
- `moondream:latest` — very fast, lighter
- `llama3.2-vision` — good general-purpose option

> The **Paste Raw Text** path and the **AI chat assistant** still use Gemini (cloud).
> Only image/PDF invoice processing runs locally.

---

### 2 · Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set the `GEMINI_API_KEY` in [frontend/.env.local](frontend/.env.local) to your Gemini API key  
   *(used for the AI chat assistant and raw-text invoice parsing)*
4. Run the app:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

---

### 3 · Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory and add your database password:
   ```
   DB_PASSWORD=your_mysql_password
   ```
5. Make sure your MySQL server is running and the `simplystocked` schema exists.  
   Run the database dump using MySQL Workbench (see [`backend/sql_files/README.md`](backend/sql_files/README.md)).

6. Start the API server:
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`  
OCR health check: `http://localhost:8000/ocr/health`

---

### Startup Order

| Step | Command | Notes |
|------|---------|-------|
| 1 | `ollama serve` | Runs the local LLM server on port 11434 |
| 2 | `uvicorn main:app --reload` *(in backend/)* | FastAPI on port 8000 |
| 3 | `npm run dev` *(in frontend/)* | Vite dev server on port 5173 |

---

### Architecture Overview

```
Invoice Image (browser)
        │
        ▼  POST /ocr/image-to-invoice
  FastAPI Backend
        │
        ├─ Step 1: ollama.chat(vision model) ──→ raw text
        └─ Step 2: ollama.chat(JSON prompt)  ──→ InvoiceData JSON
                                                      │
                                                      ▼
                                           Review Screen (identical to
                                           manual entry & text-paste paths)
                                                      │
                                                      ▼
                                           POST /invoices/ → MySQL
```


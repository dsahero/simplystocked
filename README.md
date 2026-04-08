# SimplyStocked

Inventory management system for The Market of Virginia Tech.

---

## Run Locally

### Prerequisites

- Node.js
- Python 3.10+
- MySQL 8.0+

---

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set the `GEMINI_API_KEY` in [frontend/.env.local](frontend/.env.local) to your Gemini API key
4. Run the app:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

---

### Backend

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
5. Make sure your MySQL server is running and the `simplystocked` schema exists. Run the seed files in order using MySQL Workbench:
   ```
   sql_files/00_reset.sql
   sql_files/01_categories.sql
   ...
   sql_files/10_transactions.sql
   ```
6. Start the API server:
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

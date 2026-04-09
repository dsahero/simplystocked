# SimplyStocked

SimplyStocked is a comprehensive inventory management system consisting of a **React/Vite Frontend** and a **FastAPI/MySQL Backend**.

This guide covers everything you need to know to set up the application from scratch.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:
1. **Node.js** (v16+. Recommended: v20)
2. **Python** (v3.9 - 3.13)
3. **MySQL Server 8.0+**
   * *During installation, make sure to set up your `root` password, as you'll need it later.*
   * *Ensure the MySQL service is running on Port 3306.*

---

## 1. Database Setup

The backend expects a MySQL database named `SimplyStocked`.

1. **Create the Database:**
   Open your MySQL client or MySQL Workbench and run:
   ```sql
   CREATE DATABASE IF NOT EXISTS SimplyStocked;
   ```

2. **Load Initial Data & Schema:**
   The repository includes a complete database dump in the backend folder.
   Load it using the command line:
   ```bash
   mysql -u root -p SimplyStocked < backend/sql_files/databasedump.sql
   ```
   *(Enter your MySQL root password when prompted)*

3. **Seed the Admin User:**
   To safely populate your first usable login (with a correctly matched password hash format), use the included Python script in the backend folder. You will do this *after* you set up your Python environment in the next step.

---

## 2. Backend Setup (FastAPI)

The backend is a modern Python application using FastAPI and SQLAlchemy.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Configure Environment Variables:**
   Create a `.env` file inside the `backend` folder containing your MySQL root password.
   For example, edit `backend/.env` to look like this:
   ```env
   DB_PASSWORD=your_mysql_root_password_here
   ```

3. **Create and Activate a Virtual Environment:**
   Run the following commands in your terminal:
   ```bash
   python -m venv venv
   
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

4. **Install Dependencies:**
   With your virtual environment active, install the provided `requirements.txt`:
   ```bash
   pip install --upgrade pip wheel
   pip install -r requirements.txt
   
   # Note: For password hashing (bcrypt), some systems may require explicit wheel binaries. 
   # If you hit bcrypt `__about__` missing module errors later when verifying passwords, ensure bcrypt is updated:
   pip install -U bcrypt "passlib[bcrypt]"
   ```

5. **Seed the Admin Account:**
   Now that your Python environment is ready and your DB is online, generate the `admin@simplystocked.com` account with a clean hash using the included setup script:
   ```bash
   python seed_admin.py
   ```

6. **Start the Backend Server:**
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   The API will start at `http://127.0.0.1:8000`. You can check if it's working by opening `http://127.0.0.1:8000/health` in your browser.

---

## 3. Frontend Setup (React/Vite)

The frontend is a decoupled single-page React application that fetches data from the FastAPI backend.

1. **Navigate to the frontend directory:**
   Open a **new** terminal window (leave the backend running) and type:
   ```bash
   cd frontend
   ```

2. **Install Node Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Frontend Endpoints (Optional):**
   By default, the Vite app expects the backend to be running on `http://localhost:8000`. If you changed ports or plan to use an external backend, edit or create `frontend/.env` with:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Start the Frontend Development Server:**
   ```bash
   npm run dev
   ```
   The site will load on `http://localhost:5173` (or `http://localhost:3000`). Click the local link in your terminal to open it.

---

## 4. Using the App

With both the Frontend and Backend running, open the application in your browser.

Use following initial admin credentials to log in:
* **Username:** `admin@simplystocked.com`
* **Password:** `password`

You're all set!

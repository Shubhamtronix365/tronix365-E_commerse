# ⚡ Tronix365 E-commerce Platform

Tronix365 is a state-of-the-art, full-stack e-commerce web application engineered for high-performance product browsing, real-time inventory management, and automated checkout. With an aesthetic bento-grid dashboard, secure authentication, and a dynamic shopping cart, it serves as a robust prototype for an online electronics retail hub.

---

## ✨ Features
- **Modern Bento UI**: Beautiful, responsive layout with glassmorphic cards and dynamic animations.
- **Fuzzy Search & Filters**: High-performance backend search, pagination, category sorting, and price range filters.
- **Smart Shopping Cart**: Persistent cart state, client-side validation, and instant coupon/discount application.
- **Admin Inventory Dashboard**: Live product updates, order confirmation control panel, and coupon generator.
- **Brevo Email Notifications**: Automatic generation of beautiful HTML invoices emailed on confirmed orders.
- **Secure Authentication**: Encrypted password authentication (bcrypt), JWT tokens, and Google OAuth integration.
- **Rate Limiting & Caching**: Security features with Slowapi rate limiters and Redis/InMemory backend caching.

---

## 🌐 Production Hosting & Deployment

For a full step-by-step tutorial on hosting this project in production:
- **Database**: Serverless PostgreSQL via **NeonDB**
- **Backend API**: Python FastAPI via **Render**
- **Frontend Client**: React Single Page Application via **Hostinger**

Refer to our complete [Hosting & Configuration Guide](file:///C:/Users/Hi/.gemini/antigravity/brain/503fde86-f0b9-4cc0-b435-3167395d548b/hosting_guide.md) for details.

---

## 🚀 Novice-to-Expert Quick Run Guide

If you want to run this application locally from scratch as quickly as possible, follow this step-by-step guide.

### 📋 Prerequisites
First, make sure you have the following installed on your machine:
1. **Node.js** (LTS Version recommended) - [Download here](https://nodejs.org/)
2. **Python 3.10+** - [Download here](https://www.python.org/)
3. *Optional*: **PostgreSQL** (only if you want a production-grade database instead of the built-in SQLite)

---

### 🔧 Step-by-Step Installation

#### ⚙️ Part 1: Backend Setup (FastAPI Server)

1. **Open a terminal** (PowerShell/CMD on Windows, or Terminal on macOS/Linux) and navigate to the project directory:
   ```bash
   cd tronix365-E_commerse
   ```

2. **Navigate into the backend folder**:
   ```bash
   cd backend
   ```

3. **Create and Activate a Python Virtual Environment (`myenv`):**
   This isolates your Python dependencies so they do not conflict with other projects.
   * **Windows (Command Prompt / CMD):**
     ```cmd
     python -m venv myenv
     myenv\Scripts\activate.bat
     ```
   * **Windows (PowerShell):**
     ```powershell
     python -m venv myenv
     .\myenv\Scripts\Activate.ps1
     ```
     *(Note: If you get a script execution policy error in PowerShell, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first)*
   * **macOS / Linux:**
     ```bash
     python3 -m venv myenv
     source myenv/bin/activate
     ```

   Once activated, your terminal prompt will display `(myenv)`.

4. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure Environment Variables (`.env`):**
   Create a file named `.env` inside the `backend` folder. Copy and paste the following configuration:
   ```env
   # Database Settings (SQLite is the simplest for local testing - no installation required!)
   DATABASE_URL=sqlite:///./tronix365.db

   # Security
   SECRET_KEY=generated_secret_key_change_me_in_production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   FRONTEND_URL=http://localhost:5173

   # Email Configurations (SMTP Server - Brevo API example)
   BREVO_API_KEY=your_brevo_api_key_here
   CONTACT_EMAIL=your_email@gmail.com

   # PayU payment credentials (for test environments)
   PAYU_ENV=TEST
   PAYU_KEY=xFdsL0
   PAYU_SALT=VOo7u1I9JuewBQQwyA1X9PvonouDaDex
   ```

6. **Initialize and Seed the Database:**
   We have a helper script that automatically drops/creates tables and populates them with initial mock products and an admin account.
   Run this command from your active environment terminal:
   ```bash
   python seed.py
   ```
   This will output `Successfully seeded products and admin user!`.
   * **Default Admin Account:** `admin@tronix365.com`
   * **Default Admin Password:** `adminpassword123`

   *(Optional)* To create a custom admin user, run:
   ```bash
   python create_admin.py
   ```

7. **Start the Backend Server:**
   ```bash
   uvicorn main:app --reload
   ```
   The FastAPI API documentation will now be interactive at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

#### 💻 Part 2: Frontend Setup (React & Vite)

1. **Open a new terminal tab/window** and navigate to the project root directory:
   ```bash
   cd tronix365-E_commerse
   ```

2. **Install Node packages**:
   ```bash
   npm install
   ```

3. **Run the Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/e-commerse/](http://localhost:5173/e-commerse/) in your browser. You can now register/login, add products to the cart, apply coupon codes, and browse the admin panel!

---

## 🛠️ Folder Structure

```text
tronix365-E_commerse/
│
├── client/ (or src/)      # All frontend code (React)
│   ├── api/               # Axios instances and API call functions
│   ├── assets/            # Static assets (images, icons)
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context providers (Auth, Cart, etc.)
│   ├── pages/             # Page components (Home, Shop, Dashboard, etc.)
│   └── utils/             # Frontend helper functions
│
├── server/ (or backend/)  # All backend code (FastAPI)
│   ├── main.py            # FastAPI application entry point & routes
│   ├── models.py          # SQLAlchemy DB models & Pydantic validation schemas
│   ├── database.py        # Database connection setup
│   ├── auth.py            # JWT generation and password hashing logic
│   ├── email_utils.py     # SMTP email dispatching logic
│   ├── requirements.txt   # Python dependencies
│   ├── myenv/             # Python Virtual Environment
│   └── migrations/        # Alembic migration scripts
│
├── .gitignore
├── README.md
├── package.json
└── vite.config.js
```

---

## 💡 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7.
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy ORM.
- **Database**: PostgreSQL (Production) / SQLite (Local Development).
- **Authentication**: JWT (JSON Web Tokens) & Google OAuth2.
- **Caching & Rate Limiting**: Redis, Slowapi.

---

## 📦 Installed Libraries

### Frontend Packages (NPM)
- `react` / `react-dom` — Core UI structure.
- `react-router-dom` — Modern SPA routing.
- `axios` — HTTP request handler.
- `tailwindcss` / `@tailwindcss/postcss` — Modern styling compiler.
- `framer-motion` — Smooth transitions & page animations.
- `lucide-react` — Streamlined SVG icon suite.
- `react-hot-toast` — Sleek, responsive notifications.

### Backend Packages (PIP)
- `fastapi` — High-performance web framework.
- `uvicorn` — Fast ASGI web server.
- `sqlalchemy` — Python SQL Toolkit and Object Relational Mapper.
- `alembic` — Database migrations wrapper.
- `python-jose[cryptography]` — JWT encoder/decoder.
- `passlib[bcrypt]` — Password hashing algorithm.
- `python-dotenv` — Environment variables loader.
- `fastapi-cache2[redis]` — Caching controller.
- `slowapi` — Endpoint rate-limiter for security.

---

## 🔍 Key API Endpoints
FastAPI generates interactive documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). Here are some major endpoints:

* **Authentication**:
  - `POST /signup` - Register a standard client account
  - `POST /login` - Issue JWT tokens for active users
  - `POST /auth/google` - Fast authentication using Google Account OAuth
* **Product Catalog**:
  - `GET /products` - Fetch paginated list of items (supports query matching, ordering, and stock status)
  - `GET /products/{id}` - Fetch single product specs
* **E-Commerce Actions**:
  - `GET /cart` / `POST /cart` - Retrieve or modify active shopping items
  - `GET /wishlist` / `POST /wishlist` - Manage bookmark listings
  - `POST /orders` - Process checks, verify stocks, and submit orders

---

## ❓ Troubleshooting & FAQs

### 1. PowerShell Script Execution Policy Error (Windows)
**Error:** `Script cannot be loaded because running scripts is disabled on this system.`
**Solution:** Open PowerShell as an administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```
Then try activating the virtual environment again.

### 2. Port Collision (Address Already In Use)
**Error:** `[Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)`
**Solution:** This means another service (or a lingering uvicorn process) is running on port 8000.
You can run uvicorn on a different port:
```bash
uvicorn main:app --reload --port 8080
```
*Note: If you change the backend port, remember to update the base URL in the frontend Axios configuration.*

### 3. Missing Node Modules
**Error:** `vite: command not found`
**Solution:** Ensure you ran `npm install` in the project root directory before running `npm run dev`.

### 4. Database Schema Changes
If you modify database models and need to recreate the database tables, you can easily re-run the seeding script:
```bash
python seed.py
```
*(Warning: Running seed.py drops existing tables and resets the local database).*

---

## 🔮 Future Scope
- **Live Payments**: Integrate production payment APIs (Razorpay / Stripe).
- **Admin Dashboard Visuals**: Add interactive line charts for tracking daily sales, profit margins, and peak shopping hours.
- **Mobile Integration**: Package components using React Native.
- **CDN Integrations**: Store media/product assets on AWS S3 or Cloudinary.

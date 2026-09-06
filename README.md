# ⚡ Tronix365 E-commerce Platform

Tronix365 is a state-of-the-art, full-stack e-commerce web application engineered for high-performance product browsing, real-time inventory management, and automated checkout. With an aesthetic bento-grid dashboard, secure authentication, and a dynamic shopping cart, it serves as a robust prototype for an online electronics retail hub.

---

## ✨ Features

- **Modern Bento UI**: Beautiful, responsive layout with glassmorphic cards and dynamic animations.
- **Fuzzy Search & Filters**: High-performance backend search, pagination, category sorting, and price range filters.
- **Smart Shopping Cart**: Persistent cart state, client-side validation, and instant coupon/discount application.
- **Admin Inventory & Order Management**: Live product updates, order review authority, custom shipping courier selection, and coupon generator.
- **Automated Order Lifecycle Email System**: Branded, responsive HTML email templates for all order statuses (Order Placed, Confirmed, Shipped, Out for Delivery, Delivered, Cancelled, Refunds, Returns, Exchanges).
- **Mandatory Dual Recipients**: Every order notification email is automatically sent to both the registered customer and `shubham.tronix365@gmail.com`.
- **Database Email Audit Logging**: Records every sent/failed email with recipient details, subject, order ID, status trigger, and timestamp.
- **Custom Courier & Logistics Options**: Preset couriers (Porter, Delhivery, DTDC, Blue Dart, India Post, DHL, FedEx, XpressBees, Shadowfax, etc.) and custom free-text shipping input ("Other").
- **Mandatory 2FA (Password + Email OTP)**: Secure two-step authentication for user signup and login. OTPs are sent via Brevo SMTP and expire in exactly 2 minutes.
- **Tower Orders & On-Demand Factory Sourcing (B2B Procurement)**: Specialized manufacturing workflow for backorders, bulk indent orders, and non-inventory parts arranged directly through factory contacts with split-fulfillment capabilities.
  - **Split Fulfillment Architecture**: Immediate warehouse shipping for in-stock quantities + backorder factory indent for remaining quantities.
  - **6-Step Transparent Sourcing Workflow**:
    1. *Customer places Tower Order* (Customer details, Qty, Target Price) — Website & automated dual-email notification.
    2. *Sales engineering team review & contact* — Internal operations review.
    3. *Proforma Invoice (P.I.) / Official Quotation dispatch* — Official quote generated with automated email notification.
    4. *Customer bank transfer* (NEFT / RTGS / IMPS reference entry).
    5. *Payment verification & factory production initiation* — Auto-calculates dispatch and delivery windows with payment confirmation email.
    6. *Consignment shipment & live logistics tracker* — (Factory Lead Time + Shipping Transit Time tracked on customer portal with dispatch tracking email).
  - **Zero-Delay Real-Time Status Synchronization**: Instantaneous UI updates on the customer dashboard upon admin status changes via `BroadcastChannel`, `localStorage` cross-tab events, window focus listener, and smart background polling with visual milestone card pulse animations.
- **Google Customer Reviews Opt-In Integration**: Official Google Merchant Center post-checkout survey integration (Merchant ID: `5820417048`) on the order confirmation screen.
- **Saved Address Book & 1-Click Fast Checkout**: Complete multi-address book for registered customers (Home, Office, Factory, Warehouse, Other) with default address flags, automatic PIN code postal lookup (India Post API), and B2B GSTIN tax invoicing support.
  - **User Dashboard Address Book**: Add, edit, delete, and switch default shipping destinations with an intuitive dark bento UI.
  - **1-Click Checkout Autofill**: Automatic pre-selection of primary default address during checkout, interactive address cards, and seamless "+ Save this address" checkbox for new locations.
- **Mobile-First Responsiveness & Ergonomics**: Fully optimized touch experience across all screen sizes (360px phones up to 4K displays).
  - **Quick-Access Mobile Navbar**: Dedicated search and cart triggers directly in the top header with live animated item count badges.
  - **Mobile Dashboard Navigation**: App-style horizontal scrolling tabs and touch carousels for order status filters, removing ~400px of vertical scrolling.
  - **Mobile Sticky Action Bars**:
    - **Checkout & Cart**: Fixed sticky bottom bar displaying real-time grand total, tax/shipping indicators, item counts, and 1-tap checkout CTA.
    - **Product Details**: Persistent bottom action bar displaying item price, stock status, and prominent "Buy Now" / "Add to Cart" / "Tower Order" CTAs.
  - **Mobile Filter Drawer**: Responsive slide-over filter drawer with active filter pulse indicator on Shop page, keeping product feeds uncluttered on narrow displays.
  - **Touch-Optimized Quantity Steppers & Ergonomic Buttons**: Generously sized circular quantity buttons (`w-9 h-9 sm:w-8 sm:h-8`) with micro-spring tap feedback (`active:scale-95`).
  - **Native Mobile Keypad & iOS Zoom Prevention**: Input font sizing (`text-base sm:text-sm`) prevents Safari displacement; PIN and phone fields launch native numeric keypads (`inputMode="numeric"`).
- **Performance & Zero-CLS Skeleton Screens**:
  - **High-Fidelity Product Detail Skeletons**: `ProductDetailSkeleton` eliminates blank screen flashes and Cumulative Layout Shift (CLS) on product navigation.
  - **Related Products Skeleton Grid**: Replaces loading spinners with a 4-card placeholder grid to preserve layout stability while recommendations resolve.
  - **Raycast-Style Keyboard Navigation**: Search overlay supports seamless `ArrowDown`, `ArrowUp`, and `Enter` selection alongside graceful image fallback handling (`Image.jsx`).
  - **Shop Search Synchronization**: Filter pill displaying active query with 1-click dismiss button and synchronized React Router location params.
- **In-Memory Category Caching & Immediate Invalidation**: `GET /categories` requests are served in sub-milliseconds via backend memory cache with automatic invalidation upon admin category changes.
- **Abandoned Cart Recovery & Automated Email Engine**:
  - Automatically identifies uncompleted shopping carts inactive for $\ge 1$ hour where no subsequent orders have been placed.
  - Anti-spam safeguard: stamps items with `abandoned_email_sent_at` and automatically resets upon customer cart interaction (`add_to_cart`, `update_cart_item`, `merge_cart`).
  - Sends high-converting branded HTML recovery emails via Brevo with item thumbnails, quantities, subtotal, and an exclusive 5% incentive voucher code (`RECOVER5`).
  - Mandatory dual-recipient compliance (`shubham.tronix365@gmail.com`) and audit logged into `EmailLogDB`.
  - Admin Dashboard "Abandoned Carts" management tab with real-time pending badges, customer search, pending/sent filters, and 1-click single & bulk reminder dispatching.
  - CLI / Cron background runner (`backend/scripts/abandoned_cart_check.py`) for automated background execution.
- **Instant GST Tax Invoice & Reimbursement PDF Generator**:
  - One-click print-ready A4 Tax Invoice modal across User Dashboard, Order Details, and Admin Orders table.
  - Complete compliance with Indian GST laws: displays seller details (Tronix365 Technologies Pvt. Ltd., Pune, GSTIN `27AABCT3650Q1Z5`), HSN/SAC codes (8542 for ICs/boards, 8504 for power modules, 9031 for sensors), intra-state CGST (9%) + SGST (9%) or inter-state IGST (18%) breakdowns.
  - Full B2B support: includes customer company name, customer GSTIN, registered tax address, and Indian Rupee amount-in-words converter.
  - Print engine: scoped `@media print` CSS cleanly outputs directly to physical printers or browser **"Save as PDF"** without page clutter.
- **Quick BOM (Bill of Materials) CSV / Excel Upload Tool**:
  - Dedicated `/bom` workspace engineered for electronics labs, robotics competition teams, and hardware startups.
  - Dual input: drag-and-drop file uploader (`.csv` / `.txt`) with 1-click sample template download, plus an instant copy-paste textarea (`ESP32, 5` or `5x Arduino Uno`).
  - Intelligent backend matching engine (`POST /bom/match`): multi-tier matching via exact SKU, title substring, and tokenized keyword search with stock check and alternative product swappers.
  - 1-Click bulk action: adds all matched components directly into user cart with real-time total calculation.
- **Rate Limiting & Caching**: Security features with Slowapi rate limiters and Redis/InMemory backend caching.

---

## 🌐 Production Hosting & Deployment

For a full step-by-step tutorial on hosting this project in production:

- **Database**: Serverless PostgreSQL via **NeonDB**
- **Backend API**: Python FastAPI via **Render**
- **Frontend Client**: React Single Page Application via **Hostinger**
- **Health Check & SEO Protection**: Instant `GET /health` endpoint returning `200 OK`. Set up a 10-minute ping schedule (e.g. via UptimeRobot) to prevent Render free-tier spin-down from affecting search engine crawlers (Googlebot) and user response times.

Refer to our complete [Hosting & Configuration Guide](HOSTING_GUIDE.md) for details.

---

## 🚀 Novice-to-Expert Quick Run Guide

If you want to run this application locally from scratch as quickly as possible, follow this step-by-step guide.

### 📋 Prerequisites

First, make sure you have the following installed on your machine:

1. **Node.js** (LTS Version recommended) - [Download here](https://nodejs.org/)
2. **Python 3.10+** - [Download here](https://www.python.org/)
3. _Optional_: **PostgreSQL** (only if you want a production-grade database instead of the built-in SQLite)

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
   - **Windows (Command Prompt / CMD):**
     ```cmd
     python -m venv myenvenv\Scripts\activate.bat
     ```
   - **Windows (PowerShell):**
     ```powershell
     python -m venv myenv
     .\myenv\Scripts\Activate.ps1
     ```
     _(Note: If you get a script execution policy error in PowerShell, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first)_
   - **macOS / Linux:**
     ```bash
     python3 -m venv myenv
     source myenv/bin/activate
     ```

   O
   mynce activated, your terminal prompt will display `(myenv)`.

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
   - **Default Admin Account:** `admin@tronix365.in`
   - **Default Admin Password:** `adminpassword123`

   _(Optional)_ To create a custom admin user, run:

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

## 📦 Bulk Product CSV Import & Image Management

The platform includes an automated bulk import engine (`import_products.py`) to import or update hundreds of products directly into your database (SQLite locally or NeonDB in production).

### 1. File Locations & Structure
* **CSV File**: Save your Excel file as CSV UTF-8 at: `backend/products.csv`
* **Images Folder**: Place product images inside: `backend/components/`
  *(Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`)*

### 2. CSV Columns
| Column Header | Required? | Description & Format |
| :--- | :--- | :--- |
| `skv` | **YES** | Unique SKU code (e.g. `ARD-001`). Duplicate SKUs auto-append unique suffixes. |
| `title` | **YES** | Product Name (e.g. `Arduino Uno R3`). |
| `category` | **YES** | Category name for storefront filters (e.g. `Development Boards`). |
| `sale_price` | **YES** | Selling Price customer pays (e.g. `450`). |
| `mrp` | No | Original Price displayed strikethrough (e.g. `650`). |
| `stock` | No | Available stock count (default: `100`). |
| `image` | **YES** | Filename in `components/` or direct HTTP/HTTPS web link. |
| `description` | No | Detail description text. |
| `features` | No | Bullet list separated by `|` (e.g. `5V Logic|USB-C|ATmega328P`). |
| `specs` | No | Technical key-values separated by `|` & `:` (e.g. `Voltage:5V|Memory:2KB`). |

### 3. Smart Resiliency Features
* **Multi-Encoding Auto-Detect**: Auto-detects `UTF-8`, `UTF-8-SIG`, `CP1252`, and `Latin-1` encodings with fallback `errors="replace"` to prevent charmap decode crashes from Excel symbols.
* **Smart Image Matcher**: Case-insensitive and title-fallback image matching (e.g. matches `16x2 LCD Display` to `16x2 LCD Display.jpg`).
* **Automatic `uploads/` Sync**: Copies matched images from `components/` into `backend/uploads/` and links `/uploads/filename.jpg` in the database.

### 4. Import Commands
```powershell
cd backend
myenv\Scripts\activate

# Import / Update existing products
python import_products.py products.csv

# Wipe DB and fresh re-import (IDs reset to 1)
python import_products.py products.csv --reset
```

### 5. Syncing Images for Live Hosting (Render + NeonDB + Hostinger)
When deploying images to your live website:
```powershell
git add backend/uploads
git commit -m "feat: sync product images for live site"
git push origin main
```
Render automatically deploys the uploaded image directory, serving all product images live at `https://tronix365-e-commerse.onrender.com/uploads/`.

---

## 🛠️ Folder Structure

```text
tronix365-E_commerse/
│
├── src/                   # All frontend code (React 19 + Vite)
│   ├── api/               # Axios instances and API call clients
│   ├── assets/            # Static assets (images, icons, media)
│   ├── components/        # Reusable UI components
│   │   ├── dashboard/     # Modular dashboard sections (Orders, TowerOrders, Addresses, Profile)
│   │   ├── checkout/      # Modular checkout components (ShippingSelector, OrderSummary)
│   │   └── ui/            # UI atoms & modals
│   ├── context/           # React Context providers (AuthContext, CartContext, etc.)
│   ├── pages/             # Page components (Home, Shop, UserDashboard, Checkout, etc.)
│   └── utils/             # Frontend helper functions (imageUtils, seo, etc.)
│
├── backend/               # All backend code (FastAPI + SQLAlchemy)
│   ├── main.py            # Clean FastAPI orchestrator & route registration
│   ├── deps.py            # Centralized dependencies (auth, admin, rate limiter, db)
│   ├── routes/            # Modular APIRouters:
│   │   ├── auth_routes.py
│   │   ├── category_routes.py
│   │   ├── product_routes.py
│   │   ├── order_routes.py
│   │   ├── payment_routes.py
│   │   ├── tower_order_routes.py
│   │   ├── cart_routes.py
│   │   ├── wishlist_routes.py
│   │   ├── coupon_routes.py
│   │   ├── bundle_routes.py
│   │   ├── review_routes.py
│   │   ├── address_routes.py
│   │   ├── admin_routes.py
│   │   └── upload_routes.py (Secure WebP image pipeline)
│   ├── models.py          # SQLAlchemy DB models & Pydantic validation schemas
│   ├── database.py        # Database engine & session setup
│   ├── auth.py            # JWT tokens and password hashing
│   ├── email_utils.py     # Brevo SMTP dispatching & email templates
│   ├── requirements.txt   # Python dependencies
│   └── myenv/             # Python Virtual Environment
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
- `agentation` — Visual feedback & element annotation toolbar widget for AI agents (MCP server integration).

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

- **Authentication**:
  - `POST /signup` - Register a standard client account in an inactive state (`is_active = False`) and trigger a verification OTP email. Returns a challenge response with `status: "otp_required"`.
  - `POST /login` - Verify username and password credentials. If correct, trigger a verification OTP email. Returns a challenge response with `status: "otp_required"`.
  - `POST /auth/verify-otp` - Verify the OTP code. Activates the user (if signup) and returns JWT access and refresh tokens.
  - `POST /auth/resend-otp` - Generate a new OTP code and email it. Allowed only after 30 seconds (maximum 3 attempts within 15 minutes).
  - `POST /auth/google` - Fast authentication using Google Account OAuth.
- **Product Catalog**:
  - `GET /products` - Fetch paginated list of items (supports query matching, ordering, and stock status)
  - `GET /products/{id}` - Fetch single product specs
- **E-Commerce Actions**:
  - `GET /cart` / `POST /cart` - Retrieve or modify active shopping items
  - `GET /wishlist` / `POST /wishlist` - Manage bookmark listings
  - `POST /orders` - Process checks, verify stocks, and submit orders
- **Tower Orders (B2B Factory Procurement & On-Demand Sourcing)**:
  - `POST /tower-orders` - Place new Tower Order with split fulfillment quantities, target price, and customer specs
  - `GET /tower-orders/user` - Fetch active customer's Tower Orders and lifecycle milestones
  - `GET /tower-orders/{order_ref}` - Detailed inquiry inspection (by ID or `TO-YYMMDD-XXXX` format)
  - `POST /tower-orders/{order_id}/payment-proof` - Customer submits bank transfer reference (NEFT/RTGS UTR)
  - `GET /tower-products` - Fetch factory catalog products flagged as on-demand sourcing only
  - `GET /admin/tower-orders` - Admin view with status filtering (`requested`, `contacted`, `quotation_sent`, `payment_pending`, `in_production`, `shipped`, `completed`)
  - `PUT /admin/tower-orders/{order_id}/status` - Step 2: Update sales contact notes & status
  - `PUT /admin/tower-orders/{order_id}/quotation` - Step 3: Issue official P.I. number, quoted unit price, total, and lead days
  - `PUT /admin/tower-orders/{order_id}/verify-payment` - Step 5: Mark funds verified, transition to `in_production`, auto-calculate dispatch and delivery dates
  - `PUT /admin/tower-orders/{order_id}/shipment` - Step 6: Dispatch goods with courier name, tracking number, and live tracking URL
- **Saved Addresses & Address Book**:
  - `GET /addresses` - Fetch authenticated user's address book ordered with default address first
  - `POST /addresses` - Save a new delivery location (handles automatic default prioritization and GSTIN details)
  - `PUT /addresses/{id}` - Modify existing address attributes
  - `DELETE /addresses/{id}` - Delete address (automatically designates next newest address as default if deleted was default)
  - `PUT /addresses/{id}/set-default` - Set selected address as user's primary delivery address
- **Abandoned Cart Recovery**:
  - `GET /admin/abandoned-carts` - List all inactive carts ($\ge 1\text{h}$) with items, cart value, customer information, email status, and overall summary metrics
  - `POST /admin/abandoned-carts/{target_user_id}/send` - Send a recovery email reminder with item summaries & voucher code to a specific user
  - `POST /admin/abandoned-carts/send-all` - Bulk send recovery reminders to all pending abandoned carts that have not yet been notified
  - **Background Runner**:
    ```bash
    cd backend
    python scripts/abandoned_cart_check.py
    ```
- **Project Bill of Materials (BOM) Matching**:
  - `POST /bom/match` - Bulk part matching engine accepting a list of component queries/SKUs and quantities; returns match status, pricing, stock levels, and alternative suggestions.

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

_Note: If you change the backend port, remember to update the base URL in the frontend Axios configuration._

### 3. Missing Node Modules

**Error:** `vite: command not found`
**Solution:** Ensure you ran `npm install` in the project root directory before running `npm run dev`.

### 4. Database Schema Changes

If you modify database models and need to recreate the database tables, you can easily re-run the seeding script:

```bash
python seed.py
```

_(Warning: Running seed.py drops existing tables and resets the local database)._

---

## 🔮 Future Scope

- **Live Payments**: Integrate production payment APIs (Razorpay / Stripe).
- **Admin Dashboard Visuals**: Add interactive line charts for tracking daily sales, profit margins, and peak shopping hours.
- **Mobile Integration**: Package components using React Native.
- **CDN Integrations**: Store media/product assets on AWS S3 or Cloudinary.

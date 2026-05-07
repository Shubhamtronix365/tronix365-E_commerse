# Tronix365 E-commerce

## Description
Tronix365 is a modern, full-stack e-commerce platform designed to provide a seamless shopping experience. It features comprehensive product discovery, secure user authentication, shopping carts, wishlists, and order management. The platform also includes a dedicated Admin Dashboard for managing inventory, coupons, and bundled product offers. It is built with a React frontend and a fast, scalable FastAPI backend.

## Features
- **User Authentication**: Secure Signup, Login, and Admin access using JWT and refresh tokens.
- **Product Management**: Browse, search, filter, and view related product recommendations.
- **Shopping Experience**: Dynamic Shopping Cart and Wishlist functionality.
- **Order Processing**: Checkout system supporting Coupons and Bundled Products with inventory locking.
- **User Engagement**: Product reviews, ratings, and a contact form with automated email notifications.
- **Admin Dashboard**: Comprehensive control over products, stock levels, discount coupons, and bundles.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7.
- **Backend**: FastAPI (Python 3), SQLAlchemy ORM.
- **Database**: PostgreSQL (Production) / SQLite (Local Development).
- **Authentication**: JWT (JSON Web Tokens).
- **Caching & Rate Limiting**: Redis, Slowapi.

## Folder Structure
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

## Core Utilities & Scripts

The backend utilizes several standalone utility scripts and helper files to manage logic, database operations, and maintenance:

### Helper Files (Backend)
- `utils.py`: Contains data sanitization (`bleach`) to prevent XSS attacks and image processing (`Pillow`) to optimize uploaded images to WebP format.
- `email_utils.py`: Handles all asynchronous SMTP operations including order confirmations and contact form notifications.
- `auth.py`: Centralized security file handling JWT generation, validation, and bcrypt password hashing.

### Management Scripts (Backend)
- `create_admin.py`: Use this script to quickly scaffold an admin user to access the Admin Dashboard.
- `seed.py` / `seed_neon_db.py`: Scripts used to initially populate the database (SQLite or NeonDB) with mock products, bundles, and coupons for testing.
- `import_products.py`: A bulk import utility to load products into the database from CSV/JSON templates.
- `run_migration.py`: Helper script to programmatically trigger Alembic schema upgrades.

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment named `myenv`:
   - **Windows:**
     ```bash
     python -m venv myenv
     myenv\Scripts\activate
     ```
   - **Linux/Mac:**
     ```bash
     python -m venv myenv
     source myenv/bin/activate
     ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the backend directory and configure your environment variables.

### 2. Frontend Setup
1. Open a new terminal in the project root directory.
2. Install the necessary Node modules:
   ```bash
   npm install
   ```

## Run Commands

**To Run the Backend (make sure `myenv` is active):**
```bash
cd backend
uvicorn main:app --reload
```
*The API runs at `http://127.0.0.1:8000`. API Docs are at `/docs`.*

**To Run the Frontend:**
```bash
# In the root directory
npm run dev
```
*The frontend runs at `http://localhost:5173`.*

## Installed Libraries

**Frontend Packages (NPM):**
- `react` / `react-dom` → UI Library
- `vite` → Build tool and development server
- `react-router-dom` → Application routing
- `axios` → Making API calls to the backend
- `tailwindcss` / `@tailwindcss/postcss` → Utility-first CSS styling
- `framer-motion` → Complex UI animations
- `lucide-react` → SVG Icons
- `react-hot-toast` → Notification toasts

**Backend Packages (PIP):**
- `fastapi` → High-performance web framework
- `uvicorn` → ASGI web server
- `sqlalchemy` → Database ORM
- `alembic` → Database migration tool
- `python-jose[cryptography]` → JWT token creation and validation
- `passlib[bcrypt]` → Secure password hashing
- `python-dotenv` → Environment variable management
- `fastapi-cache2[redis]` → Endpoint caching
- `slowapi` → Rate limiting for API security

## Environment Variables
Create a `.env` file in the `backend/` folder with the following keys:
```env
# Database Configuration
DATABASE_URL=sqlite:///./tronix365.db  # Or your PostgreSQL URI

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Email (SMTP for sending confirmations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Optional Redis
REDIS_URL=redis://localhost:6379
```

## API Details
*Note: This is a high-level overview. Full interactive documentation is automatically generated by FastAPI at `http://127.0.0.1:8000/docs`.*

- **Auth endpoints**: 
  - `POST /signup` - Register a new user
  - `POST /login` - Obtain JWT access tokens
- **Products endpoints**:
  - `GET /products` - Fetch all products (supports pagination, filtering, searching)
  - `GET /products/{id}` - Fetch single product
- **Cart/Wishlist endpoints**:
  - `GET /cart`, `POST /cart` - Manage cart items
  - `GET /wishlist`, `POST /wishlist` - Manage wishlist items
- **Order endpoints**:
  - `POST /orders` - Create a new order (locks stock and price)
  - `GET /orders/user` - View order history

## Future Scope
- **Payment Gateway Integration**: Implement Stripe, Razorpay, or PayPal for processing live transactions.
- **Advanced Admin Analytics**: Graphical charts representing sales, user growth, and stock velocity.
- **Mobile Application**: Porting the frontend to React Native for iOS and Android platforms.
- **User Profile Enhancements**: Cloud upload (e.g., AWS S3) for profile pictures and product media.

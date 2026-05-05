# Tronix365 E-commerce Platform

## Description
Tronix365 is a high-performance, full-stack e-commerce application designed for selling electronics and gadgets. It features a stunning Neo-Glass UI built with React and a high-concurrency backend powered by FastAPI. The platform integrates advanced features such as real-time stock management, Redis-backed caching, rate-limited secure endpoints, and professional database migrations.

## Features
- **User Authentication**: Secure Signup/Login with JWT (dual-token rotation) and password visibility toggles.
- **Product Catalog**: Advanced search with fuzzy matching, category filtering, and server-side pagination.
- **Visual Polish**: Shimmer-effect skeleton loaders, glassmorphism aesthetics, and smooth page transitions.
- **Shopping Cart**: Real-time synchronization between guest and authenticated user states.
- **Checkout Process**: Secure payment flow integration (PayU) with order tracking history.
- **Admin Dashboard**: Comprehensive stats (Revenue, Orders, Products, Users) with dedicated management tables for Coupons and Bundles.
- **Marketing Tools**: 
    - **Coupon System**: Advanced discount code engine with real-time validation and checkout integration.
    - **Product Bundles**: "Buy Together & Save" offers with intelligent cart recognition and discounted pricing.
    - **Abandoned Cart Recovery**: Automated inactivity tracking and premium email re-engagement (via Brevo).
- **Security**: Request rate limiting (SlowAPI), HTML sanitization (Bleach), and XSS protection.
- **Performance**: Automatic WebP image optimization and Redis caching layer.

## Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS 4, Framer Motion, Lucide Icons.
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL/SQLite), Pydantic, Alembic.
- **Infrastructure**: Redis (Cache), SlowAPI (Rate Limiting), PayU (Payment).

## Folder Structure
```bash
project-root/
|-- backend/             # FastAPI Backend Server (MVC/Layered Pattern)
|   |-- main.py          # Entry Point & Primary Routes
|   |-- models.py        # Database Models (SQLAlchemy)
|   |-- auth.py          # JWT & Security Logic
|   |-- database.py      # Connection Configuration
|   |-- utils.py         # Image Processing & Sanitization
|   |-- migrations/      # Alembic Version History
|   |-- myenv/           # Python Virtual Environment
|
|-- src/                 # React Frontend Source
|   |-- components/      # Modular UI (admin/, common/, layout/, product/)
|   |-- pages/           # Route Components (Home, Shop, Dashboards)
|   |-- context/         # Global State (Auth, Cart, Wishlist)
|   |-- api/             # API Client Configuration
|   |-- assets/          # Static Media
|
|-- public/              # Static Frontend Assets
|-- .gitignore           # Version Control Exclusions
|-- README.md            # Project Documentation
|-- package.json         # Node.js Dependencies
```

## Setup Instructions

### 1. Backend Setup (server)
Navigate to the `backend` directory:
```bash
cd backend
```

Create and activate the virtual environment:
```bash
# Windows
python -m venv myenv
myenv\Scripts\activate

# Linux/Mac
python3 -m venv myenv
source myenv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

### 2. Frontend Setup (client)
Open a new terminal in the project root:
```bash
npm install
```

## Run Commands

### Backend
From the `backend` directory (with `myenv` active):
```bash
uvicorn main:app --reload
```

### Frontend
From the project root:
```bash
npm run dev
```

## Installed Libraries

### Python (Backend)
- `fastapi`, `uvicorn`: API core.
- `sqlalchemy`, `alembic`: Database and migrations.
- `slowapi`: Rate limiting protection.
- `redis`, `fastapi-cache2`: Performance optimization.
- `bleach`: Input sanitization.
- `Pillow`: Image processing/WebP conversion.

### npm (Frontend)
- `react-router-dom`: Modern routing.
- `framer-motion`: Premium animations and transitions.
- `axios`: API integration.
- `lucide-react`: Iconography.
- `react-hot-toast`: Interactive notifications.

## Environment Variables
Create a `.env` file in the `backend/` directory:
| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | SQLAlchemy connection string (e.g., `sqlite:///./tronix365.db`) |
| `SECRET_KEY` | Secret key for JWT signing |
| `REDIS_URL` | Redis connection URL (e.g., `redis://localhost:6379`) |
| `PAYU_KEY` | Merchant Key for PayU payment gateway |
| `PAYU_SALT` | Merchant Salt for PayU payment gateway |

## API Details
- **Auth**: `POST /login`, `POST /signup`, `GET /profile`, `POST /refresh`.
- **Products**: `GET /products`, `GET /products/search`, `POST /products`.
- **Wishlist/Cart**: `GET /wishlist`, `POST /wishlist`, `GET /cart`, `POST /cart/merge`.
- **Orders**: `POST /orders`, `GET /orders/user`, `GET /orders/{id}`.
- **Marketing**: `POST /apply-coupon`, `GET /bundles`, `POST /cart/bundle/{bundle_id}`.
- **Admin**: `GET /admin/stats`, `POST /admin/coupons`, `POST /admin/bundles`.

## Future Scope
- **TypeScript Migration**: Converting JS/JSX files to TS/TSX for better scalability.
- **Global Search**: Integration with Meilisearch or Algolia for lightning-fast results.
- **Advanced Recommendations**: Personalized AI-driven product suggestions.
- **Order Tracking**: Real-time visual pipeline for shipment status.
- **Advanced Social Proof**: Image-based reviews and live inventory scarcity alerts.

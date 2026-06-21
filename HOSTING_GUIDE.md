# 🚀 Tronix365 Production Hosting & Deployment Guide

This guide describes the steps required to deploy the **Tronix365 E-commerce Platform** into a production environment.

## 🛠️ Deployment Architecture
* **Database**: Serverless PostgreSQL via **NeonDB**
* **Backend API**: Python FastAPI via **Render**
* **Frontend Client**: React SPA via **Hostinger (Shared Apache Hosting)**

---

## 💾 Part 1: Database Setup (Neon PostgreSQL)

1. **Create a Neon Project**:
   * Sign up at [Neon.tech](https://neon.tech) and create a new project.
   * Copy the provided **connection string** (e.g., `postgresql://neondb_owner:password@host.aws.neon.tech/neondb?sslmode=require`).

2. **Migrate & Seed the Database**:
   * In your backend `.env` file, set `DATABASE_URL` to your Neon connection string.
   * Run the production seeding script to initialize all tables and populate mock products:
     ```bash
     cd backend
     python seed_neon_db.py
     ```
   * Confirm the output states `Successfully seeded products and admin user!`.

---

## ⚙️ Part 2: Backend API Deployment (Render)

1. **Create a Web Service on Render**:
   * Connect your GitHub repository to [Render.com](https://render.com).
   * Create a new **Web Service**.
   * Set **Root Directory** to `backend`.
   * Set **Runtime** to `Python 3`.

2. **Build and Start Commands**:
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Configure Environment Variables**:
   Add the following environment variables in the Render Dashboard:

   | Variable Name | Description / Value |
   |---|---|
   | `DATABASE_URL` | Your Neon Postgres connection string |
   | `BREVO_API_KEY` | SMTP email API key from Brevo |
   | `CONTACT_EMAIL` | Verified sender email address |
   | `SECRET_KEY` | A secure, random string for signing JWT tokens |
   | `CORS_ORIGINS` | `https://www.tronix365.in,https://tronix365.in` |
   | `FRONTEND_URL` | `https://www.tronix365.in/e-commerse` |
   | `BACKEND_URL` | Your live Render service URL (e.g., `https://your-app.onrender.com`) |
   | `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
   | `GEMINI_API_KEY` | Gemini API Key for chatbot integrations |

---

## 💻 Part 3: Frontend Deployment (Hostinger)

Vite uses compile-time environment variables. The repository is pre-configured with a `.env.production` file to automate builds without disrupting local development.

1. **Compile the Production Build**:
   * Make sure `.env.production` exists in the root folder with:
     ```env
     VITE_API_URL=https://tronix365-e-commerse.onrender.com
     VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
     ```
   * Run the compile script in the project root:
     ```bash
     npm run build
     ```
   * This generates a `dist` directory. The build script automatically copies static configuration files (`.htaccess`, `index.php`, `robots.txt`, and `sitemap.xml`) from `public/` into `dist/`.

2. **Upload to Hostinger**:
   * Connect to your Hostinger hosting control panel (hPanel) or use FTP.
   * Navigate to your website root (usually `public_html`).
   * Create a subdirectory named `e-commerse` (so the URL becomes `https://www.yourdomain.in/e-commerse`).
   * Upload the **contents** of the compiled `dist/` directory directly into the `public_html/e-commerse/` folder.

3. **SPA Fallback & SEO Injection (Apache/Hostinger)**:
   * **`.htaccess`**: Ensures that all routes under `/e-commerse/` are internally redirected to `index.php`, allowing React Router to handle page loads directly without throwing `404 Not Found` errors.
   * **`index.php`**: Intercepts web requests (especially crawlers like Googlebot) and fetches dynamic metadata or schema data from your FastAPI database to inject tags before serving the final page structure to the browser.

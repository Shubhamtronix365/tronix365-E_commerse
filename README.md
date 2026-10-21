# ⚡ Tronix365 E-commerce Platform

Tronix365 is a state-of-the-art, full-stack e-commerce web application engineered for high-performance product browsing, real-time inventory management, and automated checkout. With an aesthetic bento-grid dashboard, secure authentication, and a dynamic shopping cart, it serves as a robust prototype for an online electronics retail hub.

---

## ✨ Features

- **Modern Bento UI**: Beautiful, responsive layout with glassmorphic cards and dynamic animations.
- **Fuzzy Search & Filters**: High-performance backend search, pagination, category sorting, and price range filters.
- **Smart Shopping Cart**: Persistent cart state, client-side validation, and instant coupon/discount application.
- **Smart Catalog Sorting & Price Pending Prioritization**: Automatically identifies products imported from supplier catalogs without established retail prices (flagged `is_price_pending`), placing them gracefully at the very end of all shop catalog and category listings so active, priced inventory is always prioritized.
- **Strict 2-Decimal Currency Precision & Accurate GST Engine**: Guarantees financial mathematical precision using standard INR formatting (2 decimal places). Enforces 2 decimal float formatting (e.g. `261.00`, `36.36`) across product cards, product details, shopping cart totals, wishlist, search overlays, and invoices.
- **Direct Quantity Input for Large Orders**: Product details and shopping cart now feature direct editable numeric inputs in addition to `-` and `+` steppers, allowing customers to easily type exact quantities (e.g., 50, 100, 500 units) without repeated clicking.
- **Resilient Product Slug Matching & Entity Sanitization**: Resolves 404 errors on products containing ampersands or HTML entities (e.g., DHT11 and DHT22 digital temperature & humidity sensors). Front-end `slugify.js` and back-end `get_product_by_slug` normalize `-amp-` and `-and-` slugs to guarantee seamless routing and canonical redirects.
- **Dynamic Pincode Delivery Estimator & Pune Next Day Delivery**:
  - Interactive PIN code checker supporting all Indian postal codes with instant City/State lookup via India Post API.
  - Dynamically calculates BlueDart Air and Standard Surface shipping dates.
  - Highlights **"Next Day Delivery in Pune"** with guaranteed local dispatch for all Pune postal codes (`411xxx`), along with fast delivery badges.
- **Mandatory Unboxing Video Policy (Terms & Conditions / Return & Refund)**:
  - Formally integrated into the platform's legal **Terms & Conditions** (`/terms`) and **Return & Refund Policy** (`/return-refund`).
  - Outlines the requirement that customers must record an uninterrupted, uncut unboxing video at the time of receiving and opening their parcel from the courier.
  - Serves as required verification proof for transit damage, missing items, or defective components, ensuring swift approval and dispatch of replacements within 2 working days.
  - Clarifies that without video proof recorded at delivery, establishing transit damage is difficult and replacement claims cannot be processed.
- **Cleaned Product Dossier & Specifications Table**:
  - Description tab streamlined for optimal reading: **Key Features** → **Package Includes** (Applications and Useful Links temporarily omitted from storefront).
  - Strips malformed curly braces `{}` and raw JSON strings in product features; accurately formats attributes (e.g. `Model: PZEM-004T`, `Operating Voltage: 3.5V to 5.5V`).
  - Completely removed "Quick Start Guide & Safety Manual" boilerplate from Package Includes across all products.
  - Formatted Specifications tab as a responsive, high-contrast HTML table with Specification and Details columns across 100% of products; features automated frontend parsing and backend database normalization for smashed JSON/dict strings, ensuring every product renders a clean, professional multi-row table.
- **Admin High-Capacity Inventory & Catalog Management**: Enterprise-grade product management designed for catalogs of any scale (300+ to 10,000+ items).
  - **Dynamic Page Size Selector**: Switch instantly between 25, 50, 100, 250, or **"All Products"** (`limit=0`), eliminating repetitive clicks on "Load More".
  - **Fast Multi-Field Server Search**: Instant debounced search querying product titles, descriptions, categories, and SKUs directly in PostgreSQL.
  - **Comprehensive Multi-Dimensional Filters**: Filter by Category dropdown, Stock status pills (*All*, *In Stock*, *Low Stock $\le 10$*, *Out of Stock*), and Sort options (*Newest*, *Oldest*, *Name A–Z*, *Name Z–A*, *Price Low–High*, *Price High–Low*, *Stock Low–High*, *Stock High–Low*).
  - **Interactive Numbered Pagination & Jump Controls**: First (`«`), Previous (`‹`), dynamic numbered window (`1, 2, 3 ...`), Next (`›`), and Last (`»`) controls with accurate item range indicators (`Showing 1–50 of 366 products`).
  - **Product Productivity Enhancements**: Dedicated SKU input in add/edit product modal, 1-click SKU copying to clipboard, direct storefront product link (`ExternalLink`), real-time stock badges, and synchronized dual-tier image storage.
- **Omnichannel SKU & Part Number Synchronization System**:
  - **Real-Time Catalog & Admin Sync**: Unifies product `sku` and `skv` across PostgreSQL, ensuring changes made in the Admin Edit Modal immediately reflect across the product catalog table, search filters, and store APIs without drift.
  - **Storefront Product Page Visibility**: Prominent SKU / Part Number badge with 1-click clipboard copy directly on every product page and shop catalog card, providing instant access for engineers, makers, and store managers.
  - **Instant Order SKU Visibility (No Login Required)**: Every order notification email sent to the store admin (`shubham.tronix365@gmail.com`) and customer clearly displays item SKUs under product titles for instant warehouse picking.
  - **Admin Orders Feed & Modal Integration**: Order cards on the admin feed display purchased item summaries with SKU tags (`[BHavesh] × 1`), and the Order Modal features 1-click SKU copy buttons on every line item.
  - **Database Order Item Snapshots**: Permanently captures `product_sku` in `order_items` at checkout time, preserving historical part numbers regardless of future catalog edits.
- **Automated Order Lifecycle Email System**: Branded, responsive HTML email templates for all order statuses (Order Placed, Confirmed, Shipped, Out for Delivery, Delivered, Cancelled, Refunds, Returns, Exchanges).
- **Mandatory Dual Recipients**: Every order notification email is automatically sent to both the registered customer and `shubham.tronix365@gmail.com`.
- **Database Email Audit Logging**: Records every sent/failed email with recipient details, subject, order ID, status trigger, and timestamp.
- **Custom Courier & Logistics Options**: Preset couriers (Porter, Delhivery, DTDC, Blue Dart, India Post, DHL, FedEx, XpressBees, Shadowfax, etc.) and custom free-text shipping input ("Other").
- **Mandatory 2FA (Password + Email OTP) & Smart Account Verification**: Secure two-step authentication for registered accounts. Unregistered emails attempting to log in receive an explicit 404 with a 1-click "Create Account" CTA carrying their pre-filled email to `/signup` instead of invalid OTP challenges or generic password errors. Google OAuth users without passwords are automatically prompted to use "Continue with Google".
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
- **Mobile-First Responsiveness & Dynamic Device Adaptation**: Fully optimized touch and screen experience across all form factors (320px–430px compact phones, 768px–1024px tablets, laptops, and ultra-wide displays).
  - **Bezel-Less Viewport & Safe-Area Insets**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` with CSS `safe-area-bottom` (`padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))`) ensuring sticky bars never collide with home indicators on modern iPhones or Android navigation gestures.
  - **2-Column Mobile Retail Grid**: Converted mobile catalog and featured product feeds to standard 2-column e-commerce grids (`grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), eliminating oversized single-column cards on phones.
  - **Mobile Drawer Auto-Dismissal**: Navigation links in the mobile drawer automatically close the menu overlay upon route transition.
  - **Zero Horizontal Overflow**: Added global `-webkit-overflow-scrolling: touch`, `max-width: 100vw`, and `overflow-x: hidden` preventing sideways layout shifting on all viewports.
  - **Fluid 6-Digit OTP Sizing**: Responsive OTP input dimensions (`w-9 h-11 xs:w-11 xs:h-12 sm:w-12 sm:h-12 gap-1.5 sm:gap-2`) preventing modal card overflow on narrow 320px–360px screens.
  - **Virtual Keyboard Clearance**: Constrained `SearchOverlay` top padding (`pt-16 sm:pt-24`) and max height (`max-h-[82vh]`) to prevent search results from being hidden behind software keyboards.
  - **Sticky Action Bar Content Clearance**: Added bottom padding (`pb-28 sm:pb-32 lg:pb-16`) to `ProductDetails` and `Checkout` so persistent bottom action bars never obscure reviews, related items, or agreement terms.
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
  - Sends branded HTML recovery reminder emails via Brevo with item thumbnails, quantities, subtotal, and 1-click cart resume CTA.
  - Mandatory dual-recipient compliance (`shubham.tronix365@gmail.com`) and audit logged into `EmailLogDB`.
  - Admin Dashboard "Abandoned Carts" management tab with real-time pending badges, customer search, pending/sent filters, **multi-select checkboxes with "Select All"**, **bulk email reminders**, and **single / bulk cart deletion controls**.
  - **Storefront Cart Sync**: Whenever a customer removes an item or clears their shopping cart on the storefront, items are immediately deleted from `CartItemDB`, permanently removing empty carts from the admin recovery queue.
  - CLI / Cron background runner (`backend/scripts/abandoned_cart_check.py`) for automated background execution.
- **Instant GST Tax Invoice & Reimbursement PDF Generator**:
  - One-click print-ready A4 Tax Invoice modal across User Dashboard, Order Details, and Admin Orders table.
  - Complete compliance with Indian GST laws: displays seller details (Tronix365 Technologies Pvt. Ltd., Pune, GSTIN `27AABCT3650Q1Z5`), HSN/SAC codes (8542 for ICs/boards, 8504 for power modules, 9031 for sensors), intra-state CGST (9%) + SGST (9%) or inter-state IGST (18%) breakdowns.
  - Full B2B support: includes customer company name, customer GSTIN, registered tax address, and Indian Rupee amount-in-words converter.
  - Print engine: scoped `@media print` CSS cleanly outputs directly to physical printers or browser **"Save as PDF"** without page clutter.
- **Mobile Web Performance & Core Web Vitals Optimization (PageSpeed 90-100 Ready)**:
  - **Asset Weight Reduction (~6 MB eliminated)**:
    - Converted high-resolution PNG assets into modern high-efficiency WebP format using Pillow: `robotics.png` (1.9 MB → 134 KB, 92.9% reduction), `featured_bg.png` (1.31 MB → 20 KB, 98.4% reduction), `Tronix1_preview.png` (1.45 MB → 97 KB, 93.3% reduction), and `logo.png` (238 KB → 40 KB, 82.9% reduction).
    - Resized Unsplash hero and banner images from `w=2000` to mobile-friendly `w=1000&q=75&auto=format` and `w=800&q=65`.
  - **LCP & FCP Acceleration (Largest & First Contentful Paint)**:
    - Preloaded first hero slide image directly in `<head>` via `<link rel="preload" as="image" href="..." fetchpriority="high" />`, enabling the browser to begin image downloads concurrently with HTML parsing before React bundles execute.
    - Assigned explicit `fetchPriority="high"`, `loading="eager"`, and `decoding="sync"` to critical viewport hero images.
  - **Apache Deflate & Browser Caching (`public/.htaccess`)**:
    - Configured `mod_deflate.c` to enable Gzip/Deflate compression for HTML, CSS, JavaScript, JSON, SVG, and fonts, reducing network transfer sizes by ~70–80%.
    - Implemented `mod_expires.c` and `mod_headers.c` with 1-year immutable caching (`max-age=31536000, public, immutable`) for content-hashed Vite chunks (`.js`, `.css`, `.webp`, `.png`, `.woff2`).
    - Enforced `no-cache` revalidation for entry point HTML/PHP to guarantee zero-latency deployment of new code revisions.
  - **Non-Critical Code-Splitting & Video Preload Control**:
    - Code-split `ThreeDShowcase` into a separate lazy-loaded bundle (`React.lazy()` + `<Suspense />`), preventing heavy 3D motion hooks and video references from competing with the initial hero render.
    - Switched hardware video showcase from `preload="auto"` to `preload="none"`, saving 3.2 MB of cellular data on mobile.
  - **Zero CLS & Layout Stability**:
    - Supplied explicit `width` and `height` attributes to all images and components (`ProductCard`, `Image.jsx`, `Navbar`, `Footer`, `Login`, `Signup`, `ProductDetails`).
  - **Deferred Non-Critical 3rd-Party Scripts**:
    - Defer Google Customer Reviews Merchant Badge initialization to `requestIdleCallback` after window `load` event, preventing external scripts from blocking main thread execution.
- **Highlighted 2–3 Hour Preparation Notice (Store Pickup & Free Shipping)**:
  - **Full Dual-Channel Synchrony**: Displayed prominently in transactional order emails and across the frontend ([`PaymentStatus.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/pages/PaymentStatus.jsx), [`OrderDetails.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/pages/OrderDetails.jsx), [`OrdersSection.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/components/dashboard/OrdersSection.jsx), and checkout shipping selector).
  - **Exact Order Timestamping**: Explicitly renders the exact order placement time with hour, minute, and AM/PM format (e.g. `October 10, 2026 at 11:05 AM IST`).
  - **Dynamic 2–3 Hour Readiness Window**: Calculates and displays the estimated readiness/dispatch window (`Within 2–3 Hours: 1:05 PM – 2:05 PM IST`).
  - **Office Pickup Logistics**: Highlights Pune Office pickup counter location and operational hours (`9:30 AM – 6:00 PM`).
- **Modernized Engineering Blog Platform & Security-Proof Admin Dashboard**:
  - **High-Presence Public Blog Hub (`/blogs`)**: Futuristic bento-grid layout featuring hero spotlight cards, category filter pills (Tutorials, Hardware Review, Robotics & AI, IoT, Guides), search bar, reading time metrics, and responsive author badges.
  - **Interactive Hardware Post Reader (`/blog/:slug`)**:
    - Sticky top reading progress bar ($0\% \to 100\%$).
    - Auto-generated Table of Contents from `<h2>` and `<h3>` headings with smooth anchor navigation.
    - Syntax-highlighted code blocks with 1-click **"Copy Code"** clipboard button.
    - Hardware Pinout & Specs Tables, engineering tip callouts, and verified lab badge.
    - **Components Used (BOM) Integration**: Displays required hardware modules with direct links to catalog/shop for instant purchasing.
    - Social sharing buttons (WhatsApp, Twitter/X, LinkedIn, direct copy link).
    - Bottom related articles recommendation engine (3 contextual posts).
  - **Standalone Blog Studio (`/blogs/studio`), Multi-Author Access & Admin Moderation**:
    - Dedicated workspace for authors (`role == "blog_author"` or `admin`) with rich Markdown/HTML editor, live preview, BOM component selector, and image/media embeds.
    - **System-Generated Author Accounts & Management**: Administrators can generate author logins on-demand with cryptographically random 16-character passwords and 1-click credential copying from the Admin Dashboard.
    - **Author Credential Self-Service & Strong Password Policy**: Authors can update their login email and password anytime in Studio Settings. Enforces strict 5-point password validation: $\ge 8$ characters, uppercase (A-Z), lowercase (a-z), digit (0-9), and special characters (`!@#$%^&*()_=+[]{};:'",.<>/?\|`~-`).
    - **Mandatory Admin Moderation & Approval Workflow**: When an author creates, edits, or publishes an article, it is automatically routed to `pending_approval` status and is completely hidden from the public hub (`/blogs`, `/blogs/{slug}`). Only an administrator can review, approve (`POST /admin/blogs/{id}/approve`), or return the article with constructive feedback (`POST /admin/blogs/{id}/reject`).
    - **Mobile & Multi-Device Ergonomics**: Fully responsive across smartphones (360px+), tablets, and desktop displays. Includes mobile cards view (`block md:hidden`) alongside desktop tables (`hidden md:block`), touch-friendly 1-click **"Approve & Publish"** and **"Request Revision"** moderation buttons, mobile-optimized author account generation modal, and full-height/scrollable rich editor modals with sticky headers and action bars.
    - Strict XSS sanitization engine using `bleach` and regex stripping `<script>`, `<style>`, `<iframe>`, and malicious `onerror`/`onclick` event handlers.
    - Automatic SEO slug generator with duplicate collision resolution (appends counter suffix).
    - Live WebP image conversion and validation pipeline via `/upload`.
- **Comprehensive Search Engine Optimization (SEO), GEO Targeting & AEO (Answer Engine Optimization)**:
  - **Cloudinary CDN Image Sitemap & Acceleration**:
    - Embedded `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` in automated `generate-sitemap.cjs`, linking all 360+ products and blog images to high-speed Cloudinary CDN URLs (`res.cloudinary.com`) for Google Image Search indexing.
    - Added `<link rel="preconnect" href="https://res.cloudinary.com" crossorigin />` and DNS prefetch in `index.html` to eliminate DNS lookup latency.
  - **GEO (Geographic Local SEO for Pune & Maharashtra)**:
    - Injected Pune geographic meta tags in `index.html`: `geo.region="IN-MH"`, `geo.placename="Pune"`, `geo.position="18.5074;73.8077"`, and `ICBM="18.5074, 73.8077"`.
    - Enhanced Organization Schema to `["ElectronicsStore", "Organization", "OnlineBusiness"]` with Kothrud, Pune address (`411038`), exact coordinates, customer phone (`+918830153805`), and regional service boundaries (`Pune`, `Maharashtra`, `India`).
    - Added Pune local same-day delivery specification in `ProductSchema.jsx` for postal codes `411001-411099` (transit: 0-1 days) alongside standard national shipping.
  - **AEO (Answer Engine Optimization for AI Search)**:
    - Added crawler permissions in `public/robots.txt` for next-generation AI answer engines: `GPTBot` (ChatGPT Search), `PerplexityBot` (Perplexity AI), `ClaudeBot` (Anthropic Claude), and `Google-Extended` (Google Gemini / AI Overviews).
    - Injected dynamic `FAQPage` JSON-LD schema on all product pages (`ProductFaqSchema.jsx`) addressing authenticity, Pune same-day delivery, package contents, and GST invoicing for direct AI engine citation.
    - Added Google Sitelinks `SearchAction` schema under `WebSite` definition.
  - **Google Structured Data (`ArticleSchema.jsx`)**: Injects Schema.org `TechArticle` / `BlogPosting` JSON-LD schema with author person attributes, publisher organization metadata, publication dates, and cover images.
  - **Dynamic Automated Sitemap Engine (`generate-sitemap.cjs`)**: Automatically fetches live published articles (`/blogs`), category taxonomies (`/categories`), and inventory items (`/products`), compiling a 1,400+ line canonical `sitemap.xml` with priority weighting, change frequencies, and image locators.
  - **Self-Healing URL Redirects & Broken Link Prevention**: Automatic client-side redirects for legacy `/products` and `/products/:slug` paths to `/shop` with full URL query preservation (`/products?search=esp32` $\to$ `/shop?search=esp32`).
  - **Interactive Multi-Channel Blog Sharing (`BlogShareModal.jsx`)**: Native Web Share API integration, 1-click canonical clipboard copy with instant feedback, direct channels (WhatsApp, Telegram, X/Twitter, LinkedIn, Facebook, Email), and QR code preview across both the main blog cards and detailed article view.
- **Rate Limiting & Caching**: Security features with Slowapi rate limiters and Redis/InMemory backend caching.
- **Intelligent Payment Bounce & Cancellation Diagnostics (PayU Integration)**:
  - **Elimination of Ambiguous "Pending" Flags**: Prevents abandoned, cancelled, or bank-declined checkout transactions from remaining vaguely marked as "Pending" in the system.
  - **Automated Gateway Diagnostics Capture**: Captures PayU parameters (`unmappedstatus`, `error`, `error_Message`) on payment callbacks to record exact bank diagnostic reasons.
  - **Distinct Order Lifecycle States**:
    - `payment_bounced`: Triggered when card issuers or banks decline transactions (card authorization failure, daily spending limits, insufficient balance). Highlighted with amber badges, bank reason chips, and 1-click retry.
    - `payment_cancelled`: Triggered when the user cancels checkout before completion. Highlighted with rose badges and logged into the audit trail.
    - `payment_failed`: Triggered on transaction timeouts or network gateway errors.
    - `payment_received`: Triggered upon verified payment clearance.
  - **Admin Orders Segmentation Tabs**: Direct tab filters for *All Orders*, *✓ Payment Received*, *⏳ Awaiting Payment*, *⚠ Payment Bounced*, *⊘ Payment Cancelled*, *✕ Payment Failed*, *📦 Shipped*, and *🎉 Delivered*.
  - **Synchronized Multi-Screen User Experience**: Reflected identically across Admin Order Details Modal, Customer Order Details ([`OrderDetails.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/pages/OrderDetails.jsx)), User Profile Dashboard ([`OrdersSection.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/components/dashboard/OrdersSection.jsx)), and Checkout Return screen ([`PaymentStatus.jsx`](file:///c:/Users/Hi/Desktop/tronix365-E_commerse/src/pages/PaymentStatus.jsx)).
- **Dual-Fulfillment B2B Tower Order Architecture (Immediate Stock + Factory Indent Query)**:
  - **Visual Distinction for Sourcing Types**:
    - **`⚡ Payment + B2B Query`**: Split hybrid orders where the customer purchases immediate warehouse stock (e.g. 10 units paid and cleared) while requesting the remaining quantity as a factory procurement RFQ indent.
    - **`🏭 Pure B2B Tower Query`**: 100% factory indent RFQ inquiries for backorders and non-inventory electronic components.
  - **Admin Sourcing Dashboard Tabs**: Fast filters for *All Sourcing Orders*, *⚡ Payment + B2B Query (Split)*, and *🏭 Pure B2B Tower Queries*.
  - **Two-Phase Fulfillment Strategy Modal**: Transparent breakdown showing **Phase 1: In-Stock Immediate Payment & Dispatch** and **Phase 2: B2B Factory Indent Sourcing Query**.
- **Automated National-Level Shiprocket Logistics Engine**:
  - **Zero-Touch Automated Order Dispatch**: When a customer places an order with courier shipping (Surface, Express, Standard), the backend automatically registers the order with Shiprocket via background workers without blocking checkout response times.
  - **Smart Local Pickup & Free Delivery Filter**: Orders placed with Store Pickup, Office Pickup, or Free Delivery bypass Shiprocket completely and are reserved for in-house fulfillment.
  - **Two-Way Cancellation Synchronization**: When an administrator cancels an order from the Admin Dashboard, the backend automatically cancels the corresponding order and AWB on the Shiprocket dashboard.
  - **Real-Time Webhook Processing**: Accepts incoming Shiprocket tracking webhooks (`/api/shipping/webhook`) to sync live courier tracking numbers, AWBs, and milestone delivery statuses (*Shipped*, *Out for Delivery*, *Delivered*).
- **Robust Customer Dashboard & Profile Management (`/dashboard`)**:
  - Resilient profile management with order history filtering, address book, factory sourcing tracking, and real-time order status tracking.
  - Hardened component state imports across modular sub-sections (`OrdersSection`, `TowerOrdersSection`, `ProfileSection`, `SavedAddressesSection`).
  - Seamless tax invoice previews and responsive mobile navigation.
- **Interactive Pincode Delivery Estimation & Pune Next Day Delivery**:
  - Real-time India Post PIN lookup with BlueDart Express and Standard Surface calculation.
  - Automated detection and badging for Pune (`411xxx`) with guaranteed next-day delivery messaging.
- **Flexible B2B Quantity Ordering & Float Price Formatting**:
  - Direct typed numeric quantity inputs on Product Details and Cart.
  - Uniform 2-decimal precision (`₹261.00`, `₹36.36`).
- **Self-Healing Cart & Promotion Desynchronization Safeguards**:
  - **Auto-Healing for Stale & Expired Bundles**: Automatically audits cart items on `GET /cart` and guest `/cart/merge`. If an admin deletes a promotional bundle or if a bundle expires/reaches its usage limit while sitting in a user's cart, the backend decouples the bundle relationship without losing the customer's items.
  - **Option A E-Commerce Standard Flow**: Rather than deleting products and abandoning sales, items remain in the customer's cart at standard individual retail pricing.
  - **Real-Time Notification Banner & Toasts**: Alerts customers via amber warning banners (`Cart.jsx`) and headers (`X-Cart-Warnings`) explaining that the expired promotion has been adjusted to regular pricing.
  - **Zero-Crash Pre-Payment Gatekeeper**: Strict pre-flight checks in `POST /payment/initiate` eliminate database foreign key crashes (`500 Internal Server Error`) and block expired promotional price leaks before transaction token generation. Automatic cart resynchronization in `Checkout.jsx` allows immediate re-attempt with active valid totals.

---

## 🌐 Production Hosting & Deployment

For a full step-by-step tutorial on hosting this project in production:

- **Database**: Serverless PostgreSQL via **NeonDB** (Configured via private `DATABASE_URL`)
- **Backend API**: Python FastAPI via **Render** (Configured via private `VITE_API_URL`)
- **Frontend Client**: React Single Page Application via **Hostinger** (`https://www.tronix365.in`)
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

   # PayU payment credentials (for test/production environments)
   PAYU_ENV=TEST
   PAYU_KEY=your_payu_key_here
   PAYU_SALT=your_payu_salt_here

   # Shiprocket Logistics Integration
   SHIPROCKET_API_EMAIL=your_shiprocket_email@example.com
   SHIPROCKET_API_PASSWORD=your_shiprocket_password
   SHIPROCKET_PICKUP_PINCODE=411001
   SHIPROCKET_PICKUP_LOCATION=Primary
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

## 📦 Bulk Product CSV & Excel (.xlsx) Import & Image Management

The platform includes an automated bulk import engine (`import_products.py`) to import or update hundreds of products directly into your database (SQLite locally or NeonDB in production) directly from **Excel (`.xlsx`)** or **CSV (`.csv`)** files.

### 1. File Locations & Structure
* **Data File**: Place your Excel file at `backend/products.xlsx` or CSV file at `backend/products.csv`.
* **Images Folder**: Place component product images inside: `backend/components/`
  *(Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`)*
  *(Or specify any custom folder using `--images-dir <folder_path>`)*

### 2. Sheet / CSV Columns
| Column Header | Required? | Description & Format |
| :--- | :--- | :--- |
| `skv` | **YES** | Unique SKU code (e.g. `ARD-001`). Duplicate SKUs auto-append unique suffixes. |
| `title` | **YES** | Product Name (e.g. `Arduino Uno R3`). |
| `category` | **YES** | Category name for storefront filters (e.g. `Development Boards`). |
| `sale_price` | **YES** | Selling Price customer pays (e.g. `450`). |
| `mrp` | No | Original Price displayed strikethrough (e.g. `650`). |
| `stock` | No | Available stock count (default: `100`). |
| `image` | No | Filename in `components/` (or custom images folder) or direct HTTP/HTTPS web link. |
| `description` | No | Detail description text. |
| `features` | No | Bullet list separated by `|` (e.g. `5V Logic|USB-C|ATmega328P`). |
| `specs` | No | Technical key-values separated by `|` & `:` (e.g. `Voltage:5V|Memory:2KB`). |

### 3. Smart Resiliency Features
* **Direct Excel & CSV Support**: Reads native `.xlsx` files (via `openpyxl`) or CSV files (`UTF-8`, `UTF-8-SIG`, `CP1252`, `Latin-1`).
* **Auto-File Detection**: Automatically looks for `products.xlsx` or `products.csv` in `backend/` if no file path is specified.
* **Smart Image Matcher**: Case-insensitive and title-fallback image matching across `components/`, `images/`, or any folder specified via `--images-dir`.
* **Automatic `uploads/` Sync**: Copies matched images from your component folder into `backend/uploads/` and links `/uploads/filename.jpg` in the database.

### 4. Import Commands
```powershell
cd backend
myenv\Scripts\activate

# Import / Update directly from Excel .xlsx
python import_products.py products.xlsx

# Or import from CSV
python import_products.py products.csv

# Auto-detects products.xlsx or products.csv automatically:
python import_products.py

# Import using custom images folder
python import_products.py products.xlsx --images-dir components

# Wipe DB and fresh re-import (IDs reset to 1)
python import_products.py products.xlsx --reset
```

### 5. Syncing Images to Cloudinary CDN (Hostinger & Render)
To serve all product images globally via Cloudinary CDN without hosting local files on Hostinger or Render:
```powershell
cd backend
myenv\Scripts\activate

# Upload all local images to Cloudinary and update NeonDB with CDN URLs
python sync_to_cloudinary.py
```
This guarantees that all images render instantly on your live Hostinger website (`https://tronix365.in`) without 404 broken image errors.

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
  - `PUT /cart/{item_id}` - Update quantity for specific cart item (sets $\le 0$ removes item from database)
  - `DELETE /cart/{item_id}` - Remove individual item from cart and database
  - `DELETE /cart` - Clear all cart items in database for authenticated user (instantly cleans abandoned cart queue)
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
  - `POST /admin/abandoned-carts/send-bulk` - Send recovery reminders in bulk to a selected list of user IDs
  - `POST /admin/abandoned-carts/send-all` - Bulk send recovery reminders to all pending abandoned carts that have not yet been notified
  - `DELETE /admin/abandoned-carts/{target_user_id}` - Permanently delete unpurchased cart items for a specific user from the database
  - `POST /admin/abandoned-carts/delete-bulk` - Permanently delete unpurchased cart items in bulk for selected user IDs
- **Engineering Blog & Author Studio (`/blogs`, `/blog-studio`)**:
  - `POST /blogs/author/login` - Author & engineering team authentication via system-generated credentials (rate-limited, returns JWT access/refresh token)
  - `GET /blogs` - Public paginated feed with category and text query filters
  - `GET /blogs/{slug}` - Public post reader with auto-incrementing view count
  - `GET /blogs/featured` - Hero carousel & spotlight posts
  - `GET /blogs/categories/summary` - Aggregated category post count breakdown
  - `GET /admin/blogs` - Author/Admin listing of all posts (drafts, pending approval, published) with stats
  - `POST /admin/blogs` - Create new hardware guide or technical article (XSS sanitized, auto slug generation; authors force `pending_approval`)
  - `PUT /admin/blogs/{id}` - Update existing post (authors require re-approval)
  - `POST /admin/blogs/{id}/toggle-publish` - Toggle draft vs publish (for authors, routes to `pending_approval`)
  - `POST /admin/blogs/{id}/approve` - Admin-only approval endpoint to publish live
  - `POST /admin/blogs/{id}/reject` - Admin-only rejection endpoint with author revision feedback
  - `DELETE /admin/blogs/{id}` - Delete post record
  - `POST /blogs/author/login` - Author authentication endpoint
  - `PUT /blogs/author/credentials` - In-studio author credential update with mandatory 5-point strong password validation
  - `GET /admin/authors` - Admin-only listing of all registered blog authors
  - `POST /admin/authors/generate` - Admin-only endpoint to generate new author accounts with secure random 16-character passwords
  - `DELETE /admin/authors/{author_id}` - Admin-only endpoint to permanently revoke and delete blog author accounts with confirmation modal
  - **Standalone Author Credential Generator Script**:
    ```bash
    cd backend
    python scripts/generate_blog_author.py --name "Robotics Team Lead" --email "robotics@tronix365.in"
    ```
    *Generates cryptographically secure 16-character high-entropy passwords, registers the author in `UserDB` with role `blog_author`, and displays ready-to-use login credentials.*
  - **Admin Password Verification & Reset Script**:
    ```bash
    cd backend
    python scripts/reset_admin_password.py --email "admin@tronix365.in" --password "YourAdminPassword"
    ```
    *Verifies and securely resets the primary system admin account password in the PostgreSQL database if it ever changes or drifts.*

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

- **Lifetime Media Storage & Cloudinary CDN Integration**:
  - **Dual-Tier Self-Healing Persistence**: Uploaded images and videos are written to disk and backed up permanently as binary `BYTEA` data in the PostgreSQL database (`UploadedMediaDB`). If Render container restarts/redeploys wipe the ephemeral filesystem, `/uploads/{filename}` automatically queries PostgreSQL, restores the file to disk, and serves it with 200 OK.
  - **Cloudinary CDN Ready**: Pre-configured automatic switchover. Add `CLOUDINARY_URL` (e.g. `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`) to Render Environment Variables to instantly route all uploads to Cloudinary's global media CDN with zero disk dependencies.

---

## 🌐 Search Engine Optimization (SEO) & Google Search Console Architecture

Tronix365 features a dual-layer SEO architecture engineered specifically for single-page application (SPA) indexing across search engines like Google:

### 1. Server-Side Crawler Interception (`public/index.php` & Apache `.htaccess`)
* **Strict HTTPS & www Normalization**: Enforces 301 Permanent Redirects for all traffic from HTTP or non-www to `https://www.tronix365.in/e-commerse/`.
* **301 Canonical Slug Redirects**: Automatically intercepts numeric product ID requests (`/product/123`) or unnormalized slugs and permanently redirects (HTTP 301) to the canonical slug (`/product/canonical-slug`), eliminating GSC duplicate canonical warnings.
* **True HTTP 404 Status Enforcement**: If a non-existent product or invalid URL is accessed, `index.php` issues a genuine `404 Not Found` header with `noindex, follow` robots meta tag, preventing "Soft 404" errors in Search Console.
* **Dynamic Dynamic Category & Product Schema**: Injects Product, BreadcrumbList, and FAQPage JSON-LD schemas directly into the initial HTML response before rendering.

### 2. Client-Side Parity (`SEO.jsx` & React Router)
* **Auto-Canonical Resolution**: `<SEO />` automatically derives and normalizes canonical URLs based on the active route, preventing subpages (`/about`, `/contact`, `/categories`, etc.) from defaulting to the homepage.
* **Shop vs Category Differentiation**: Distinguishes `/shop` (`.../shop`) from category listings (`.../category/:category`), preventing conflicting canonical definitions.

### 3. Automated Sitemap Engine (`scripts/generate-sitemap.cjs`)
* Automatically runs during `npm run build` to query the live API (or fallback `products_metadata.json`) and writes an up-to-date, valid XML sitemap directly to `public/sitemap.xml` and `dist/sitemap.xml`.
* Synchronized homepage trailing slash (`https://www.tronix365.in/e-commerse/`) ensures 100% parity with server-side canonical declarations.

---

## 🔮 Future Scope

- **Live Payments**: Integrate production payment APIs (Razorpay / Stripe).
- **Admin Dashboard Visuals**: Add interactive line charts for tracking daily sales, profit margins, and peak shopping hours.
- **Mobile Integration**: Package components using React Native.

# 📦 Product CSV & Excel (.xlsx) Import & Image Management Guide

This guide details how to prepare your product data Excel (`.xlsx`) or CSV files, place product images, execute the automated import script (`import_products.py`), and synchronize uploaded images for live production hosting (Render + NeonDB).

---

## 1. 📁 Image Handling & Folder Placement

You can supply product images via local files or direct web URLs.

### Option A: Local Images (Recommended)
1. **Place Raw Images**: Place all your raw product/component images inside:
   ```text
   backend/components/
   ```
   *(Or in any new folder you prefer, e.g. `backend/components/` or pass `--images-dir <folder>`)*
   * *Supported extensions*: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
   * *Example filenames*: `Arduino_Uno R3.jpg`, `SG90 Micro Servo Motor.jpg`, `16x2 LCD Display.jpg`

2. **Smart Automatic Image Matching**:
   The `import_products.py` script automatically performs:
   * **Case-insensitive matching**: Matches `arduino.jpg` to `Arduino_Uno R3.jpg`.
   * **Title fallback matching**: If the `image` column in your sheet is blank, it automatically searches for image files matching the product title.
   * **Whitespace trimming**: Handles spaces before file extensions (e.g. `motor .jpg`).

3. **Automatic Copy to `uploads/`**:
   Matched images are automatically copied into:
   ```text
   backend/uploads/
   ```
   And recorded in the database with relative URL paths like `/uploads/Arduino_Uno R3.jpg`.

### Option B: Direct Web Image URLs
In your Excel/CSV sheet, paste full HTTP/HTTPS image links:
```csv
skv,title,sale_price,image
ARD-001,Arduino Uno R3,450,https://images.unsplash.com/photo-1553406830-ef2513450d76
```

---

## 2. 📊 Excel (.xlsx) or CSV File Format & Structure

Place your new file directly inside:
```text
backend/products.xlsx
```
*(or `backend/products.csv`)*


### Column Specifications

| Column Name | Required? | Description | Example |
| :--- | :--- | :--- | :--- |
| `skv` | **Yes** | Unique Product SKU / Seller ID. Used for updates and unique indexing. | `ARD-001` |
| `title` | **Yes** | Product Display Name. | `Arduino Uno R3` |
| `category` | **Yes** | Category name for filtering. | `Development Boards` |
| `sale_price` | **Yes** | Selling price customer pays. | `450` |
| `mrp` | No | Maximum Retail Price (shown strikethrough). | `650` |
| `stock` | No | Available inventory count (default: `100`). | `50` |
| `image` | **Yes** | Image filename in `components/` or web URL. | `Arduino_Uno R3.jpg` |
| `description` | No | Full product description text. | `Powerful microcontroller board...` |
| `features` | No | Bullet list separated by `\|`. | `5V Logic\|USB-C Interface\|ATmega328P` |
| `specs` | No | Key-value pairs separated by `\|` and `:`. | `Voltage:5V\|Clock Speed:16MHz` |

---

## 3. ⚙️ Encoding & SKU Resiliency

The import script is built with production-grade resiliency:
* **Multi-Encoding Auto-Detection**: Supports files saved in `UTF-8`, `UTF-8-SIG`, `CP1252` (Windows Excel), and `Latin-1`. Special symbols or non-breaking spaces are safely decoded using `errors="replace"`.
* **Duplicate SKU Resolution**: If multiple CSV rows contain duplicate SKU codes, the script automatically generates a unique suffix (`SKU-A1B2`) to prevent PostgreSQL `UniqueViolation` database crashes.
* **Case-Insensitive Product Lookup**: Existing products are matched by `skv` or `title` case-insensitively to prevent accidental duplicate entries.

---

## 4. 🚀 Running the Import Script

### Step 1: Navigate to backend folder
```powershell
cd backend
```

### Step 2: Activate virtual environment
```powershell
# Windows
myenv\Scripts\activate

# Linux / macOS
source myenv/bin/activate
```

### Step 3: Run the import script

* **Direct Import / Update from Excel (.xlsx)**:
  ```powershell
  python import_products.py products.xlsx
  ```

* **Import / Update from CSV**:
  ```powershell
  python import_products.py products.csv
  ```

* **Auto-Detect File** *(Runs whatever exists: products.xlsx or products.csv)*:
  ```powershell
  python import_products.py
  ```

* **With Custom Images Folder**:
  ```powershell
  python import_products.py products.xlsx --images-dir components
  ```

* **Fresh Reset & Re-Import** *(Wipes existing products & resets database IDs to 1)*:
  ```powershell
  python import_products.py products.xlsx --reset
  ```

---

## 🌐 5. Deploying Images to Cloudinary CDN (Recommended)

When using Cloudinary for global, high-speed image delivery across Hostinger & Render:

```powershell
cd backend
myenv\Scripts\activate

# Upload all local images to Cloudinary and update NeonDB with CDN URLs
python sync_to_cloudinary.py
```

This immediately uploads any `/uploads/...` images to Cloudinary folder `tronix365_products` and replaces their paths in NeonDB with high-speed CDN URLs (`https://res.cloudinary.com/...`). Your live site on Hostinger will instantly display all images without requiring any file uploads to Hostinger.


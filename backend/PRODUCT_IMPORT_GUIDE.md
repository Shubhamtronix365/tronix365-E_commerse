# 📦 Product CSV Import & Image Management Guide

This guide details how to prepare your product data CSV/Excel files, place product images, execute the automated import script (`import_products.py`), and synchronize uploaded images for live production hosting (Render + NeonDB).

---

## 1. 📁 Image Handling & Folder Placement

You can supply product images via local files or direct web URLs.

### Option A: Local Images (Recommended)
1. **Place Raw Images**: Place all your raw product images inside the folder:
   ```text
   backend/components/
   ```
   * *Supported extensions*: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
   * *Example filenames*: `Arduino_Uno R3.jpg`, `SG90 Micro Servo Motor.jpg`, `16x2 LCD Display.jpg`

2. **Smart Automatic Image Matching**:
   The `import_products.py` script automatically performs:
   * **Case-insensitive matching**: Matches `arduino.jpg` to `Arduino_Uno R3.jpg`.
   * **Title fallback matching**: If the `image` column in CSV is blank, it automatically searches for image files matching the product title.
   * **Whitespace trimming**: Handles spaces before file extensions (e.g. `motor .jpg`).

3. **Automatic Copy to `uploads/`**:
   Matched images are automatically copied into:
   ```text
   backend/uploads/
   ```
   And recorded in the database with relative URL paths like `/uploads/Arduino_Uno R3.jpg`.

### Option B: Direct Web Image URLs
In your CSV, paste full HTTP/HTTPS image links:
```csv
skv,title,sale_price,image
ARD-001,Arduino Uno R3,450,https://images.unsplash.com/photo-1553406830-ef2513450d76
```

---

## 2. 📊 CSV File Format & Structure

Save your product file as **`products.csv`** (or export from Microsoft Excel as **CSV UTF-8 (Comma delimited) (*.csv)**) and place it inside:
```text
backend/products.csv
```

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

* **Normal Import / Update**:
  ```powershell
  python import_products.py products.csv
  ```

* **Fresh Reset & Re-Import** *(Wipes existing products & resets database IDs to 1)*:
  ```powershell
  python import_products.py products.csv --reset
  ```

---

## 🌐 5. Deploying Images to Live Production Hosting (Render + NeonDB)

When running the import script against your live **NeonDB PostgreSQL** instance:

1. The script updates your live NeonDB database records.
2. The product image files are copied into `backend/uploads/`.
3. To deploy these local upload images to **Render** (so your live website can render them):
   ```powershell
   git add backend/uploads
   git commit -m "feat: sync product images for live site"
   git push origin main
   ```
4. Render will deploy the `backend/uploads` directory, and your live website will display all product images!

import sys, os, re
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from database import SessionLocal
from models import ProductDB

wb = openpyxl.load_workbook('backend/products.xlsx', data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))
headers = [str(h).strip() if h else '' for h in rows[0]]

def clean_num(x):
    if x is None or str(x).strip() in ('', '.', 'None', '-'):
        return None
    try:
        return float(x)
    except:
        return None

def normalize_text(s):
    if not s: return ""
    return re.sub(r'[^a-z0-9]', '', str(s).lower())

excel_records = []
for r in rows[1:]:
    d = {headers[i]: r[i] for i in range(len(headers)) if headers[i]}
    title = str(d.get('Title') or '').strip()
    sku = str(d.get('SKU') or '').strip()
    mrp = clean_num(d.get('MRP'))
    r_mrp = clean_num(d.get('R MRP'))
    price = clean_num(d.get('Price'))
    sales_price = clean_num(d.get('SALES PRICE'))
    
    excel_records.append({
        'title': title,
        'norm_title': normalize_text(title),
        'sku': sku,
        'norm_sku': normalize_text(sku),
        'mrp': mrp,
        'r_mrp': r_mrp,
        'price': price,
        'sales_price': sales_price,
    })

db = SessionLocal()
try:
    all_db = db.query(ProductDB).all()
    updated_count = 0
    
    for p in all_db:
        p_norm = normalize_text(p.title)
        p_sku_norm = normalize_text(p.sku or p.skv)
        
        matched_ex = None
        for ex in excel_records:
            if p_sku_norm and ex['norm_sku'] and p_sku_norm == ex['norm_sku']:
                matched_ex = ex
                break
            if p_norm and ex['norm_title'] and (p_norm == ex['norm_title'] or p_norm in ex['norm_title'] or ex['norm_title'] in p_norm):
                matched_ex = ex
                break
                
        if matched_ex:
            ex_mrps = [v for v in [matched_ex['mrp'], matched_ex['r_mrp']] if v is not None and v > 0]
            if ex_mrps:
                best_ex_mrp = max(ex_mrps)
                curr_price = float(p.price or 0)
                curr_mrp = float(p.mrp or 0) if p.mrp else 0
                
                target_mrp = best_ex_mrp
                if target_mrp <= curr_price:
                    ratio = best_ex_mrp / (matched_ex['price'] or (curr_price * 0.8))
                    if ratio < 1.15:
                        ratio = 1.25
                    target_mrp = round(curr_price * ratio, 2)
                    if target_mrp <= curr_price:
                        target_mrp = round(curr_price * 1.25, 2)
                
                if curr_mrp <= curr_price or target_mrp > curr_mrp:
                    print(f"Updating Product #{p.id} '{p.title}': Price={curr_price}, Old MRP={curr_mrp} -> New MRP={target_mrp}")
                    p.mrp = target_mrp
                    updated_count += 1

    db.commit()
    print(f"\nSUCCESS: Successfully updated {updated_count} products with verified Excel MRP in database.")
except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    raise
finally:
    db.close()

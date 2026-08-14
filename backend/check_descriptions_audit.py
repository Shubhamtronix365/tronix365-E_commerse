import os
import re
import html
import sys
import json
import time
from difflib import SequenceMatcher
from dotenv import load_dotenv
from database import SessionLocal
from models import ProductDB

# Set standard output to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_word_count(text: str) -> int:
    cleaned = clean_text(text)
    if not cleaned:
        return 0
    return len(cleaned.split())

def check_product_descriptions():
    start_time = time.time()
    db = SessionLocal()
    try:
        print("Fetching products from database...")
        products = db.query(ProductDB.id, ProductDB.title, ProductDB.description).all()
        print(f"Fetched {len(products)} products in {round(time.time() - start_time, 2)}s.")

        short_descriptions = []
        prod_data = []

        for p in products:
            desc = p.description or ""
            cleaned_desc = clean_text(desc)
            words = len(cleaned_desc.split()) if cleaned_desc else 0
            words_set = set(cleaned_desc.lower().split()) if cleaned_desc else set()
            
            p_obj = {
                "id": p.id,
                "title": p.title or f"Product #{p.id}",
                "cleaned_desc": cleaned_desc,
                "word_count": words,
                "word_set": words_set
            }
            prod_data.append(p_obj)

            if words < 50:
                short_descriptions.append({
                    "id": p.id,
                    "title": p.title or f"Product #{p.id}",
                    "word_count": words,
                    "snippet": cleaned_desc[:120] + ("..." if len(cleaned_desc) > 120 else "")
                })

        # Pairwise comparison with pre-filtering
        similarity_matches = []
        n = len(prod_data)
        print(f"Analyzing pairwise similarities across {n} products...")

        for i in range(n):
            p1 = prod_data[i]
            c1 = p1["cleaned_desc"]
            w1 = p1["word_count"]
            s1 = p1["word_set"]

            if w1 < 5:
                continue

            for j in range(i + 1, n):
                p2 = prod_data[j]
                c2 = p2["cleaned_desc"]
                w2 = p2["word_count"]
                s2 = p2["word_set"]

                if w2 < 5:
                    continue

                min_w, max_w = min(w1, w2), max(w1, w2)
                if min_w / max_w < 0.70:
                    continue

                intersection = len(s1 & s2)
                union = len(s1 | s2)
                if union == 0 or (intersection / union) < 0.65:
                    continue

                ratio = SequenceMatcher(None, c1, c2).ratio()
                if ratio > 0.80:
                    similarity_matches.append({
                        "prod1_id": p1["id"],
                        "prod1_title": p1["title"],
                        "prod2_id": p2["id"],
                        "prod2_title": p2["title"],
                        "similarity": round(ratio * 100, 2)
                    })

        elapsed = round(time.time() - start_time, 2)
        
        # Save JSON output
        results_payload = {
            "total_products": len(products),
            "short_description_count": len(short_descriptions),
            "high_similarity_match_count": len(similarity_matches),
            "time_taken_seconds": elapsed,
            "short_descriptions": short_descriptions,
            "similarity_matches": similarity_matches
        }

        with open("description_audit_results.json", "w", encoding="utf-8") as f:
            json.dump(results_payload, f, indent=2, ensure_ascii=False)

        print("\n" + "="*80)
        print("AUDIT RESULTS SUMMARY")
        print("="*80)
        print(f"Total Products Checked: {len(products)}")
        print(f"Products with < 50 Words: {len(short_descriptions)}")
        print(f"Products with > 80% Description Similarity: {len(similarity_matches)}")
        print(f"Time Taken: {elapsed} seconds")
        print(f"Full results saved to description_audit_results.json")
        print("="*80 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    check_product_descriptions()

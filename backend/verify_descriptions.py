import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Ensure console output handles UTF-8 characters nicely on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Load .env file relative to this script
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("Error: DATABASE_URL not found in .env")
    sys.exit(1)

engine = create_engine(database_url)

with engine.connect() as connection:
    try:
        # Get total count of products
        total_count = connection.execute(text("SELECT count(*) FROM products")).scalar()
        
        # Get count of products with empty/null descriptions
        empty_count = connection.execute(text(
            "SELECT count(*) FROM products WHERE description IS NULL OR description = ''"
        )).scalar()
        
        # Get count of products with long detailed descriptions (more than 100 characters)
        detailed_count = connection.execute(text(
            "SELECT count(*) FROM products WHERE length(description) > 100"
        )).scalar()
        
        print("=" * 60)
        print("DATABASE DESCRIPTION STATUS REPORT")
        print("=" * 60)
        print(f"Total Products in DB:       {total_count}")
        print(f"Empty/Null Descriptions:   {empty_count}")
        print(f"Detailed Descriptions (>100 chars): {detailed_count}")
        print(f"Update Progress:           {((total_count - empty_count) / total_count) * 100:.2f}%")
        print("-" * 60)
        
        # Sample a few products to preview their descriptions
        if total_count > 0:
            result = connection.execute(
                text("SELECT id, title, length(description), description FROM products ORDER BY id DESC LIMIT 5")
            )
            print("Sample Product Descriptions:")
            for row in result:
                prod_id, title, desc_len, desc = row
                desc_snippet = desc[:120] + "..." if desc and len(desc) > 120 else desc
                print(f"\nID: {prod_id} | Title: {title}")
                print(f"Length: {desc_len} characters")
                print(f"Description: {desc_snippet}")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error querying product descriptions: {e}")

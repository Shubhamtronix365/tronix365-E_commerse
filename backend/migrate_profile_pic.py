import sys
import os
import sqlite3
import psycopg2
from urllib.parse import urlparse

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# Get DB URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is required to run migrations.")
    sys.exit(1)

print(f"Applying migration to configured database...")

try:
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE users ADD COLUMN profile_picture VARCHAR;")
        conn.commit()
        conn.close()
        print("SQLite Migration Successful: Added profile_picture to users.")
    else:
        # Postgres
        result = urlparse(DATABASE_URL)
        conn = psycopg2.connect(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
        )
        conn.autocommit = True
        cursor = conn.cursor()
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN profile_picture VARCHAR;")
            print("PostgreSQL Migration Successful: Added profile_picture to users.")
        except psycopg2.errors.DuplicateColumn:
            print("Column already exists. Skipping.")
        conn.close()
except Exception as e:
    print(f"Migration Failed: {e}")

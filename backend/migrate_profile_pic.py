import sys
import os
import sqlite3
import psycopg2
from urllib.parse import urlparse

# Get DB URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_4NqP1yOdlbkw@ep-jolly-hat-a52iknke-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
)

print(f"Applying migration to: {DATABASE_URL}")

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

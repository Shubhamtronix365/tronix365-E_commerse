import os
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

load_dotenv()
url = os.getenv("DATABASE_URL")
print(f"Connecting to: {url}")
try:
    if url.startswith("postgres"):
        result = urlparse(url)
        conn = psycopg2.connect(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port,
        )
        conn.autocommit = True
        cursor = conn.cursor()
        print("Connected! Executing ALTER TABLE...")
        cursor.execute("ALTER TABLE users ADD COLUMN profile_picture VARCHAR;")
        print("Success!")
        conn.close()
except psycopg2.errors.DuplicateColumn:
    print("Column already exists! Success.")
except Exception as e:
    print(f"Error: {e}")

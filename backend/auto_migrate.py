import os
from sqlalchemy import create_engine, inspect, text
from database import engine, Base
import models  # Import to register all models in Base.metadata

def auto_migrate():
    print("Starting auto-migration of database...")
    inspector = inspect(engine)
    
    # Map SQLAlchemy types to SQL column types for ALTER TABLE statements
    def get_sql_type_string(column):
        type_name = str(column.type).upper()
        if "VARCHAR" in type_name or "STRING" in type_name:
            return "VARCHAR"
        elif "INTEGER" in type_name or "INT" in type_name:
            return "INTEGER"
        elif "FLOAT" in type_name or "DOUBLE" in type_name:
            return "DOUBLE PRECISION"
        elif "BOOLEAN" in type_name or "BOOL" in type_name:
            return "BOOLEAN"
        elif "DATETIME" in type_name or "TIMESTAMP" in type_name:
            if getattr(column.type, "timezone", False):
                return "TIMESTAMP WITH TIME ZONE"
            return "TIMESTAMP"
        elif "JSON" in type_name:
            if engine.dialect.name == "sqlite":
                return "JSON"
            return "JSONB"
        return type_name

    # Check and create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Checked/created tables using metadata.")

    # Check for missing columns and add them
    with engine.begin() as conn:
        for table_name, table in Base.metadata.tables.items():
            print(f"\nChecking table '{table_name}'...")
            
            # Get existing columns in DB
            try:
                db_columns = {col["name"]: col for col in inspector.get_columns(table_name)}
            except Exception as e:
                print(f"Could not read columns for table {table_name}: {e}")
                continue
            
            for col_name, column in table.columns.items():
                if col_name not in db_columns:
                    sql_type = get_sql_type_string(column)
                    nullable = "NULL" if column.nullable else "NOT NULL"
                    default_clause = ""
                    if column.server_default is not None:
                        # Simple server default check
                        default_clause = f" DEFAULT {column.server_default.arg}"
                    
                    alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type}"
                    print(f"Column '{col_name}' is missing in DB. Running: {alter_query}")
                    try:
                        conn.execute(text(alter_query))
                        print(f"Successfully added '{col_name}' to '{table_name}'.")
                    except Exception as e:
                        print(f"Error adding column '{col_name}' to '{table_name}': {e}")
                else:
                    print(f"Column '{col_name}' exists.")

    print("\nAuto-migration complete!")

if __name__ == "__main__":
    auto_migrate()

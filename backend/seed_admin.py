from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
DB_PASSWORD = os.getenv("DB_PASSWORD")
DATABASE_URL = f"mysql+pymysql://root:{DB_PASSWORD}@localhost:3306/SimplyStocked"

engine = create_engine(DATABASE_URL)

with open("create_admin_user.sql", "r") as f:
    sql_text = f.read()

# We can execute it by replacing the first query and then the others, or just using raw connection.
with engine.connect() as conn:
    conn.execute(text("DELETE FROM Users WHERE Username='admin@simplystocked.com';"))
    
    # Split by semicolon to run statements sequentially
    for statement in sql_text.split(';'):
        stmt = statement.strip()
        if stmt:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print("Ignored error:", e)
    conn.commit()

print("Admin user seeded successfully via Python.")

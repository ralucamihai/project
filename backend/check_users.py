import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from login.models import User

load_dotenv()
DB_URL = os.environ.get("DB_URL", "sqlite:///pmb_dashboard.db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    users = db.query(User).all()
    print("\n=== LISTA UTILIZATORI IN BAZA DE DATE ===")
    if not users:
        print("Nu exista niciun utilizator in baza de date!")
    for u in users:
        print(f"Username: '{u.username}' | Email: '{u.email}' | Rol: '{u.role}' | Status: '{u.status}'")
    print("=========================================\n")
except Exception as e:
    print("Eroare:", e)
finally:
    db.close()
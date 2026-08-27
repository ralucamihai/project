import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from customer_support.models import Ticket

# Încărcăm baza de date exactă pe care o folosește și aplicația ta (din fișierul .env)
load_dotenv()
DB_URL = os.environ.get("DB_URL")

# Dacă nu găsește URL-ul în .env, presupunem că e baza de date SQLite locală
if not DB_URL:
    DB_URL = "sqlite:///pmb_dashboard.db"

print(f"Încerc conectarea la: {DB_URL}")
engine = create_engine(DB_URL)

try:
    Ticket.__table__.drop(engine, checkfirst=True)
    print("✅ Tabela cs_tickets a fost stearsa cu succes!")
    print("👉 Acum poti porni serverul normal (uvicorn app:app --reload)")
except Exception as e:
    print("❌ A aparut o eroare:", e)
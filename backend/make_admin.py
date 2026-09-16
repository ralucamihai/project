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

# === MODIFICĂ AICI ===
USERNAME_NOU = "admin"

try:
    user = db.query(User).filter(User.username == USERNAME_NOU).first()

    if user:
        user.status = "activ"  # AICI ERA PROBLEMA - Sistemul tău folosește 'activ'
        user.role = "Admin"
        
        db.commit()
        print(f"✅ Succes! Contul '{USERNAME_NOU}' este acum 'activ' și are rolul 'Admin'!")
    else:
        print(f"❌ Eroare: Nu am găsit contul '{USERNAME_NOU}'.")
        
except Exception as e:
    print("❌ Eroare:", e)
finally:
    db.close()
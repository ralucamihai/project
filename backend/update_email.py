import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Importăm modelul de User din baza ta de date
from login.models import User

load_dotenv()
DB_URL = os.environ.get("DB_URL", "sqlite:///pmb_dashboard.db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

USERNAME_MODIFICAT = "ttest"
NOUL_EMAIL = "PMB_SCA@steinel.ro"

try:
    # Căutăm utilizatorul în baza de date
    user = db.query(User).filter(User.username == USERNAME_MODIFICAT).first()

    if user:
        # Îi înlocuim vechiul email cu cel nou
        user.email = NOUL_EMAIL
        
        db.commit()
        print(f"✅ Succes! Emailul utilizatorului '{USERNAME_MODIFICAT}' a fost schimbat cu succes în '{NOUL_EMAIL}'.")
    else:
        print(f"❌ Eroare: Nu am găsit contul '{USERNAME_MODIFICAT}'.")
        
except Exception as e:
    print("❌ Eroare:", e)
finally:
    db.close()
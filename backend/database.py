import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
 



load_dotenv()

# Preia URL-ul din .env. Daca nu exista, pune un default
DB_URL = os.getenv("DB_URL", "postgresql://postgres:postgres@127.0.0.1:5432/pmb_dashboard")

# Pentru Postgres cu psycopg2, URL-ul optim pentru SQLAlchemy este postgresql+psycopg2://...
if DB_URL.startswith("postgresql://"):
    DB_URL = DB_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Funcție utilitară pentru a injecta sesiunea DB în rutele FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
from nomenclature.models import UtilizatorPMB, GrupMuncaEntity, Piesa, ListaPiese, Sectie
import customer_support.models
import nomenclature.models 

Base.metadata.create_all(bind=engine)
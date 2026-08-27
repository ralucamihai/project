"""
Recreeaza tabela cs_tickets cu noua structura, pe baza de date SQLite reala
folosita de aplicatie (DB_URL din .env, ex: sqlite:///./pmb_dashboard_database).

Foloseste DOAR modulul sqlite3 din biblioteca standard Python — nu ai nevoie
de psycopg2 sau alta librarie suplimentara.

Cum se ruleaza:
    cd backend        (folderul unde e .env si venv-ul)
    python ../database/run_migration.py

Comportament:
    - Daca cs_tickets NU exista sau e goala -> o (re)creeaza direct cu noua structura.
    - Daca cs_tickets exista si are randuri -> NU sterge nimic automat, iti spune
      cate randuri are si se opreste, ca sa decizi tu ce vrei sa faci cu ele.
"""

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv, find_dotenv

# find_dotenv(usecwd=True) cauta .env pornind din directorul curent de lucru
# (backend/, de unde rulezi comanda), nu din locatia acestui script (database/).
load_dotenv(find_dotenv(usecwd=True))
DB_URL = os.getenv("DB_URL")

if not DB_URL:
    raise RuntimeError(
        "Nu am gasit DB_URL in .env. Ruleaza scriptul din folderul 'backend' "
        "(acolo unde e fisierul .env) cu comanda: python ../database/run_migration.py"
    )

if not DB_URL.startswith("sqlite"):
    raise RuntimeError(
        f"DB_URL nu pare sa fie SQLite ({DB_URL!r}). Acest script e scris pentru "
        "SQLite. Daca ai trecut intre timp pe Postgres, spune-i lui Claude sa "
        "adapteze scriptul."
    )

# "sqlite:///./pmb_dashboard_database" -> "./pmb_dashboard_database"
raw_path = DB_URL.split("sqlite:///", 1)[1] if "sqlite:///" in DB_URL else DB_URL.replace("sqlite://", "")
db_path = Path(raw_path)
if not db_path.is_absolute():
    db_path = Path.cwd() / db_path
db_path = db_path.resolve()

print(f"Baza de date SQLite: {db_path}")
if not db_path.exists():
    raise RuntimeError(f"Nu gasesc fisierul de baza de date la {db_path}. Verifica DB_URL din .env.")

conn = sqlite3.connect(str(db_path))
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cs_tickets'")
exists = cur.fetchone() is not None

row_count = 0
if exists:
    cur.execute("SELECT COUNT(*) FROM cs_tickets")
    row_count = cur.fetchone()[0]

if exists and row_count > 0:
    print(f"⚠️  Tabela cs_tickets exista deja si are {row_count} rand(uri).")
    print("Nu sterg nimic automat, ca sa nu pierzi date fara sa vrei.")
    print("Daca poti pierde aceste date, ruleaza manual in scriptul asta sau")
    print("intr-un client SQLite: DROP TABLE cs_tickets; apoi porneste din nou scriptul.")
    conn.close()
    raise SystemExit(1)

print("Recreez tabela cs_tickets cu structura noua...")
cur.execute("DROP TABLE IF EXISTS cs_tickets")
cur.execute("""
    CREATE TABLE cs_tickets (
        id INTEGER PRIMARY KEY,
        initiator VARCHAR NOT NULL,
        echipa VARCHAR,
        tip_interventie VARCHAR,
        descriere_simptom VARCHAR,
        sectie VARCHAR,
        linie VARCHAR,
        cod_afectat VARCHAR,
        denumire_produs VARCHAR,
        prioritate VARCHAR,
        termen_initiat DATETIME NOT NULL,
        termen_cerut TIME,
        status VARCHAR NOT NULL DEFAULT 'Deschis'
    )
""")
conn.commit()
conn.close()

print("✅ Tabela cs_tickets a fost recreata cu structura noua (goala, gata de folosit).")
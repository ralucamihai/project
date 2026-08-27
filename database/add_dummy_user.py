import os
import psycopg2
from passlib.context import CryptContext

DB_URL = os.environ["DB_URL"]  # must point to your local Postgres
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

username = "admin"
password = "admin"

user = {
    "firstName": "Dummy",
    "lastName": "User",
    "email": "dummy@example.com",
    "employeeNo": "000",
    "role": "admin",
    "status": "activ",  # IMPORTANT: your login checks for status == "activ"
    "password_hash": pwd_context.hash(password),
}

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

cur.execute("""
    INSERT INTO users (
      "firstName", "lastName", "username", "password_hash",
      "email", "employeeNo", "role", "status"
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT ("username") DO UPDATE SET
      "password_hash" = EXCLUDED."password_hash",
      "firstName" = EXCLUDED."firstName",
      "lastName" = EXCLUDED."lastName",
      "email" = EXCLUDED."email",
      "employeeNo" = EXCLUDED."employeeNo",
      "role" = EXCLUDED."role",
      "status" = EXCLUDED."status";
""", (
    user["firstName"], user["lastName"], username, user["password_hash"],
    user["email"], user["employeeNo"], user["role"], user["status"]
))



conn.commit()
cur.close()
conn.close()

print("✅ Dummy user created:", username, "password:", password)

# export DB_URL='postgresql://postgres:postgres@127.0.0.1:5432/pmb_dashboard'
# python add_dummy_user.py


# pip uninstall -y bcrypt passlib
# pip install "passlib[bcrypt]==1.7.4" "bcrypt==4.1.2"


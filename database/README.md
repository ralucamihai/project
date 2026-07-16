# README - PostgreSQL (Podman) Setup + DB Init Script

# 1) Create persistent volume
podman volume create pmb_postgres_data

# 2) Run PostgreSQL container
podman run -d --name pmb-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pmb_dashboard \
  -p 5432:5432 \
  -v pmb_postgres_data:/var/lib/postgresql/data \
  postgres:16

# 3) Verify container is running
podman ps

# 4) Set DB URL (Linux/macOS)
export DB_URL='postgresql://postgres:postgres@127.0.0.1:5432/pmb_dashboard'

# 5) (Optional) Test DB connection via psql
podman exec -it pmb-postgres psql -U postgres -d pmb_dashboard

# 6) Create init SQL file (example: init_db.sql)
#    Put your schema + seed SQL in this file.

# 7) Run init SQL script in one command
#    Run from folder where init_db.sql exists:
podman exec -i pmb-postgres psql -U postgres -d pmb_dashboard < ./init_db.sql

# 8) Verify tables were created
podman exec -it pmb-postgres psql -U postgres -d pmb_dashboard -c "\dt"

# 9) (Optional) Inspect users table columns
podman exec -it pmb-postgres psql -U postgres -d pmb_dashboard -c "\d users"

# 10) Start backend (example command)
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# 11) Add dummy user (test locally)
python ../database/add_dummy_user.py

# ------------------------------------------------------------
# Useful container commands
# ------------------------------------------------------------

# View DB container logs
podman logs pmb-postgres

# Stop container
podman stop pmb-postgres

# Start container again
podman start pmb-postgres

# Remove container (data remains in volume)
podman rm -f pmb-postgres

# Remove volume too (DANGER: deletes DB data)
podman volume rm pmb_postgres_data

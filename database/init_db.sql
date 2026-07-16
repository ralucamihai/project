-- init_db.sql
-- Initializes local schema for the FastAPI backend (Postgres)

-- =====
-- USERS
-- =====
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "firstName" VARCHAR(128) NOT NULL,
  "lastName" VARCHAR(128) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  email VARCHAR(50) NOT NULL,
  "employeeNo" VARCHAR(50) NOT NULL,
  role VARCHAR(25) NOT NULL,
  status VARCHAR(25) NOT NULL
);

-- =====================
-- PMB DASHBOARD DATA
-- =====================
CREATE TABLE IF NOT EXISTS pmb_dashboard_data (
  id SERIAL PRIMARY KEY,

  date DATE,
  shift INTEGER,

  product_code VARCHAR(255) NOT NULL,
  description TEXT,

  category VARCHAR(255),
  rack VARCHAR(255),
  module VARCHAR(255),

  dat_number VARCHAR(255),
  par_number VARCHAR(255),
  header_counter INTEGER,

  start_ts TIME,
  end_ts TIME,

  nr_tests INTEGER,
  nr_errors INTEGER,
  percent_errors DOUBLE PRECISION,

  fpy DOUBLE PRECISION,
  spy DOUBLE PRECISION,

  status VARCHAR(50),
  order_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT pmb_dashboard_unique_record UNIQUE (
    date, product_code, rack, category, module,
    dat_number, par_number, header_counter
  )
);

-- Keep updated_at fresh on updates
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pmb_dashboard_updated_at ON pmb_dashboard_data;

CREATE TRIGGER trg_pmb_dashboard_updated_at
BEFORE UPDATE ON pmb_dashboard_data
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ========
-- PROD_TIME
-- ========
CREATE TABLE IF NOT EXISTS prod_time (
  pr_cod     VARCHAR(50) NOT NULL,
  pr_dela    TIMESTAMP NULL,
  pr_sys     VARCHAR(50) NULL,
  pr_panala  TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_time_panala_null
ON prod_time (pr_panala);

-- ============
-- DUMMY RECORDS
-- ============
-- Insert a sample dashboard row (idempotent-ish by unique constraint)
INSERT INTO pmb_dashboard_data
(
  date, shift, product_code, description,
  category, rack, module,
  dat_number, par_number, header_counter,
  start_ts, end_ts,
  nr_tests, nr_errors, percent_errors,
  fpy, spy,
  status, order_id
)
VALUES
(
  '2026-01-01', 1, 'TEST123', 'Test description',
  'CatA', 'Rack1', 'Module1',
  '001', 'PAR1', 1,
  '08:00:00', '10:00:00',
  10, 2, 20.0,
  90, 95,
  'Running', 'ORDER1'
)
ON CONFLICT ON CONSTRAINT pmb_dashboard_unique_record
DO UPDATE SET
  description = EXCLUDED.description,
  start_ts = EXCLUDED.start_ts,
  end_ts = EXCLUDED.end_ts,
  nr_tests = EXCLUDED.nr_tests,
  nr_errors = EXCLUDED.nr_errors,
  percent_errors = EXCLUDED.percent_errors,
  fpy = EXCLUDED.fpy,
  spy = EXCLUDED.spy,
  status = EXCLUDED.status,
  order_id = EXCLUDED.order_id;

-- Insert a sample prod_time row
INSERT INTO prod_time (pr_cod, pr_dela, pr_sys, pr_panala)
VALUES ('TEST123', '2026-01-01 08:00:00', 'ORDER_001', NULL);

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
  department VARCHAR(100),
  role VARCHAR(25) NOT NULL,
  status VARCHAR(25) NOT NULL
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
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


-- =====================================================================
-- CUSTOMER SUPPORT — schema extinsă (Tickets / Orders / Suggestions / Complaints)
-- Sigur de rulat și pe o bază de date existentă: CREATE TABLE IF NOT EXISTS +
-- ADD COLUMN IF NOT EXISTS pentru coloanele noi.
-- Nu modifică nimic din restul schemei (users, pmb_dashboard_data, prod_time).
-- =====================================================================

CREATE TABLE IF NOT EXISTS cs_tickets (
  id SERIAL PRIMARY KEY,
  titlu VARCHAR(255) NOT NULL,
  descriere TEXT,
  client VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Deschis',
  prioritate VARCHAR(50) NOT NULL DEFAULT 'Medie',
  data_creare DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS cs_orders (
  id SERIAL PRIMARY KEY,
  numar_comanda VARCHAR(100) UNIQUE NOT NULL,
  client VARCHAR(255) NOT NULL,
  produs VARCHAR(255) NOT NULL,
  cantitate INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'In procesare',
  data_comanda DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS cs_suggestions (
  id SERIAL PRIMARY KEY,
  titlu VARCHAR(255) NOT NULL,
  descriere TEXT,
  autor VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL DEFAULT 'Funcționalitate',
  status VARCHAR(50) NOT NULL DEFAULT 'Nou',
  data_trimitere DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS cs_complaints (
  id SERIAL PRIMARY KEY,
  titlu VARCHAR(255) NOT NULL,
  descriere TEXT,
  client VARCHAR(255) NOT NULL,
  severitate VARCHAR(50) NOT NULL DEFAULT 'Medie',
  status VARCHAR(50) NOT NULL DEFAULT 'Deschis',
  data_trimitere DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------------------------------------------------------------------
-- Coloane noi TICKETS (specifice + comune)
-- ---------------------------------------------------------------------
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS pmb_nr VARCHAR(100);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS denumire_echipament VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS cod_afectat VARCHAR(100);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS denumire_produs VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS descriere_simptom TEXT;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS tip_interventie VARCHAR(100);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS categorie VARCHAR(100);

ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS numar_intern VARCHAR(100);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS initiator VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS sectie VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS linie VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS locatie VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS responsabil VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS cauza_interventie TEXT;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS explicatie TEXT;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS operatii_suplimentare TEXT;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS termen_data DATE;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS termen_ora TIME;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS kpi VARCHAR(255);
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS de_la_ora TIME;
ALTER TABLE cs_tickets ADD COLUMN IF NOT EXISTS pana_la_ora TIME;

-- ---------------------------------------------------------------------
-- Coloane noi ORDERS
-- ---------------------------------------------------------------------
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS categorie_produs VARCHAR(100);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS furnizor VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS prioritate VARCHAR(50);

ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS numar_intern VARCHAR(100);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS initiator VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS sectie VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS linie VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS locatie VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS responsabil VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS cauza_interventie TEXT;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS explicatie TEXT;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS operatii_suplimentare TEXT;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS termen_data DATE;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS termen_ora TIME;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS kpi VARCHAR(255);
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS de_la_ora TIME;
ALTER TABLE cs_orders ADD COLUMN IF NOT EXISTS pana_la_ora TIME;

-- ---------------------------------------------------------------------
-- Coloane noi SUGGESTIONS
-- ---------------------------------------------------------------------
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS prioritate VARCHAR(50);

ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS numar_intern VARCHAR(100);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS initiator VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS sectie VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS linie VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS locatie VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS responsabil VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS cauza_interventie TEXT;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS explicatie TEXT;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS operatii_suplimentare TEXT;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS termen_data DATE;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS termen_ora TIME;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS kpi VARCHAR(255);
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS de_la_ora TIME;
ALTER TABLE cs_suggestions ADD COLUMN IF NOT EXISTS pana_la_ora TIME;

-- ---------------------------------------------------------------------
-- Coloane noi COMPLAINTS
-- ---------------------------------------------------------------------
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS numar_intern VARCHAR(100);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS initiator VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS sectie VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS linie VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS locatie VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS responsabil VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS cauza_interventie TEXT;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS explicatie TEXT;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS operatii_suplimentare TEXT;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS termen_data DATE;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS termen_ora TIME;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS kpi VARCHAR(255);
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS de_la_ora TIME;
ALTER TABLE cs_complaints ADD COLUMN IF NOT EXISTS pana_la_ora TIME;

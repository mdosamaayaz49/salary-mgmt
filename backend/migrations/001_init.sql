-- Core schema. See docs/SCHEMA.md for the reasoning behind each choice.

CREATE TABLE fx_rates (
  currency_code TEXT PRIMARY KEY CHECK (length(currency_code) = 3),
  usd_per_unit  REAL NOT NULL CHECK (usd_per_unit > 0),
  as_of         TEXT NOT NULL
);

CREATE TABLE employees (
  id           INTEGER PRIMARY KEY,
  full_name    TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (length(country_code) = 2),
  department   TEXT NOT NULL,
  job_level    TEXT NOT NULL CHECK (job_level IN ('L1', 'L2', 'L3', 'L4', 'L5')),
  hire_date    TEXT NOT NULL CHECK (date(hire_date) = hire_date)
);

CREATE INDEX idx_employees_department ON employees (department);
CREATE INDEX idx_employees_country    ON employees (country_code);
CREATE INDEX idx_employees_job_level  ON employees (job_level);

-- Append-only audit trail of pay. Never UPDATEd or DELETEd (enforced by triggers below).
CREATE TABLE salary_history (
  id             INTEGER PRIMARY KEY,
  employee_id    INTEGER NOT NULL REFERENCES employees (id),
  amount         INTEGER NOT NULL CHECK (amount > 0),          -- annual gross, whole units of currency_code
  currency_code  TEXT    NOT NULL REFERENCES fx_rates (currency_code),
  effective_date TEXT    NOT NULL CHECK (date(effective_date) = effective_date),
  change_type    TEXT    NOT NULL CHECK (change_type IN ('hire', 'raise', 'correction')),
  note           TEXT,
  created_at     TEXT    NOT NULL
);

-- Makes "latest salary row for employee X" a single index seek.
CREATE INDEX idx_salary_history_latest
  ON salary_history (employee_id, effective_date DESC, id DESC);

CREATE TRIGGER salary_history_no_update BEFORE UPDATE ON salary_history
BEGIN
  SELECT RAISE(ABORT, 'salary_history is append-only');
END;

CREATE TRIGGER salary_history_no_delete BEFORE DELETE ON salary_history
BEGIN
  SELECT RAISE(ABORT, 'salary_history is append-only');
END;

-- The single definition of "current salary": latest effective_date, ties broken by
-- insertion order (so a same-day correction wins). Every read path uses this view.
CREATE VIEW current_salaries AS
SELECT
  e.id             AS employee_id,
  e.full_name,
  e.country_code,
  e.department,
  e.job_level,
  e.hire_date,
  s.id             AS salary_id,
  s.amount,
  s.currency_code,
  s.effective_date,
  s.amount * f.usd_per_unit AS amount_usd
FROM employees e
JOIN salary_history s ON s.id = (
  SELECT latest.id
  FROM salary_history latest
  WHERE latest.employee_id = e.id
  ORDER BY latest.effective_date DESC, latest.id DESC
  LIMIT 1
)
JOIN fx_rates f ON f.currency_code = s.currency_code;

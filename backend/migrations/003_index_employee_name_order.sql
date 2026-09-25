-- The employee list is ordered by (full_name, id). Without an index SQLite builds the
-- current_salaries row for all 10k employees and sorts them just to return 25 rows.
-- Measured on the 10k seed: first page 11.8 ms -> 0.2 ms. See docs/PERFORMANCE.md.
-- (This does not help substring search `LIKE '%x%'`; it serves the ORDER BY.)
CREATE INDEX idx_employees_name_order ON employees (full_name, id);

# Performance considerations

## Summary
At 10,000 employees, every endpoint answers in under ~40 ms with one SQLite file and ordinary indexes. That's why there's no cache, no separate analytics store and no background jobs. The sections below give the numbers, what drives them, and when the design would need to change.

## Dataset
The deterministic seed (`npm run seed`, seed `20260101`) produces:

- 10,000 employees
- 49,514 salary history rows (one hire row plus about four raises on average)
- 7 countries, 6 departments, 5 job levels
- about 0.7 s to generate and insert everything, in a single transaction

## Measured query times

The machine was a 2-vCPU Xeon at 2.1 GHz running Node 22. Each figure is the mean of 20 runs after one warm-up run.

| Operation | Endpoint | Time |
|---|---|---|
| Employee list, first page (25 rows + total count) | `GET /api/employees` | ~15 ms |
| Employee list, page 200 (50 rows, deepest offset) | `GET /api/employees?page=200&pageSize=50` | ~31 ms |
| Name search "sha" | `GET /api/employees?search=sha` | ~1.4 ms |
| Department + country filter | `GET /api/employees?department=Engineering&country=IN` | ~4 ms |
| Employee detail + full history | `GET /api/employees/:id` | ~0.1 ms |
| Stats by department, all 10k | `GET /api/reports/salary-stats?groupBy=department` | ~38 ms |
| Stats by country, all 10k | `GET /api/reports/salary-stats?groupBy=country` | ~36 ms |
| Stats by level, Engineering in India | `...groupBy=jobLevel&department=Engineering&country=IN` | ~5.5 ms |

**Caveat:** npm was blocked in the authoring environment, so these were measured with Node's built-in SQLite (`node:sqlite`) instead of better-sqlite3. Both run the same SQLite engine with the same query plans. Treat the figures as indicative and re-measure after `npm install`.

## What makes it fast

**Indexes, each tied to a query:**

| Index | Serves |
|---|---|
| `salary_history (employee_id, effective_date DESC, id DESC)` | Finding "latest salary for employee X" is one covering-index lookup. This is what makes the `current_salaries` view cheap. |
| `employees (department)`, `(country_code)`, `(job_level)` | Filter and drill-down queries |
| `employees (full_name, id)` | The list's `ORDER BY`. Without it, SQLite builds all 10k rows and sorts them just to return 25. |

**Query plan for a filtered list** (`EXPLAIN QUERY PLAN`):
```
SEARCH e USING INDEX idx_employees_country (country_code=?)
SEARCH s USING INTEGER PRIMARY KEY (rowid=?)
CORRELATED SCALAR SUBQUERY 3
  SEARCH latest USING COVERING INDEX idx_salary_history_latest (employee_id=?)
SEARCH f USING INDEX sqlite_autoindex_fx_rates_1 (currency_code=?)
```

**A change driven by measurement.** The first version had no index for the sort order. Measuring showed the first page's rows took 11.8 ms because all 10k view rows were built and sorted. Adding `(full_name, id)` in migration 004 brought that to 0.2 ms. The remaining cost of the first page is mostly `COUNT(*)` over the view.

**Other design choices that help:**
- Aggregation happens inside SQLite, so rows never cross into JavaScript. A report returns about 5–7 rows, not 10k.
- The server paginates, and `pageSize` is capped at 100, so the browser never renders 10k rows.
- Responses to superseded requests are dropped in the UI, so fast typing doesn't cause re-render churn.
- better-sqlite3 is synchronous, so there's no promise overhead on sub-millisecond queries. Node's single thread is fine for a single-user tool.

## Where it stops scaling, and what to do then

| Scale | What gets slow | Change |
|---|---|---|
| ~10k (today) | Nothing | None |
| ~100k employees | Full-table reports (~0.4 s) and `COUNT(*)` over the view on every list page | Store `current_salary_id` on `employees` (updated in the same transaction as the insert) instead of the correlated subquery. Cache or skip exact totals on unfiltered lists. |
| ~1M employees / multiple users | Deep `OFFSET` pages, substring search, write concurrency | Cursor pagination on `(full_name, id)`. Full-text search (SQLite FTS5 or Postgres trigram). Move to Postgres. Precompute a nightly summary table for dashboards. |
| Live FX | Rates change under cached reports | Rate snapshots in the DB, refreshed by a background job (see [DECISIONS.md](DECISIONS.md) #8) |

Substring search (`LIKE '%term%'`) can never use a B-tree index. At 10k names a scan costs about 1–4 ms, which is why no search index was added.

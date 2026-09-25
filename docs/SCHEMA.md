# Schema (confirmed)

## ERD (one line)

```
fx_rates (currency_code PK) 1──< salary_history >──1 employees (id PK)
```

`salary_history` is the single source of truth for pay. An employee's "current
salary" is *derived* (latest row), never stored twice.

## Tables

### employees
| column        | type    | notes                                              |
|---------------|---------|----------------------------------------------------|
| id            | INTEGER | PK                                                 |
| full_name     | TEXT    | NOT NULL                                           |
| country_code  | TEXT    | NOT NULL, ISO-3166 alpha-2 (`IN`, `US`, `GB` …)    |
| department    | TEXT    | NOT NULL                                           |
| job_level     | TEXT    | NOT NULL, CHECK IN (`L1`…`L5`)                      |
| hire_date     | TEXT    | NOT NULL, ISO date `YYYY-MM-DD`                     |

Indexes: `(department)`, `(country_code)`, `(job_level)` for filters, and `(full_name, id)` for the
list's sort order (migration 003). That index serves `ORDER BY`, not search: a substring match
(`LIKE '%term%'`) can't use a B-tree index, and scanning 10k names takes a few ms.
No currency column here — see below.

### salary_history (append-only)
| column          | type    | notes                                                  |
|-----------------|---------|--------------------------------------------------------|
| id              | INTEGER | PK, also the tiebreaker for same-day records           |
| employee_id     | INTEGER | NOT NULL, FK → employees.id                            |
| amount          | INTEGER | NOT NULL, CHECK > 0 — **annual** gross, whole units     |
| currency_code   | TEXT    | NOT NULL, FK → fx_rates.currency_code                  |
| effective_date  | TEXT    | NOT NULL, ISO date                                     |
| change_type     | TEXT    | NOT NULL, CHECK IN (`hire`, `raise`, `correction`)     |
| note            | TEXT    | NULL — free-text reason                                |
| created_at      | TEXT    | NOT NULL — set by the app (injected clock, testable)   |

Index: `(employee_id, effective_date DESC, id DESC)` → "latest row per employee"
is an index seek.

No UPDATE/DELETE path in the API. A correction is a new row with
`change_type = 'correction'`.

### fx_rates (static, seeded)
| column         | type | notes                                          |
|----------------|------|------------------------------------------------|
| currency_code  | TEXT | PK, ISO-4217                                   |
| usd_per_unit   | REAL | NOT NULL, CHECK > 0 — e.g. INR ≈ 0.012         |
| as_of          | TEXT | NOT NULL — documents the snapshot date         |

One rate per currency, not a time series. Every aggregate converts using this
single rate, regardless of when a salary took effect.

Migration 002 seeds illustrative rates. Refreshing again = add another migration (applied
migrations are never edited). Tests pin their own rates in `test/helpers.ts`, so a
refresh never changes test expectations.

### current_salaries (VIEW)
Latest `salary_history` row per employee (a correlated `ORDER BY effective_date DESC,
id DESC LIMIT 1` subquery, served by the index above), joined to `fx_rates` to expose
`amount_usd`. List, detail and aggregate queries
all read from this view, so "what is current" is defined exactly once.

## Decisions & trade-offs

1. **Currency lives on the salary record, not the employee.** An amount is
   meaningless without its currency; if someone relocates (INR → GBP) older
   rows stay correct. The API still exposes "employee currency" as the current
   record's currency, satisfying the requirements field list.
2. **Current salary is derived, not denormalized.** At 10k employees / ~50k
   history rows the view costs a few ms; a denormalized column would be one
   more thing that can drift from the audit trail.
3. **Whole-unit integer amounts.** Annual salaries don't need cents, and
   integers avoid float drift in sums. USD conversion happens at query time
   (REAL), rounded to whole dollars for display.
4. **Department / country as plain TEXT, not lookup tables.** Filterable and
   indexed; lookup tables would be ceremony with no requirement behind them.
   `job_level` gets a CHECK because the set is fixed and ordered.
5. **Median in SQL** via window functions (SQLite ≥ 3.25), consistent with
   "aggregations in SQL". Tests run against an in-memory SQLite with small
   hand-built fixtures, so the math is verified exactly.
6. **DB driver: better-sqlite3.** Synchronous, fast, trivial `:memory:` DBs for
   tests, raw SQL is the right level for a handful of queries. Knex would add a
   query-builder layer we don't need. Migrations = numbered `.sql` files applied
   in order by a ~20-line runner.

## Confirmed decisions
- Currency is stored on each `salary_history` row.
- Future-dated salary records are **rejected**; "today" comes from an injected clock, never `new Date()` inside business logic.
- One static USD rate per currency; no historical FX.

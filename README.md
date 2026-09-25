# Salary Management

Salary management for ACME's HR Manager: browse ~10,000 employees, see each person's salary history, record raises and corrections, and answer pay questions (average, median, headcount, payroll) across departments, countries and job levels.

## Documentation

| Document | What's in it |
|---|---|
| [REQUIREMENTS.md](REQUIREMENTS.md) | Scope, out-of-scope items and why |
| [docs/PLAN.md](docs/PLAN.md) | Build order, questions settled up front, requirements traceability, test inventory, known limitations, next steps |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System, data-model and request-flow diagrams; code layout; testability |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Tables, indexes, the `current_salaries` view, FX modelling |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Trade-offs: what was chosen, what it costs, when to revisit (incl. live FX) |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Measured query times on 10k employees, indexes, scaling thresholds |
| [docs/AI_USAGE.md](docs/AI_USAGE.md) | Prompts used with the AI pair, decisions kept by the human, how output was verified |

## Stack

| Layer    | Choice                                                   |
|----------|----------------------------------------------------------|
| API      | Node.js, Express, TypeScript                             |
| Database | SQLite via better-sqlite3, plain SQL migrations          |
| UI       | React, TypeScript, MUI (Vite dev server)                 |
| Tests    | Jest + Supertest (backend), Vitest + React Testing Library (frontend) |

## Run it

Requires Node 20 or newer.

```bash
# API: http://localhost:3001
cd backend
npm install
npm run seed      # creates data/salary.db with 10,000 employees (same data every run)
npm run dev

# UI: http://localhost:5173 (proxies /api to :3001)
cd frontend
npm install
npm run dev
```

## Test it

```bash
cd backend && npm test
cd frontend && npm test
```

Tests use in-memory SQLite, a fixed clock, pinned FX rates and a fixed random seed, so there are no sleeps, no real time and no real randomness. CI (`.github/workflows/ci.yml`) runs type checks and both test suites on every push.

## API

| Method | Path                                   | Purpose |
|--------|----------------------------------------|---------|
| GET    | `/api/meta`                            | Filter options (departments, countries, levels, currencies) and the FX snapshot date |
| GET    | `/api/employees?search=&department=&country=&jobLevel=&page=1&pageSize=25` | Paginated, filtered list with current salary (pageSize ≤ 100) |
| GET    | `/api/employees/:id`                   | One employee, current salary and full history (newest first) |
| POST   | `/api/employees/:id/salaries`          | Append a raise/correction: `{ amount, currencyCode, effectiveDate, changeType, note? }` |
| GET    | `/api/reports/salary-stats?groupBy=department\|country\|jobLevel&department=&country=&jobLevel=` | Headcount, average, median and total payroll in USD, per group |

Validation errors return `400 { error: "validation_failed", fieldErrors: { field: message } }`.

## Assumptions and trade-offs

- **Salary history is append-only.** DB triggers reject UPDATE and DELETE on `salary_history`. A correction is a new row. The current salary is the row with the latest effective date (a same-day correction wins).
- **Future-dated records are rejected.** "Today" is injected into the business logic, so tests control it.
- **Fixed FX rates (USD).** One rate per currency — the ECB reference rates of 2026-09-24 (migration 003) — applied to every salary regardless of its date. The UI states this next to every USD figure. Live rates were considered and deferred ([DECISIONS.md](docs/DECISIONS.md) #8).
- **Aggregates are done in SQL.** SQLite has no `MEDIAN()`, so the median uses window functions. On 10k employees each report query runs in about 40 ms ([PERFORMANCE.md](docs/PERFORMANCE.md)).
- **Offset pagination.** At this size OFFSET is cheap and gives the UI a total count and page jumps. Cursor pagination would be worth it for much larger or fast-changing data.
- **No debounce on search.** A query per keystroke takes a few ms locally. Add a debounce if the API ever sits behind a slow network.
- **Out of scope** (see REQUIREMENTS.md): auth, payroll/tax, live FX, CSV import/export, org hierarchy.

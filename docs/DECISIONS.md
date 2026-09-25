# Decisions and trade-offs

Each entry has four parts: what we chose, why, what we gave up, and when to revisit it. Decisions marked **(confirmed)** were raised as questions and agreed before any code was written. The rest were engineering judgment calls.

## Data model

### 1. Salary history is append-only, and "current" is derived **(confirmed intent)**
- **Chosen:** every change is a new `salary_history` row. The current salary is the latest row by `effective_date`, with ties broken by `id`, so a same-day correction wins. DB triggers reject `UPDATE` and `DELETE`.
- **Why:** the requirements ask for an audit trail. Enforcing it in the database means no future code path can quietly rewrite history.
- **Gave up:** you can't fix a typo in place. A mistake is corrected with a new `correction` row. Re-seeding means deleting the DB file.
- **Revisit when:** a legal requirement demands deleting data (for example, GDPR erasure). That would need an explicit, audited redaction path.

### 2. Currency is stored on each salary record, not on the employee **(confirmed)**
- **Why:** an amount means nothing without its currency. If someone relocates from INR to GBP, older rows stay correct.
- **Gave up:** "employee currency" is derived (the currency of their current record) instead of being a plain column.

### 3. Future-dated records are rejected **(confirmed)**
- **Why:** it keeps "current" to a single rule (the latest row) and keeps "today" out of every query.
- **Gave up:** you can't pre-load a raise approved now that starts next quarter.
- **Revisit when:** HR needs scheduled raises. The approach then is `effective_date <= :asOf`, with `asOf` injected.

### 4. The current salary is computed in a view, not stored in a column
- **Why:** there's one source of truth, so nothing can drift. The index `(employee_id, effective_date DESC, id DESC)` makes finding the latest row a single index lookup.
- **Gave up:** a few milliseconds per query at 10k employees (see [PERFORMANCE.md](PERFORMANCE.md)).
- **Revisit when:** somewhere around 100k employees. Then store `current_salary_id` on `employees`, maintained in the same transaction as the insert.

### 5. Amounts are whole-unit integers
- **Why:** annual salaries don't use cents, and integers avoid floating-point drift in stored values. Conversion to USD happens at query time and is rounded to whole dollars for display.

### 6. Department and country are plain text; job level is checked
- **Why:** they're filterable and indexed without extra lookup tables. Job levels are a fixed, ordered set, so a `CHECK` constraint guards them.
- **Revisit when:** departments need their own attributes, or need renaming without touching every employee row.

## Currency normalization

### 7. Fixed FX rates, not live rates **(confirmed)**
- **Chosen:** one USD rate per currency in `fx_rates`, loaded by migrations. It's currently the ECB reference rates of **2026-09-24** (migration 003).
- **Why:** the requirements rule out live rates. Fixed rates also keep reports reproducible and the app free of network dependencies.
- **Gave up:** USD figures lag the market until someone adds a new rate migration. Historical salaries are converted at today's rate, not the rate at the time.
- **Shown to the user:** the dashboard shows "fixed FX rates as of 2026-09-24 — not live market rates" next to every USD figure.

### 8. Live FX was considered and deferred
If rates ever need to stay current, the design would be:
- A scheduled job (on startup and every few hours) fetches rates from a provider behind a `FxRateProvider` interface. Tests use a fake provider.
- Rates go into an `fx_rate_snapshots` table (currency, rate, as_of, fetched_at, source), so there's a history of which rate produced which number.
- Reads never call the provider. They use the latest snapshot in the DB, so a provider outage only makes rates stale and never breaks a page.
- Each refresh is validated (all currencies present, rates positive, day-over-day changes within a sane range) and written in one transaction.
- The UI shows the source and timestamp, and warns when rates are stale.
- **Cost of doing it:** figures change even when pay doesn't, and reports stop being reproducible unless you add an "as of" date. Rough effort: half a day to a day.

### 9. Tests pin their own FX rates
- **Why:** test fixtures read like arithmetic (5,000,000 INR × 0.012 = 60,000 USD), and refreshing the real rates never breaks a test.

## Backend

### 10. better-sqlite3 over knex + sqlite3
- **Why:** it's synchronous, which suits sub-millisecond queries. It also makes `:memory:` databases trivial for tests. The SQL is hand-tuned (window functions for the median), and a query builder would hide it without saving any work.

### 11. Aggregation is done in SQL, including the median
- **Why:** the requirements ask for it. It also avoids pulling 10k rows into Node for every report. SQLite has no `MEDIAN()`, so window functions pick the middle value, or the two middle values for even counts.
- **Tests:** odd and even group sizes, a separate median per group, current salary only, drill-down filters, and an empty result.

### 12. Offset pagination, capped at 100 rows per page
- **Why:** at 10k rows, `OFFSET` is cheap and gives the UI a total count and page jumps for free. The cap stops a client from requesting all 10k rows at once.
- **Revisit when:** there are hundreds of thousands of rows, or data changes while someone is paging. Switch to cursor pagination on `(full_name, id)` then.

### 13. Validation returns every field error at once
- **Why:** HR sees every problem in one pass. The API's `400` responses include a `fieldErrors` object that the form shows next to each field.

### 14. No extra layers
- **Why:** there's no repository pattern, service classes or dependency-injection container. The project is a handful of queries and one write path. The code is split by feature (`employees/`, `salaries/`, `reports/`) instead of by technical layer.

## Frontend

### 15. MUI with a single page and tabs, no router
- **Why:** there are two views and a dialog, so a router would add a dependency without adding any capability.
- **Revisit when:** deep links are needed, for example "send me the link to this employee".

### 16. The server paginates and aggregates; the browser only displays
- **Why:** the browser never receives 10k rows. Filters, sorting and aggregation happen in SQL.

### 17. Search runs on every keystroke, with no debounce
- **Why:** each query takes a few ms locally, and a debounce adds timers that make tests slower and flakier. Responses to superseded requests are ignored, so fast typing never shows stale results.
- **Revisit when:** the API is behind a slow network.

### 18. Vitest + React Testing Library for the frontend
- **Why:** the requirements name React Testing Library but not a test runner. Vitest is native to Vite, and the tests read the same as Jest tests would.

## Out of scope (from REQUIREMENTS.md)
Auth/RBAC, payroll and tax, live FX (see #8), CSV import/export, org hierarchy, and i18n. Each is called out there with a reason.

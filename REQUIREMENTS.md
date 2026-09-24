# Salary Management Software — Requirements

## Goal
Give HR Manager a single, reliable place to manage salary data for ~10,000 employees across multiple countries, replacing spreadsheets, and to answer questions about pay across the organization (not just look up one employee at a time).

## Primary User
HR Manager — single-user role for this exercise (see "Deliberately out of scope").

## In Scope

### Employee & salary records
- View, search, and filter employees (by name, department, country, job level).
- View an employee's current salary and salary history (each change is a record, not an overwrite) — HR needs an audit trail, and "how did we get here" is a pay question in itself.
- Add a new salary record for an employee (i.e. give a raise / correction), rather than editing history in place.
- Basic employee record fields: name, country, currency, department, job level, effective salary, hire date.

### Answering pay questions (the core "product" ask)
- Aggregate views: average / median salary by department, by country, by job level, and headcount + total payroll cost per department/country.
- Because employees are paid in different currencies, all aggregates are computed in a normalized reference currency (USD) using a fixed, seeded FX rate table — not live rates. This is called out explicitly as an assumption, not hidden in the code.
- Simple filtering/drill-down on the above (e.g. "average salary for Engineering in India").

### Data
- Seed script generating 10,000 realistic employees across several countries, departments, and job levels, with at least one salary history entry each.

## Deliberately Out of Scope (and why)
- **Multi-user auth / RBAC** — the persona is a single HR Manager; building login, roles, and permissions would add surface area without demonstrating more engineering judgment for this exercise. A single implicit "HR Manager" actor is assumed.
- **Payroll processing / tax / benefits / payslips** — a different problem domain (compliance-heavy, country-specific); out of scope for "manage salary data and answer questions about it."
- **Live FX rates / currency conversion service** — adds an external dependency and non-determinism for little payoff in a take-home; a static seeded rate table is used instead and is clearly swappable later.
- **Bulk import/export (CSV upload, Excel round-trip)** — valuable in a real product (this is literally replacing Excel) but treated as a fast-follow; the seed script covers the "get 10k employees into the system" need for this exercise.
- **Org hierarchy / manager relationships** — not needed to answer the pay questions in scope; would add modeling complexity without a corresponding requirement.
- **Real-time/multi-tab collaboration, notifications, i18n** — not implied by the brief; would be premature generalization.

## Non-functional notes
- 10,000 employees is small enough for a single relational DB with indexes on the columns used for filtering/aggregation (department, country, job level) — no need for pagination-heavy infra or a separate analytics store; this is called out as a scale assumption that would need revisiting well past ~100k–1M rows.
- Aggregation queries are done in SQL (GROUP BY), not pulled into app code, to keep response times fast at this scale.

import type { Db } from '../db';
import {
  roundUsd,
  type EmployeeDetail,
  type EmployeeSummary,
  type SalaryRecord,
} from '../domain';
import type { Page, PageRequest } from '../pagination';
import { buildEmployeeWhere, type EmployeeFilters } from './filters';

interface CurrentSalaryRow {
  employee_id: number;
  full_name: string;
  country_code: string;
  department: string;
  job_level: EmployeeSummary['jobLevel'];
  hire_date: string;
  amount: number;
  currency_code: string;
  effective_date: string;
  amount_usd: number;
}

// Offset pagination: at 10k rows OFFSET is cheap, and it gives the UI a total count and
// "jump to page N" for free. Cursor pagination would matter for much larger or fast-changing data.
export function listEmployees(
  db: Db,
  filters: EmployeeFilters,
  pageRequest: PageRequest,
): Page<EmployeeSummary> {
  const where = buildEmployeeWhere(filters);
  const total = db
    .prepare(`SELECT COUNT(*) FROM current_salaries ${where.sql}`)
    .pluck()
    .get(...where.params) as number;

  const rows = db
    .prepare(
      `SELECT * FROM current_salaries ${where.sql}
       ORDER BY full_name, employee_id
       LIMIT ? OFFSET ?`,
    )
    .all(
      ...where.params,
      pageRequest.pageSize,
      (pageRequest.page - 1) * pageRequest.pageSize,
    ) as CurrentSalaryRow[];

  return { items: rows.map(toEmployeeSummary), total, ...pageRequest };
}

export function findEmployee(db: Db, id: number): EmployeeDetail | undefined {
  const row = db.prepare('SELECT * FROM current_salaries WHERE employee_id = ?').get(id) as
    | CurrentSalaryRow
    | undefined;
  if (!row) return undefined;
  return { ...toEmployeeSummary(row), history: findSalaryHistory(db, id) };
}

/** Newest first — the order HR reads an audit trail in. */
export function findSalaryHistory(db: Db, employeeId: number): SalaryRecord[] {
  const rows = db
    .prepare(
      `SELECT s.id, s.amount, s.currency_code, s.effective_date, s.change_type, s.note,
              s.created_at, s.amount * f.usd_per_unit AS amount_usd
       FROM salary_history s
       JOIN fx_rates f ON f.currency_code = s.currency_code
       WHERE s.employee_id = ?
       ORDER BY s.effective_date DESC, s.id DESC`,
    )
    .all(employeeId) as Array<{
    id: number;
    amount: number;
    currency_code: string;
    effective_date: string;
    change_type: SalaryRecord['changeType'];
    note: string | null;
    created_at: string;
    amount_usd: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    currencyCode: row.currency_code,
    effectiveDate: row.effective_date,
    changeType: row.change_type,
    note: row.note,
    amountUsd: roundUsd(row.amount_usd),
    createdAt: row.created_at,
  }));
}

function toEmployeeSummary(row: CurrentSalaryRow): EmployeeSummary {
  return {
    id: row.employee_id,
    fullName: row.full_name,
    countryCode: row.country_code,
    department: row.department,
    jobLevel: row.job_level,
    hireDate: row.hire_date,
    currentSalary: {
      amount: row.amount,
      currencyCode: row.currency_code,
      effectiveDate: row.effective_date,
      amountUsd: roundUsd(row.amount_usd),
    },
  };
}

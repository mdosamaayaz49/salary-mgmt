import { openDb, type Db } from '../src/db';
import type { Clock } from '../src/salaries/addSalaryRecord';

/**
 * Tests pin their own FX rates so the aggregation math in the tests stays readable
 * (5,000,000 INR = 60,000 USD) and doesn't change when the real snapshot is refreshed.
 */
export const TEST_USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  GBP: 1.27,
  EUR: 1.08,
  INR: 0.012,
  SGD: 0.74,
  JPY: 0.0067,
  BRL: 0.18,
};
export const TEST_FX_AS_OF = '2026-01-01';

export function createTestDb(): Db {
  const db = openDb(':memory:');
  const pinRate = db.prepare('UPDATE fx_rates SET usd_per_unit = ?, as_of = ? WHERE currency_code = ?');
  for (const [currencyCode, usdPerUnit] of Object.entries(TEST_USD_PER_UNIT)) {
    pinRate.run(usdPerUnit, TEST_FX_AS_OF, currencyCode);
  }
  return db;
}

export const fixedClock = (today: string): Clock => ({
  today: () => today,
  now: () => `${today}T09:00:00.000Z`,
});

export interface TestSalary {
  amount: number;
  currency: string;
  date: string;
  type?: 'hire' | 'raise' | 'correction';
}

export interface TestEmployee {
  name?: string;
  country?: string;
  department?: string;
  level?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  hireDate?: string;
  salaries: TestSalary[];
}

/** Inserts one employee with explicit salary rows. Defaults keep tests focused on what matters. */
export function addEmployee(db: Db, employee: TestEmployee): number {
  const hireDate = employee.hireDate ?? employee.salaries[0]?.date ?? '2020-01-01';
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO employees (full_name, country_code, department, job_level, hire_date)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      employee.name ?? 'Test Person',
      employee.country ?? 'US',
      employee.department ?? 'Engineering',
      employee.level ?? 'L2',
      hireDate,
    );
  const insertSalary = db.prepare(
    `INSERT INTO salary_history
       (employee_id, amount, currency_code, effective_date, change_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  employee.salaries.forEach((salary, index) => {
    insertSalary.run(
      lastInsertRowid,
      salary.amount,
      salary.currency,
      salary.date,
      salary.type ?? (index === 0 ? 'hire' : 'raise'),
      `${salary.date}T00:00:00.000Z`,
    );
  });
  return Number(lastInsertRowid);
}

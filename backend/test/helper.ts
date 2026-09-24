import { Clock } from '../src/clock';
import { openDb, type Db } from '../src/db';

export function createTestDb(): Db {
  return openDb(':memory:');
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
      employee.country ?? 'IN',
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

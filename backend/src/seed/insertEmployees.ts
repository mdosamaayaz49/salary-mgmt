import type { Db } from '../db';
import type { SeedEmployee } from './generateEmployees';

/** Inserts generated employees and their salary history in one transaction. */
export function insertEmployees(db: Db, employees: SeedEmployee[]): void {
  const insertEmployee = db.prepare(
    `INSERT INTO employees (full_name, country_code, department, job_level, hire_date)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertSalary = db.prepare(
    `INSERT INTO salary_history
       (employee_id, amount, currency_code, effective_date, change_type, note, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`,
  );

  db.transaction(() => {
    for (const employee of employees) {
      const { lastInsertRowid } = insertEmployee.run(
        employee.fullName,
        employee.countryCode,
        employee.department,
        employee.jobLevel,
        employee.hireDate,
      );
      for (const salary of employee.salaries) {
        insertSalary.run(
          lastInsertRowid,
          salary.amount,
          salary.currencyCode,
          salary.effectiveDate,
          salary.changeType,
          `${salary.effectiveDate}T00:00:00.000Z`,
        );
      }
    }
  })();
}

import type { Db } from '../db';
import type { SalaryRecord } from '../domain';
import { findSalaryHistory } from '../employees/employeeQueries';
import { NotFoundError } from '../errors';
import { loadFxRates } from '../fxRates';
import { validateSalaryInput } from './validateSalaryInput';

export interface Clock {
  /** Today's date as YYYY-MM-DD. */
  today(): string;
  /** Current instant as an ISO timestamp, recorded as created_at. */
  now(): string;
}

/** Appends a raise/correction. History is never edited — this is the only write path. */
export function addSalaryRecord(
  db: Db,
  employeeId: number,
  input: unknown,
  clock: Clock,
): SalaryRecord {
  const hireDate = db.prepare('SELECT hire_date FROM employees WHERE id = ?').pluck().get(employeeId) as
    | string
    | undefined;
  if (hireDate === undefined) throw new NotFoundError(`Employee ${employeeId} not found`);

  const record = validateSalaryInput(input, {
    today: clock.today(),
    hireDate,
    knownCurrencies: new Set(loadFxRates(db).map((rate) => rate.currencyCode)),
  });

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO salary_history
         (employee_id, amount, currency_code, effective_date, change_type, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      employeeId,
      record.amount,
      record.currencyCode,
      record.effectiveDate,
      record.changeType,
      record.note,
      clock.now(),
    );

  const saved = findSalaryHistory(db, employeeId).find((row) => row.id === Number(lastInsertRowid));
  if (!saved) throw new Error('Inserted salary record could not be read back');
  return saved;
}

import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH } from '../config';
import { openDb } from '../db';
import { loadFxRates } from '../fxRates';
import { generateEmployees } from './generateEmployees';
import { insertEmployees } from './insertEmployees';

const EMPLOYEE_COUNT = 10_000;
const SEED = 20260101;
const AS_OF = '2026-06-30';

function main(): void {
  // salary_history is append-only (DB triggers), so re-seeding means starting from a fresh file.
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = openDb(DB_PATH);
  const usdPerUnit = Object.fromEntries(
    loadFxRates(db).map((rate) => [rate.currencyCode, rate.usdPerUnit]),
  );
  const employees = generateEmployees({ count: EMPLOYEE_COUNT, seed: SEED, asOf: AS_OF, usdPerUnit });
  insertEmployees(db, employees);

  const salaryRows = db.prepare('SELECT COUNT(*) FROM salary_history').pluck().get();
  console.log(`Seeded ${employees.length} employees and ${salaryRows} salary records into ${DB_PATH}`);
  db.close();
}

main();

import type { Db } from './db';
import { JOB_LEVELS } from './domain';
import { loadFxRates } from './fxRates';

export interface FilterOptions {
  departments: string[];
  countries: string[];
  jobLevels: string[];
  currencies: string[];
  fxAsOf: string | null;
}

export function getFilterOptions(db: Db): FilterOptions {
  const distinct = (column: string) =>
    db.prepare(`SELECT DISTINCT ${column} FROM employees ORDER BY ${column}`).pluck().all() as string[];
  const rates = loadFxRates(db);

  return {
    departments: distinct('department'),
    countries: distinct('country_code'),
    jobLevels: [...JOB_LEVELS],
    currencies: rates.map((rate) => rate.currencyCode),
    fxAsOf: rates[0]?.asOf ?? null,
  };
}

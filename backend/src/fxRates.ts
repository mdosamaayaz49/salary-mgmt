import type { Db } from './db';

export interface FxRate {
  currencyCode: string;
  usdPerUnit: number;
  asOf: string;
}

export function loadFxRates(db: Db): FxRate[] {
  return db
    .prepare(
      `SELECT currency_code AS currencyCode, usd_per_unit AS usdPerUnit, as_of AS asOf
       FROM fx_rates ORDER BY currency_code`,
    )
    .all() as FxRate[];
}

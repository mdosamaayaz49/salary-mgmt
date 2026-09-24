import { addDays, addYears, daysBetween } from '../dates';
import type { JobLevel } from '../domain';
import { createRng, pickOne, pickWeighted, randomInt, type Rng } from './random';
import {
  COUNTRIES,
  DEPARTMENTS,
  FIRST_NAMES,
  HIRE_DATE_RANGE_START,
  LAST_NAMES,
  LEVELS,
} from './referenceData';

export interface SeedSalary {
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  changeType: 'hire' | 'raise';
}

export interface SeedEmployee {
  fullName: string;
  countryCode: string;
  department: string;
  jobLevel: JobLevel;
  hireDate: string;
  salaries: SeedSalary[];
}

export interface GenerateOptions {
  count: number;
  seed: number;
  /** Fixed "today" for the generated data — never the real clock, so output is reproducible. */
  asOf: string;
  usdPerUnit: Record<string, number>;
}

const ANNUAL_RAISE_PROBABILITY = 0.75;

export function generateEmployees(options: GenerateOptions): SeedEmployee[] {
  const rng = createRng(options.seed);
  const employees: SeedEmployee[] = [];
  for (let i = 0; i < options.count; i++) {
    employees.push(generateEmployee(rng, options));
  }
  return employees;
}

function generateEmployee(rng: Rng, options: GenerateOptions): SeedEmployee {
  const country = pickWeighted(rng, COUNTRIES);
  const department = pickWeighted(rng, DEPARTMENTS);
  const level = pickWeighted(rng, LEVELS);
  const fullName = `${pickOne(rng, FIRST_NAMES)} ${pickOne(rng, LAST_NAMES)}`;
  const hireDate = addDays(
    HIRE_DATE_RANGE_START,
    randomInt(rng, 0, daysBetween(HIRE_DATE_RANGE_START, options.asOf)),
  );

  const usdPerUnit = options.usdPerUnit[country.currency];
  if (!usdPerUnit) throw new Error(`No FX rate for ${country.currency}`);

  const noise = 0.85 + rng() * 0.3; // ±15% spread within a band
  const startingUsd = level.baseUsd * department.payMultiplier * country.payIndex * noise;
  const startingLocal = roundToHundreds(startingUsd / usdPerUnit);

  return {
    fullName,
    countryCode: country.code,
    department: department.name,
    jobLevel: level.level,
    hireDate,
    salaries: buildSalaryHistory(rng, {
      startingAmount: startingLocal,
      currencyCode: country.currency,
      hireDate,
      asOf: options.asOf,
    }),
  };
}

/** A hire record, then a possible raise on each work anniversary up to asOf. */
function buildSalaryHistory(
  rng: Rng,
  params: { startingAmount: number; currencyCode: string; hireDate: string; asOf: string },
): SeedSalary[] {
  const history: SeedSalary[] = [
    {
      amount: params.startingAmount,
      currencyCode: params.currencyCode,
      effectiveDate: params.hireDate,
      changeType: 'hire',
    },
  ];

  let amount = params.startingAmount;
  for (let year = 1; addYears(params.hireDate, year) <= params.asOf; year++) {
    if (rng() >= ANNUAL_RAISE_PROBABILITY) continue;
    const raisePercent = randomInt(rng, 3, 10);
    amount = roundToHundreds(amount * (1 + raisePercent / 100));
    history.push({
      amount,
      currencyCode: params.currencyCode,
      effectiveDate: addYears(params.hireDate, year),
      changeType: 'raise',
    });
  }
  return history;
}

function roundToHundreds(value: number): number {
  return Math.max(100, Math.round(value / 100) * 100);
}

import { generateEmployees, type GenerateOptions } from '../src/seed/generateEmployees';
import { insertEmployees } from '../src/seed/insertEmployees';
import { COUNTRIES } from '../src/seed/referenceData';
import { createTestDb } from './helper';

const USD_PER_UNIT = { USD: 1, GBP: 1.27, EUR: 1.08, INR: 0.012, SGD: 0.74, JPY: 0.0067, BRL: 0.18 };

const options = (overrides: Partial<GenerateOptions> = {}): GenerateOptions => ({
  count: 2_000,
  seed: 42,
  asOf: '2026-06-30',
  usdPerUnit: USD_PER_UNIT,
  ...overrides,
});

describe('generateEmployees', () => {
  it('is deterministic: the same seed produces identical data', () => {
    expect(generateEmployees(options())).toEqual(generateEmployees(options()));
  });

  it('produces different data for a different seed', () => {
    expect(generateEmployees(options({ seed: 1 }))).not.toEqual(generateEmployees(options({ seed: 2 })));
  });

  it('generates the requested number of employees', () => {
    expect(generateEmployees(options({ count: 123 }))).toHaveLength(123);
  });

  it('starts every history with a hire record on the hire date, in the country currency', () => {
    for (const employee of generateEmployees(options())) {
      const expectedCurrency = COUNTRIES.find((c) => c.code === employee.countryCode)?.currency;
      expect(employee.salaries[0]).toMatchObject({
        changeType: 'hire',
        effectiveDate: employee.hireDate,
        currencyCode: expectedCurrency,
      });
    }
  });

  it('never dates hires or raises after asOf, and keeps raises in chronological order', () => {
    for (const employee of generateEmployees(options())) {
      const dates = employee.salaries.map((s) => s.effectiveDate);
      expect(dates).toEqual([...dates].sort());
      expect(dates[dates.length - 1] <= '2026-06-30').toBe(true);
    }
  });

  it('only ever increases pay through raises', () => {
    for (const employee of generateEmployees(options())) {
      const amounts = employee.salaries.map((s) => s.amount);
      amounts.slice(1).forEach((amount, i) => expect(amount).toBeGreaterThanOrEqual(amounts[i]));
    }
  });

  it('spreads employees across all countries, departments and levels', () => {
    const employees = generateEmployees(options());
    const distinct = (values: string[]) => new Set(values).size;

    expect(distinct(employees.map((e) => e.countryCode))).toBe(7);
    expect(distinct(employees.map((e) => e.department))).toBe(6);
    expect(distinct(employees.map((e) => e.jobLevel))).toBe(5);
  });

  it('keeps senior levels paid more than junior levels on average (in USD)', () => {
    const employees = generateEmployees(options());
    const averageUsd = (level: string) => {
      const inLevel = employees.filter((e) => e.jobLevel === level);
      const total = inLevel.reduce((sum, e) => {
        const current = e.salaries[e.salaries.length - 1];
        return sum + current.amount * USD_PER_UNIT[current.currencyCode as keyof typeof USD_PER_UNIT];
      }, 0);
      return total / inLevel.length;
    };

    expect(averageUsd('L5')).toBeGreaterThan(averageUsd('L3'));
    expect(averageUsd('L3')).toBeGreaterThan(averageUsd('L1'));
  });
});

describe('insertEmployees', () => {
  it('stores every employee with exactly one current salary', () => {
    const db = createTestDb();
    insertEmployees(db, generateEmployees(options({ count: 50 })));

    expect(db.prepare('SELECT COUNT(*) FROM employees').pluck().get()).toBe(50);
    expect(db.prepare('SELECT COUNT(*) FROM current_salaries').pluck().get()).toBe(50);
  });
});

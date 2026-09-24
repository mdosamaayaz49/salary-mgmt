import { getSalaryStats } from '../src/reports/salaryStats';
import { addEmployee, createTestDb } from './helper';

// FX rates come from migrations/002_seed_fx_rates.sql: INR = 0.012 USD, GBP = 1.27 USD.
const usd = (amount: number) => [{ amount, currency: 'USD', date: '2024-01-01' }];

describe('getSalaryStats — currency normalization', () => {
  it('converts every salary to USD before aggregating', () => {
    const db = createTestDb();
    addEmployee(db, { department: 'Engineering', salaries: usd(100_000) });
    addEmployee(db, {
      department: 'Engineering',
      country: 'IN',
      salaries: [{ amount: 5_000_000, currency: 'INR', date: '2024-01-01' }], // = 60,000 USD
    });

    const [engineering] = getSalaryStats(db, 'department', {});

    expect(engineering).toEqual({
      group: 'Engineering',
      headcount: 2,
      averageUsd: 80_000,
      medianUsd: 80_000,
      totalPayrollUsd: 160_000,
    });
  });

  it('rounds USD figures to whole dollars', () => {
    const db = createTestDb();
    addEmployee(db, { country: 'GB', salaries: [{ amount: 50_001, currency: 'GBP', date: '2024-01-01' }] }); // 63,501.27

    expect(getSalaryStats(db, 'country', {})[0].averageUsd).toBe(63_501);
  });
});

describe('getSalaryStats — aggregation math', () => {
  it('computes the median of an odd-sized group as the middle value', () => {
    const db = createTestDb();
    [10_000, 30_000, 1_000_000].forEach((amount) => addEmployee(db, { salaries: usd(amount) }));

    expect(getSalaryStats(db, 'department', {})[0]).toMatchObject({ medianUsd: 30_000, averageUsd: 346_667 });
  });

  it('computes the median of an even-sized group as the mean of the two middle values', () => {
    const db = createTestDb();
    [40_000, 10_000, 20_000, 30_000].forEach((amount) => addEmployee(db, { salaries: usd(amount) }));

    expect(getSalaryStats(db, 'department', {})[0].medianUsd).toBe(25_000);
  });

  it('computes the median independently for each group', () => {
    const db = createTestDb();
    [10_000, 20_000, 30_000].forEach((amount) => addEmployee(db, { department: 'Sales', salaries: usd(amount) }));
    [100_000, 200_000].forEach((amount) => addEmployee(db, { department: 'Engineering', salaries: usd(amount) }));

    expect(getSalaryStats(db, 'department', {})).toEqual([
      { group: 'Engineering', headcount: 2, averageUsd: 150_000, medianUsd: 150_000, totalPayrollUsd: 300_000 },
      { group: 'Sales', headcount: 3, averageUsd: 20_000, medianUsd: 20_000, totalPayrollUsd: 60_000 },
    ]);
  });

  it('uses only the current salary, not the whole history', () => {
    const db = createTestDb();
    addEmployee(db, {
      salaries: [
        { amount: 50_000, currency: 'USD', date: '2022-01-01' },
        { amount: 70_000, currency: 'USD', date: '2024-01-01' },
      ],
    });

    expect(getSalaryStats(db, 'department', {})[0]).toMatchObject({ headcount: 1, averageUsd: 70_000 });
  });
});

describe('getSalaryStats — grouping and drill-down', () => {
  function seedMixedCompany() {
    const db = createTestDb();
    addEmployee(db, { department: 'Engineering', country: 'IN', level: 'L2', salaries: [{ amount: 2_500_000, currency: 'INR', date: '2024-01-01' }] }); // 30k
    addEmployee(db, { department: 'Engineering', country: 'IN', level: 'L4', salaries: [{ amount: 5_000_000, currency: 'INR', date: '2024-01-01' }] }); // 60k
    addEmployee(db, { department: 'Engineering', country: 'US', level: 'L2', salaries: usd(120_000) });
    addEmployee(db, { department: 'Sales', country: 'IN', level: 'L2', salaries: [{ amount: 1_000_000, currency: 'INR', date: '2024-01-01' }] }); // 12k
    return db;
  }

  it('groups by country', () => {
    expect(getSalaryStats(seedMixedCompany(), 'country', {}).map((r) => [r.group, r.headcount])).toEqual([
      ['IN', 3],
      ['US', 1],
    ]);
  });

  it('groups by job level', () => {
    expect(getSalaryStats(seedMixedCompany(), 'jobLevel', {}).map((r) => [r.group, r.headcount])).toEqual([
      ['L2', 3],
      ['L4', 1],
    ]);
  });

  it('answers "average salary for Engineering in India"', () => {
    const rows = getSalaryStats(seedMixedCompany(), 'department', { department: 'Engineering', country: 'IN' });

    expect(rows).toEqual([
      { group: 'Engineering', headcount: 2, averageUsd: 45_000, medianUsd: 45_000, totalPayrollUsd: 90_000 },
    ]);
  });

  it('returns no rows when nothing matches the filters', () => {
    expect(getSalaryStats(seedMixedCompany(), 'department', { country: 'JP' })).toEqual([]);
  });
});

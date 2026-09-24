import { listEmployees } from '../src/employees/employeeQueries';
import { buildEmployeeWhere } from '../src/employees/filters';
import { addEmployee, createTestDb } from './helper';

describe('buildEmployeeWhere', () => {
  it('returns no clause when no filters are given', () => {
    expect(buildEmployeeWhere({})).toEqual({ sql: '', params: [] });
  });

  it('ignores blank search text', () => {
    expect(buildEmployeeWhere({ search: '   ' })).toEqual({ sql: '', params: [] });
  });

  it('combines filters with AND and binds every value as a parameter', () => {
    expect(buildEmployeeWhere({ department: 'Engineering', country: 'IN', jobLevel: 'L3' })).toEqual({
      sql: 'WHERE department = ? AND country_code = ? AND job_level = ?',
      params: ['Engineering', 'IN', 'L3'],
    });
  });

  it('searches names as a substring and escapes LIKE wildcards', () => {
    expect(buildEmployeeWhere({ search: ' 50%_off ' }).params).toEqual(['%50\\%\\_off%']);
  });
});

describe('listEmployees', () => {
  const salary = [{ amount: 100_000, currency: 'USD', date: '2024-01-01' }];

  function seedPeople() {
    const db = createTestDb();
    addEmployee(db, { name: 'Priya Sharma', country: 'IN', department: 'Engineering', salaries: [{ amount: 3_000_000, currency: 'INR', date: '2024-01-01' }] });
    addEmployee(db, { name: 'James Smith', country: 'US', department: 'Engineering', salaries: salary });
    addEmployee(db, { name: 'Emily Smith', country: 'US', department: 'Sales', salaries: salary });
    return db;
  }

  it('filters case-insensitively by name and sorts by name', () => {
    const page = listEmployees(seedPeople(), { search: 'smith' }, { page: 1, pageSize: 25 });

    expect(page.total).toBe(2);
    expect(page.items.map((e) => e.fullName)).toEqual(['Emily Smith', 'James Smith']);
  });

  it('drills down by department and country together', () => {
    const page = listEmployees(seedPeople(), { department: 'Engineering', country: 'IN' }, { page: 1, pageSize: 25 });

    expect(page.items.map((e) => e.fullName)).toEqual(['Priya Sharma']);
  });

  it('paginates while reporting the total across all pages', () => {
    const page = listEmployees(seedPeople(), {}, { page: 2, pageSize: 2 });

    expect(page).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page.items.map((e) => e.fullName)).toEqual(['Priya Sharma']);
  });

  it('includes the current salary in local currency and in USD', () => {
    const page = listEmployees(seedPeople(), { country: 'IN' }, { page: 1, pageSize: 25 });

    expect(page.items[0].currentSalary).toEqual({
      amount: 3_000_000,
      currencyCode: 'INR',
      effectiveDate: '2024-01-01',
      amountUsd: 36_000,
    });
  });
});

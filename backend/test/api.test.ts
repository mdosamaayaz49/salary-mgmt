import request from 'supertest';
import { createApp } from '../src/app';
import { addEmployee, createTestDb, fixedClock } from './helpers';

function setup() {
  const db = createTestDb();
  const priyaId = addEmployee(db, {
    name: 'Priya Sharma',
    country: 'IN',
    department: 'Engineering',
    level: 'L3',
    hireDate: '2021-04-01',
    salaries: [
      { amount: 2_000_000, currency: 'INR', date: '2021-04-01' },
      { amount: 2_400_000, currency: 'INR', date: '2023-04-01' },
    ],
  });
  addEmployee(db, {
    name: 'James Smith',
    department: 'Sales',
    salaries: [{ amount: 90_000, currency: 'USD', date: '2022-01-10' }],
  });
  const app = createApp({ db, clock: fixedClock('2026-06-30') });
  return { app, priyaId };
}

describe('GET /api/employees', () => {
  it('returns a page of employees with the total count', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/employees?pageSize=1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(res.body.items).toHaveLength(1);
  });

  it('applies search and filters from the query string', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/employees?search=priya&country=IN&jobLevel=L3');

    expect(res.body.items.map((e: { fullName: string }) => e.fullName)).toEqual(['Priya Sharma']);
  });

  it('rejects an oversized page with 400', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/employees?pageSize=10000');

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toHaveProperty('pageSize');
  });
});

describe('GET /api/employees/:id', () => {
  it('returns the employee with current salary and history, newest first', async () => {
    const { app, priyaId } = setup();

    const res = await request(app).get(`/api/employees/${priyaId}`);

    expect(res.status).toBe(200);
    expect(res.body.currentSalary).toMatchObject({ amount: 2_400_000, currencyCode: 'INR', amountUsd: 28_800 });
    expect(res.body.history.map((h: { amount: number }) => h.amount)).toEqual([2_400_000, 2_000_000]);
  });

  it('returns 404 for an unknown employee', async () => {
    const { app } = setup();

    expect((await request(app).get('/api/employees/999')).status).toBe(404);
  });
});

describe('POST /api/employees/:id/salaries', () => {
  it('appends a raise that becomes the current salary, without touching history', async () => {
    const { app, priyaId } = setup();

    const created = await request(app)
      .post(`/api/employees/${priyaId}/salaries`)
      .send({ amount: 2_700_000, currencyCode: 'INR', effectiveDate: '2026-04-01', changeType: 'raise', note: 'Promotion' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      amount: 2_700_000,
      changeType: 'raise',
      note: 'Promotion',
      createdAt: '2026-06-30T09:00:00.000Z',
    });

    const detail = await request(app).get(`/api/employees/${priyaId}`);
    expect(detail.body.currentSalary.amount).toBe(2_700_000);
    expect(detail.body.history).toHaveLength(3);
  });

  it('returns 400 with field errors for a future-dated record', async () => {
    const { app, priyaId } = setup();

    const res = await request(app)
      .post(`/api/employees/${priyaId}/salaries`)
      .send({ amount: 2_700_000, currencyCode: 'INR', effectiveDate: '2026-07-01', changeType: 'raise' });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual({ effectiveDate: 'cannot be in the future' });
  });

  it('returns 404 when the employee does not exist', async () => {
    const { app } = setup();

    const res = await request(app)
      .post('/api/employees/999/salaries')
      .send({ amount: 1, currencyCode: 'USD', effectiveDate: '2026-01-01', changeType: 'raise' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/reports/salary-stats', () => {
  it('returns USD aggregates grouped by the requested dimension', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/reports/salary-stats?groupBy=department');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      groupBy: 'department',
      currency: 'USD',
      rows: [
        { group: 'Engineering', headcount: 1, averageUsd: 28_800, medianUsd: 28_800, totalPayrollUsd: 28_800 },
        { group: 'Sales', headcount: 1, averageUsd: 90_000, medianUsd: 90_000, totalPayrollUsd: 90_000 },
      ],
    });
  });

  it('supports drill-down filters', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/reports/salary-stats?groupBy=country&department=Sales');

    expect(res.body.rows.map((r: { group: string }) => r.group)).toEqual(['US']);
  });

  it('rejects an unknown groupBy', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/reports/salary-stats?groupBy=salary;DROP TABLE employees');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/meta', () => {
  it('lists filter options and the FX snapshot date', async () => {
    const { app } = setup();

    const res = await request(app).get('/api/meta');

    expect(res.body).toMatchObject({
      departments: ['Engineering', 'Sales'],
      countries: ['IN', 'US'],
      jobLevels: ['L1', 'L2', 'L3', 'L4', 'L5'],
      fxAsOf: '2026-01-01',
    });
  });
});

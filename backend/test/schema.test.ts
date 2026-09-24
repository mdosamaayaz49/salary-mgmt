import { addEmployee, createTestDb } from './helper';

describe('schema', () => {
  it('current_salaries picks the salary with the latest effective date', () => {
    const db = createTestDb();
    const id = addEmployee(db, {
      salaries: [
        { amount: 100_000, currency: 'USD', date: '2022-01-01' },
        { amount: 120_000, currency: 'USD', date: '2024-01-01' },
        { amount: 110_000, currency: 'USD', date: '2023-01-01' }, // inserted later, but older date
      ],
    });

    const current = db.prepare('SELECT amount FROM current_salaries WHERE employee_id = ?').pluck().get(id);

    expect(current).toBe(120_000);
  });

  it('current_salaries prefers the most recently inserted record when two share a date', () => {
    const db = createTestDb();
    const id = addEmployee(db, {
      salaries: [
        { amount: 100_000, currency: 'USD', date: '2024-01-01', type: 'raise' },
        { amount: 105_000, currency: 'USD', date: '2024-01-01', type: 'correction' },
      ],
    });

    const current = db.prepare('SELECT amount FROM current_salaries WHERE employee_id = ?').pluck().get(id);

    expect(current).toBe(105_000);
  });

  it('salary_history is append-only: updates and deletes are rejected', () => {
    const db = createTestDb();
    addEmployee(db, { salaries: [{ amount: 100_000, currency: 'USD', date: '2024-01-01' }] });

    expect(() => db.prepare('UPDATE salary_history SET amount = 1').run()).toThrow(/append-only/);
    expect(() => db.prepare('DELETE FROM salary_history').run()).toThrow(/append-only/);
  });

  it('rejects non-positive amounts and unknown currencies', () => {
    const db = createTestDb();

    expect(() => addEmployee(db, { salaries: [{ amount: 0, currency: 'USD', date: '2024-01-01' }] })).toThrow();
    expect(() => addEmployee(db, { salaries: [{ amount: 1_000, currency: 'XXX', date: '2024-01-01' }] })).toThrow();
  });
});

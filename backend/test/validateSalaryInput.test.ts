import { ValidationError } from '../src/errors';
import { validateSalaryInput } from '../src/salaries/validateSalaryInput';

const context = {
  today: '2026-06-30',
  hireDate: '2020-03-15',
  knownCurrencies: new Set(['USD', 'INR']),
};

const validInput = {
  amount: 120_000,
  currencyCode: 'USD',
  effectiveDate: '2026-06-01',
  changeType: 'raise',
  note: '  Annual review  ',
};

function fieldErrorsFor(input: unknown): Record<string, string> {
  try {
    validateSalaryInput(input, context);
  } catch (error) {
    if (error instanceof ValidationError) return error.fieldErrors;
    throw error;
  }
  throw new Error('expected validation to fail');
}

describe('validateSalaryInput', () => {
  it('accepts a valid raise and trims the note', () => {
    expect(validateSalaryInput(validInput, context)).toEqual({
      amount: 120_000,
      currencyCode: 'USD',
      effectiveDate: '2026-06-01',
      changeType: 'raise',
      note: 'Annual review',
    });
  });

  it('stores an empty note as null', () => {
    expect(validateSalaryInput({ ...validInput, note: ' ' }, context).note).toBeNull();
  });

  it('allows a record effective today', () => {
    expect(() => validateSalaryInput({ ...validInput, effectiveDate: '2026-06-30' }, context)).not.toThrow();
  });

  it.each([[0], [-5], [1000.5], ['120000'], [undefined]])('rejects amount %p', (amount) => {
    expect(fieldErrorsFor({ ...validInput, amount })).toHaveProperty('amount');
  });

  it('rejects a currency with no FX rate', () => {
    expect(fieldErrorsFor({ ...validInput, currencyCode: 'CHF' })).toHaveProperty('currencyCode');
  });

  it('rejects future-dated records', () => {
    expect(fieldErrorsFor({ ...validInput, effectiveDate: '2026-07-01' })).toEqual({
      effectiveDate: 'cannot be in the future',
    });
  });

  it('rejects records dated before the hire date', () => {
    expect(fieldErrorsFor({ ...validInput, effectiveDate: '2020-03-14' })).toEqual({
      effectiveDate: 'cannot be before the hire date',
    });
  });

  it('rejects impossible calendar dates', () => {
    expect(fieldErrorsFor({ ...validInput, effectiveDate: '2026-02-30' })).toHaveProperty('effectiveDate');
  });

  it("does not let HR create 'hire' records", () => {
    expect(fieldErrorsFor({ ...validInput, changeType: 'hire' })).toHaveProperty('changeType');
  });

  it('reports every invalid field at once', () => {
    expect(Object.keys(fieldErrorsFor({})).sort()).toEqual(
      ['amount', 'changeType', 'currencyCode', 'effectiveDate'],
    );
  });
});

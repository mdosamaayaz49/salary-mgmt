import { isIsoDate } from '../dates';
import { RECORDABLE_CHANGE_TYPES, type RecordableChangeType } from '../domain';
import { ValidationError, type FieldErrors } from '../errors';

export interface NewSalaryRecord {
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  changeType: RecordableChangeType;
  note: string | null;
}

export interface ValidationContext {
  today: string;
  hireDate: string;
  knownCurrencies: ReadonlySet<string>;
}

/** Turns an untrusted request body into a NewSalaryRecord, or throws ValidationError. */
export function validateSalaryInput(raw: unknown, context: ValidationContext): NewSalaryRecord {
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const { amount, currencyCode, effectiveDate, changeType, note } = body;

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    errors.amount = 'must be a positive whole number';
  }

  if (typeof currencyCode !== 'string' || !context.knownCurrencies.has(currencyCode)) {
    errors.currencyCode = 'must be a currency with a configured FX rate';
  }

  if (!isIsoDate(effectiveDate)) {
    errors.effectiveDate = 'must be a date in YYYY-MM-DD format';
  } else if (effectiveDate > context.today) {
    errors.effectiveDate = 'cannot be in the future';
  } else if (effectiveDate < context.hireDate) {
    errors.effectiveDate = 'cannot be before the hire date';
  }

  if (!RECORDABLE_CHANGE_TYPES.includes(changeType as RecordableChangeType)) {
    errors.changeType = `must be one of: ${RECORDABLE_CHANGE_TYPES.join(', ')}`;
  }

  if (note !== undefined && note !== null && typeof note !== 'string') {
    errors.note = 'must be text';
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  return {
    amount: amount as number,
    currencyCode: currencyCode as string,
    effectiveDate: effectiveDate as string,
    changeType: changeType as RecordableChangeType,
    note: trimmedNote === '' ? null : trimmedNote,
  };
}

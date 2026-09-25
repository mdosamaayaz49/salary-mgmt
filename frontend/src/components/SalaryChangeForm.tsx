import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { ApiError, type NewSalaryRecord } from '../api';

interface SalaryChangeFormProps {
  currencies: string[];
  defaultCurrency: string;
  /** Injected (YYYY-MM-DD) so behaviour never depends on the real clock in tests. */
  today: string;
  onSubmit: (record: NewSalaryRecord) => Promise<void>;
}

type FieldErrors = Record<string, string>;

interface FormValues {
  amount: string;
  currencyCode: string;
  effectiveDate: string;
  changeType: NewSalaryRecord['changeType'];
  note: string;
}

function validate(values: FormValues, today: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^\d+$/.test(values.amount) || Number(values.amount) <= 0) {
    errors.amount = 'Enter a positive whole number';
  }
  if (!values.effectiveDate) {
    errors.effectiveDate = 'Choose a date';
  } else if (values.effectiveDate > today) {
    errors.effectiveDate = 'Cannot be in the future';
  }
  return errors;
}

export function SalaryChangeForm({ currencies, defaultCurrency, today, onSubmit }: SalaryChangeFormProps) {
  const [values, setValues] = useState<FormValues>({
    amount: '',
    currencyCode: defaultCurrency,
    effectiveDate: today,
    changeType: 'raise',
    note: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const clientErrors = validate(values, today);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: Number(values.amount),
        currencyCode: values.currencyCode,
        effectiveDate: values.effectiveDate,
        changeType: values.changeType,
        note: values.note.trim() || undefined,
      });
      setValues((current) => ({ ...current, amount: '', note: '' }));
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      } else {
        setSubmitError(error instanceof Error ? error.message : 'Could not save the salary change');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          id="salary-amount"
          label="New annual salary"
          value={values.amount}
          onChange={(event) => update('amount', event.target.value)}
          error={Boolean(errors.amount)}
          helperText={errors.amount}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          sx={{ flex: 1 }}
        />
        <TextField
          id="salary-currency"
          select
          label="Currency"
          value={values.currencyCode}
          onChange={(event) => update('currencyCode', event.target.value)}
          error={Boolean(errors.currencyCode)}
          helperText={errors.currencyCode}
          sx={{ minWidth: 120 }}
        >
          {currencies.map((currency) => (
            <MenuItem key={currency} value={currency}>
              {currency}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          id="salary-effective-date"
          type="date"
          label="Effective date"
          value={values.effectiveDate}
          onChange={(event) => update('effectiveDate', event.target.value)}
          error={Boolean(errors.effectiveDate)}
          helperText={errors.effectiveDate}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today } }}
          sx={{ flex: 1 }}
        />
        <TextField
          id="salary-change-type"
          select
          label="Change type"
          value={values.changeType}
          onChange={(event) => update('changeType', event.target.value as FormValues['changeType'])}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="raise">Raise</MenuItem>
          <MenuItem value="correction">Correction</MenuItem>
        </TextField>
      </Stack>

      <TextField
        id="salary-note"
        label="Note (optional)"
        value={values.note}
        onChange={(event) => update('note', event.target.value)}
      />

      {submitError && <Alert severity="error">{submitError}</Alert>}

      <Button type="submit" variant="contained" disabled={submitting}>
        Record salary change
      </Button>
    </Stack>
  );
}

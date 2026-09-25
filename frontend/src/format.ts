/** Whole units only: salaries are stored without decimals. */
export function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUsd(amount: number): string {
  return formatMoney(amount, 'USD');
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Today's date as YYYY-MM-DD in the browser's time zone. */
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

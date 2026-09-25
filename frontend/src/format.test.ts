import { formatCount, formatMoney, formatUsd } from './format';

describe('formatMoney', () => {
  it('formats whole amounts with the currency symbol and no decimals', () => {
    expect(formatUsd(1_234_567)).toBe('$1,234,567');
    expect(formatMoney(2_400_000, 'INR')).toBe('₹2,400,000');
    expect(formatMoney(8_500_000, 'JPY')).toBe('¥8,500,000');
  });

  it('rounds fractional USD values to whole dollars', () => {
    expect(formatUsd(63_501.6)).toBe('$63,502');
  });
});

describe('formatCount', () => {
  it('adds thousands separators', () => {
    expect(formatCount(10_000)).toBe('10,000');
  });
});

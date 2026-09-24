import type { JobLevel } from '../domain';

/**
 * payIndex: typical local pay relative to the US for the same role, in USD terms.
 * weight: share of headcount. Numbers are illustrative, chosen to look plausible.
 */
export const COUNTRIES = [
  { code: 'US', currency: 'USD', payIndex: 1.0, weight: 30 },
  { code: 'IN', currency: 'INR', payIndex: 0.3, weight: 25 },
  { code: 'GB', currency: 'GBP', payIndex: 0.8, weight: 12 },
  { code: 'DE', currency: 'EUR', payIndex: 0.8, weight: 10 },
  { code: 'SG', currency: 'SGD', payIndex: 0.75, weight: 8 },
  { code: 'JP', currency: 'JPY', payIndex: 0.65, weight: 8 },
  { code: 'BR', currency: 'BRL', payIndex: 0.35, weight: 7 },
] as const;

export const DEPARTMENTS = [
  { name: 'Engineering', payMultiplier: 1.15, weight: 35 },
  { name: 'Sales', payMultiplier: 1.0, weight: 20 },
  { name: 'Operations', payMultiplier: 0.9, weight: 15 },
  { name: 'Customer Support', payMultiplier: 0.8, weight: 15 },
  { name: 'Finance', payMultiplier: 1.05, weight: 8 },
  { name: 'People', payMultiplier: 0.95, weight: 7 },
] as const;

export const LEVELS: ReadonlyArray<{ level: JobLevel; baseUsd: number; weight: number }> = [
  { level: 'L1', baseUsd: 55_000, weight: 30 },
  { level: 'L2', baseUsd: 75_000, weight: 30 },
  { level: 'L3', baseUsd: 100_000, weight: 22 },
  { level: 'L4', baseUsd: 135_000, weight: 12 },
  { level: 'L5', baseUsd: 180_000, weight: 6 },
];

export const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rohan', 'Ananya', 'James', 'Emily', 'Michael', 'Sarah', 'Oliver', 'Amelia',
  'Lukas', 'Hannah', 'Felix', 'Mia', 'Wei', 'Mei', 'Arjun', 'Kavya', 'Haruto', 'Yui',
  'Sota', 'Hina', 'Lucas', 'Beatriz', 'Gabriel', 'Julia', 'Daniel', 'Grace', 'Noah', 'Zara',
];

export const LAST_NAMES = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Smith', 'Johnson', 'Williams', 'Brown', 'Taylor', 'Evans',
  'Müller', 'Schmidt', 'Fischer', 'Weber', 'Tan', 'Lim', 'Ng', 'Sato', 'Suzuki', 'Tanaka',
  'Silva', 'Santos', 'Oliveira', 'Costa', 'Garcia', 'Martin', 'Khan', 'Chen', 'Nguyen', 'Kim',
];

export const HIRE_DATE_RANGE_START = '2015-01-01';

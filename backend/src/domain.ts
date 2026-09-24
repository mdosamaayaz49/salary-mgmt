export const JOB_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export type JobLevel = (typeof JOB_LEVELS)[number];

/** 'hire' is only written by the seed; HR records raises and corrections. */
export const RECORDABLE_CHANGE_TYPES = ['raise', 'correction'] as const;
export type RecordableChangeType = (typeof RECORDABLE_CHANGE_TYPES)[number];
export type ChangeType = 'hire' | RecordableChangeType;

export interface CurrentSalary {
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  amountUsd: number;
}

export interface EmployeeSummary {
  id: number;
  fullName: string;
  countryCode: string;
  department: string;
  jobLevel: JobLevel;
  hireDate: string;
  currentSalary: CurrentSalary;
}

export interface SalaryRecord {
  id: number;
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  changeType: ChangeType;
  note: string | null;
  amountUsd: number;
  createdAt: string;
}

export interface EmployeeDetail extends EmployeeSummary {
  history: SalaryRecord[];
}

/** USD figures are computed from REAL rates; we report whole dollars. */
export function roundUsd(value: number): number {
  return Math.round(value);
}

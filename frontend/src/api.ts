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
  jobLevel: string;
  hireDate: string;
  currentSalary: CurrentSalary;
}

export interface SalaryRecord {
  id: number;
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  changeType: 'hire' | 'raise' | 'correction';
  note: string | null;
  amountUsd: number;
  createdAt: string;
}

export interface EmployeeDetail extends EmployeeSummary {
  history: SalaryRecord[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  departments: string[];
  countries: string[];
  jobLevels: string[];
  currencies: string[];
  fxAsOf: string | null;
}

/** Empty string means "no filter" — matches how MUI selects represent "All". */
export interface EmployeeFilters {
  search: string;
  department: string;
  country: string;
  jobLevel: string;
}

export type StatsFilters = Omit<EmployeeFilters, 'search'>;

export type GroupBy = 'department' | 'country' | 'jobLevel';

export interface SalaryStatsRow {
  group: string;
  headcount: number;
  averageUsd: number;
  medianUsd: number;
  totalPayrollUsd: number;
}

export interface SalaryStatsResponse {
  groupBy: GroupBy;
  currency: 'USD';
  rows: SalaryStatsRow[];
}

export interface NewSalaryRecord {
  amount: number;
  currencyCode: string;
  effectiveDate: string;
  changeType: 'raise' | 'correction';
  note?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface ErrorBody {
  message?: string;
  fieldErrors?: Record<string, string>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      error.message ?? `Request failed with status ${response.status}`,
      error.fieldErrors,
    );
  }
  return body as T;
}

function toQueryString(params: Record<string, string | number>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** All HTTP calls in one object, so components stay declarative and tests can stub one method. */
export const api = {
  getFilterOptions(): Promise<FilterOptions> {
    return request('/api/meta');
  },

  listEmployees(filters: EmployeeFilters, page: number, pageSize: number): Promise<Page<EmployeeSummary>> {
    return request(`/api/employees${toQueryString({ ...filters, page, pageSize })}`);
  },

  getEmployee(id: number): Promise<EmployeeDetail> {
    return request(`/api/employees/${id}`);
  },

  addSalaryRecord(employeeId: number, record: NewSalaryRecord): Promise<SalaryRecord> {
    return request(`/api/employees/${employeeId}/salaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  },

  getSalaryStats(groupBy: GroupBy, filters: StatsFilters): Promise<SalaryStatsResponse> {
    return request(`/api/reports/salary-stats${toQueryString({ groupBy, ...filters })}`);
  },
};

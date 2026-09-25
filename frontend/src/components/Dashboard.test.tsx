import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { api, type FilterOptions, type SalaryStatsRow } from '../api';
import { Dashboard } from './Dashboard';

const filterOptions: FilterOptions = {
  departments: ['Engineering', 'Sales'],
  countries: ['IN', 'US'],
  jobLevels: ['L1', 'L2', 'L3', 'L4', 'L5'],
  currencies: ['INR', 'USD'],
  fxAsOf: '2026-01-01',
};

const statsResponse = (rows: SalaryStatsRow[]) => ({ groupBy: 'department' as const, currency: 'USD' as const, rows });

afterEach(() => vi.restoreAllMocks());

describe('Dashboard', () => {
  it('shows USD statistics per group, overall totals, and the FX assumption', async () => {
    vi.spyOn(api, 'getSalaryStats').mockResolvedValue(
      statsResponse([
        { group: 'Engineering', headcount: 2, averageUsd: 45_000, medianUsd: 44_000, totalPayrollUsd: 90_000 },
        { group: 'Sales', headcount: 1, averageUsd: 90_000, medianUsd: 90_000, totalPayrollUsd: 90_000 },
      ]),
    );

    render(<Dashboard filterOptions={filterOptions} />);

    const table = await screen.findByRole('table', { name: 'Salary statistics' });
    const engineeringRow = within(table).getByText('Engineering').closest('tr')!;
    expect(within(engineeringRow).getByText('$45,000')).toBeInTheDocument();
    expect(within(engineeringRow).getByText('$44,000')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // total headcount
    expect(screen.getByText('$180,000')).toBeInTheDocument(); // total payroll
    expect(screen.getByText(/All figures are current annual salaries converted to USD using fixed FX rates/)).toBeInTheDocument();
  });

  it('regroups the statistics by country', async () => {
    const getSalaryStats = vi.spyOn(api, 'getSalaryStats').mockResolvedValue(statsResponse([]));
    const user = userEvent.setup();
    render(<Dashboard filterOptions={filterOptions} />);

    const groupBy = screen.getByRole('group', { name: 'Group by' });
    await user.click(within(groupBy).getByRole('button', { name: 'Country' }));

    await waitFor(() =>
      expect(getSalaryStats).toHaveBeenLastCalledWith('country', { department: '', country: '', jobLevel: '' }),
    );
  });
});

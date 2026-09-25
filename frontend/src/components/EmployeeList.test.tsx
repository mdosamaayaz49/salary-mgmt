import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { api, type EmployeeSummary, type FilterOptions } from '../api';
import { EmployeeList } from './EmployeeList';

const filterOptions: FilterOptions = {
  departments: ['Engineering', 'Sales'],
  countries: ['IN', 'US'],
  jobLevels: ['L1', 'L2', 'L3', 'L4', 'L5'],
  currencies: ['INR', 'USD'],
  fxAsOf: '2026-01-01',
};

const priya: EmployeeSummary = {
  id: 7,
  fullName: 'Priya Sharma',
  countryCode: 'IN',
  department: 'Engineering',
  jobLevel: 'L3',
  hireDate: '2021-04-01',
  currentSalary: { amount: 2_400_000, currencyCode: 'INR', effectiveDate: '2023-04-01', amountUsd: 28_800 },
};

const page = (items: EmployeeSummary[]) => ({ items, total: items.length, page: 1, pageSize: 25 });

afterEach(() => vi.restoreAllMocks());

describe('EmployeeList', () => {
  it('shows each employee with their local salary and its USD equivalent', async () => {
    vi.spyOn(api, 'listEmployees').mockResolvedValue(page([priya]));

    render(<EmployeeList filterOptions={filterOptions} onSelectEmployee={vi.fn()} refreshKey={0} />);

    expect(await screen.findByRole('button', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(screen.getByText('₹2,400,000')).toBeInTheDocument();
    expect(screen.getByText('$28,800')).toBeInTheDocument();
  });

  it('searches by name, starting again from the first page', async () => {
    const listEmployees = vi.spyOn(api, 'listEmployees').mockResolvedValue(page([]));
    const user = userEvent.setup();
    render(<EmployeeList filterOptions={filterOptions} onSelectEmployee={vi.fn()} refreshKey={0} />);

    await user.type(screen.getByLabelText('Search by name'), 'pri');

    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(
        { search: 'pri', department: '', country: '', jobLevel: '' },
        1,
        25,
      ),
    );
    expect(await screen.findByText('No employees match these filters.')).toBeInTheDocument();
  });

  it('opens an employee when their name is clicked', async () => {
    vi.spyOn(api, 'listEmployees').mockResolvedValue(page([priya]));
    const onSelectEmployee = vi.fn();
    const user = userEvent.setup();
    render(<EmployeeList filterOptions={filterOptions} onSelectEmployee={onSelectEmployee} refreshKey={0} />);

    await user.click(await screen.findByRole('button', { name: 'Priya Sharma' }));

    expect(onSelectEmployee).toHaveBeenCalledWith(7);
  });
});

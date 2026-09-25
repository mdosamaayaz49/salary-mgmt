import {
  Alert,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, type EmployeeFilters, type EmployeeSummary, type FilterOptions, type Page } from '../api';
import { formatMoney, formatUsd } from '../format';
import { FilterSelect } from './FilterSelect';

interface EmployeeListProps {
  filterOptions: FilterOptions;
  onSelectEmployee: (id: number) => void;
  /** Bump to refetch the current page, e.g. after a salary change. */
  refreshKey: number;
}

const NO_FILTERS: EmployeeFilters = { search: '', department: '', country: '', jobLevel: '' };

export function EmployeeList({ filterOptions, onSelectEmployee, refreshKey }: EmployeeListProps) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(0); // MUI pagination is 0-based; the API is 1-based
  const [pageSize, setPageSize] = useState(25);
  const [result, setResult] = useState<Page<EmployeeSummary> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isStale = false; // ignore responses to requests superseded by newer typing
    setLoading(true);
    api
      .listEmployees(filters, page + 1, pageSize)
      .then((data) => {
        if (isStale) return;
        setResult(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!isStale) setError(err.message);
      })
      .finally(() => {
        if (!isStale) setLoading(false);
      });
    return () => {
      isStale = true;
    };
  }, [filters, page, pageSize, refreshKey]);

  function updateFilter(key: keyof EmployeeFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  return (
    <Paper>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2 }}>
        <TextField
          id="employee-search"
          size="small"
          label="Search by name"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          sx={{ flex: 1 }}
        />
        <FilterSelect
          id="employee-filter-department"
          label="Department"
          value={filters.department}
          options={filterOptions.departments}
          onChange={(value) => updateFilter('department', value)}
        />
        <FilterSelect
          id="employee-filter-country"
          label="Country"
          value={filters.country}
          options={filterOptions.countries}
          onChange={(value) => updateFilter('country', value)}
        />
        <FilterSelect
          id="employee-filter-level"
          label="Job level"
          value={filters.jobLevel}
          options={filterOptions.jobLevels}
          onChange={(value) => updateFilter('jobLevel', value)}
        />
      </Stack>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Level</TableCell>
              <TableCell align="right">Current salary</TableCell>
              <TableCell align="right">USD equivalent</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result?.items.map((employee) => (
              <TableRow key={employee.id} hover>
                <TableCell>
                  <Link component="button" onClick={() => onSelectEmployee(employee.id)}>
                    {employee.fullName}
                  </Link>
                </TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.countryCode}</TableCell>
                <TableCell>{employee.jobLevel}</TableCell>
                <TableCell align="right">
                  {formatMoney(employee.currentSalary.amount, employee.currentSalary.currencyCode)}
                </TableCell>
                <TableCell align="right">{formatUsd(employee.currentSalary.amountUsd)}</TableCell>
              </TableRow>
            ))}
            {result?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No employees match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={result?.total ?? 0}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setPageSize(Number(event.target.value));
          setPage(0);
        }}
      />
    </Paper>
  );
}

import {
  Alert,
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, type FilterOptions, type GroupBy, type SalaryStatsRow, type StatsFilters } from '../api';
import { formatCount, formatUsd } from '../format';
import { FilterSelect } from './FilterSelect';

interface DashboardProps {
  filterOptions: FilterOptions;
}

const NO_FILTERS: StatsFilters = { department: '', country: '', jobLevel: '' };

export function Dashboard({ filterOptions }: DashboardProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('department');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [rows, setRows] = useState<SalaryStatsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isStale = false;
    api
      .getSalaryStats(groupBy, filters)
      .then((response) => {
        if (isStale) return;
        setRows(response.rows);
        setError(null);
      })
      .catch((err: Error) => !isStale && setError(err.message));
    return () => {
      isStale = true;
    };
  }, [groupBy, filters]);

  const totalHeadcount = rows?.reduce((sum, row) => sum + row.headcount, 0) ?? 0;
  const totalPayroll = rows?.reduce((sum, row) => sum + row.totalPayrollUsd, 0) ?? 0;
  const highestAverage = Math.max(1, ...(rows ?? []).map((row) => row.averageUsd));

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={groupBy}
            onChange={(_event, value: GroupBy | null) => value && setGroupBy(value)}
            aria-label="Group by"
          >
            <ToggleButton value="department">Department</ToggleButton>
            <ToggleButton value="country">Country</ToggleButton>
            <ToggleButton value="jobLevel">Job level</ToggleButton>
          </ToggleButtonGroup>
          <FilterSelect
            id="stats-filter-department"
            label="Department"
            value={filters.department}
            options={filterOptions.departments}
            onChange={(value) => setFilters((current) => ({ ...current, department: value }))}
          />
          <FilterSelect
            id="stats-filter-country"
            label="Country"
            value={filters.country}
            options={filterOptions.countries}
            onChange={(value) => setFilters((current) => ({ ...current, country: value }))}
          />
          <FilterSelect
            id="stats-filter-level"
            label="Job level"
            value={filters.jobLevel}
            options={filterOptions.jobLevels}
            onChange={(value) => setFilters((current) => ({ ...current, jobLevel: value }))}
          />
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <SummaryCard label="Headcount" value={formatCount(totalHeadcount)} />
        <SummaryCard label="Annual payroll (USD)" value={formatUsd(totalPayroll)} />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {!rows && !error && <LinearProgress />}

      {rows && (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="Salary statistics">
            <TableHead>
              <TableRow>
                <TableCell>Group</TableCell>
                <TableCell align="right">Headcount</TableCell>
                <TableCell align="right">Average</TableCell>
                <TableCell align="right">Median</TableCell>
                <TableCell align="right">Total payroll</TableCell>
                <TableCell sx={{ width: '25%' }}>Average vs. highest</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.group}>
                  <TableCell>{row.group}</TableCell>
                  <TableCell align="right">{formatCount(row.headcount)}</TableCell>
                  <TableCell align="right">{formatUsd(row.averageUsd)}</TableCell>
                  <TableCell align="right">{formatUsd(row.medianUsd)}</TableCell>
                  <TableCell align="right">{formatUsd(row.totalPayrollUsd)}</TableCell>
                  <TableCell>
                    <LinearProgress variant="determinate" value={(row.averageUsd / highestAverage) * 100} />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No employees match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary">
        All figures are current annual salaries converted to USD using fixed FX rates.
      </Typography>
    </Stack>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ p: 2, flex: 1 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Box>
        <Typography variant="h5">{value}</Typography>
      </Box>
    </Paper>
  );
}

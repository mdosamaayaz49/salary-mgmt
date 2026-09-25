import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { api, type EmployeeDetail, type NewSalaryRecord } from '../api';
import { formatMoney, formatUsd } from '../format';
import { SalaryChangeForm } from './SalaryChangeForm';

interface EmployeeDetailDialogProps {
  employeeId: number | null;
  currencies: string[];
  today: string;
  onClose: () => void;
  onSalaryRecorded: () => void;
}

const CHANGE_TYPE_LABELS = { hire: 'Hire', raise: 'Raise', correction: 'Correction' } as const;

export function EmployeeDetailDialog({
  employeeId,
  currencies,
  today,
  onClose,
  onSalaryRecorded,
}: EmployeeDetailDialogProps) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId === null) return;
    let isStale = false;
    setEmployee(null);
    setError(null);
    api
      .getEmployee(employeeId)
      .then((data) => !isStale && setEmployee(data))
      .catch((err: Error) => !isStale && setError(err.message));
    return () => {
      isStale = true;
    };
  }, [employeeId]);

  async function recordSalaryChange(record: NewSalaryRecord) {
    if (employeeId === null) return;
    await api.addSalaryRecord(employeeId, record);
    setEmployee(await api.getEmployee(employeeId));
    onSalaryRecorded();
  }

  return (
    <Dialog open={employeeId !== null} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{employee?.fullName ?? 'Employee'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!employee && !error && <CircularProgress />}
        {employee && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={employee.department} />
              <Chip label={employee.countryCode} />
              <Chip label={employee.jobLevel} />
              <Chip label={`Hired ${employee.hireDate}`} variant="outlined" />
            </Stack>

            <Box>
              <Typography variant="overline">Current salary</Typography>
              <Typography variant="h4">
                {formatMoney(employee.currentSalary.amount, employee.currentSalary.currencyCode)}
              </Typography>
              <Typography color="text.secondary">
                ≈ {formatUsd(employee.currentSalary.amountUsd)} · effective {employee.currentSalary.effectiveDate}
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>
                Salary history
              </Typography>
              <Table size="small" aria-label="Salary history">
                <TableHead>
                  <TableRow>
                    <TableCell>Effective</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">USD</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employee.history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.effectiveDate}</TableCell>
                      <TableCell>{CHANGE_TYPE_LABELS[record.changeType]}</TableCell>
                      <TableCell align="right">{formatMoney(record.amount, record.currencyCode)}</TableCell>
                      <TableCell align="right">{formatUsd(record.amountUsd)}</TableCell>
                      <TableCell>{record.note ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6">Record a salary change</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                History is never edited. A record dated before the current one is kept for the audit
                trail but does not change the current salary.
              </Typography>
              <SalaryChangeForm
                key={employee.id}
                currencies={currencies}
                defaultCurrency={employee.currentSalary.currencyCode}
                today={today}
                onSubmit={recordSalaryChange}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

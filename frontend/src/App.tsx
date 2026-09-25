import { Alert, AppBar, Box, CircularProgress, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { api, type FilterOptions } from './api';
import { Dashboard } from './components/Dashboard';
import { EmployeeDetailDialog } from './components/EmployeeDetailDialog';
import { EmployeeList } from './components/EmployeeList';
import { todayIso } from './format';

type View = 'employees' | 'dashboard';

export function App() {
  const [view, setView] = useState<View>('employees');
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [today] = useState(todayIso);

  useEffect(() => {
    api
      .getFilterOptions()
      .then(setFilterOptions)
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Salary Management
          </Typography>
        </Toolbar>
        <Tabs
          value={view}
          onChange={(_event, value: View) => setView(value)}
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab value="employees" label="Employees" />
          <Tab value="dashboard" label="Pay dashboard" />
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {loadError && <Alert severity="error">Could not reach the API: {loadError}</Alert>}
        {!filterOptions && !loadError && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}
        {filterOptions && view === 'employees' && (
          <EmployeeList
            filterOptions={filterOptions}
            onSelectEmployee={setSelectedEmployeeId}
            refreshKey={refreshKey}
          />
        )}
        {filterOptions && view === 'dashboard' && <Dashboard filterOptions={filterOptions} />}
      </Container>

      <EmployeeDetailDialog
        employeeId={selectedEmployeeId}
        currencies={filterOptions?.currencies ?? []}
        today={today}
        onClose={() => setSelectedEmployeeId(null)}
        onSalaryRecorded={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

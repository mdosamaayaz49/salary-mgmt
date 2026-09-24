import express, { type NextFunction, type Request, type Response } from 'express';
import type { Db } from './db';
import { findEmployee, listEmployees } from './employees/employeeQueries';
import type { EmployeeFilters } from './employees/filters';
import { NotFoundError, ValidationError } from './errors';
import { getFilterOptions } from './meta';
import { parsePageRequest } from './pagination';
import { getSalaryStats, isGroupBy, GROUP_BY_COLUMNS } from './reports/salaryStats';
import { addSalaryRecord, type Clock } from './salaries/addSalaryRecord';

export interface AppDependencies {
  db: Db;
  clock: Clock;
}

export function createApp({ db, clock }: AppDependencies) {
  const app = express();
  app.use(express.json());

  app.get('/api/meta', (_req, res) => {
    res.json(getFilterOptions(db));
  });

  app.get('/api/employees', (req, res) => {
    const pageRequest = parsePageRequest(req.query);
    res.json(listEmployees(db, readFilters(req.query), pageRequest));
  });

  app.get('/api/employees/:id', (req, res) => {
    const id = parseId(req.params.id);
    const employee = findEmployee(db, id);
    if (!employee) throw new NotFoundError(`Employee ${id} not found`);
    res.json(employee);
  });

  app.post('/api/employees/:id/salaries', (req, res) => {
    const record = addSalaryRecord(db, parseId(req.params.id), req.body, clock);
    res.status(201).json(record);
  });

  app.get('/api/reports/salary-stats', (req, res) => {
    const groupBy = req.query.groupBy;
    if (!isGroupBy(groupBy)) {
      throw new ValidationError({
        groupBy: `must be one of: ${Object.keys(GROUP_BY_COLUMNS).join(', ')}`,
      });
    }
    res.json({
      groupBy,
      currency: 'USD',
      rows: getSalaryStats(db, groupBy, readFilters(req.query)),
    });
  });

  app.use(handleErrors);
  return app;
}

function readFilters(query: Request['query']): EmployeeFilters {
  return {
    search: readString(query.search),
    department: readString(query.department),
    country: readString(query.country),
    jobLevel: readString(query.jobLevel),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new NotFoundError(`Employee ${raw} not found`);
  return id;
}

function handleErrors(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: 'validation_failed', fieldErrors: error.fieldErrors });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ error: 'not_found', message: error.message });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'internal_error' });
}


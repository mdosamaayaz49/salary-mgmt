import type { Db } from '../db';
import { roundUsd } from '../domain';
import { buildEmployeeWhere, type EmployeeFilters } from '../employees/filters';

/** Whitelist: API group-by names -> SQL columns. Never interpolate user input directly. */
export const GROUP_BY_COLUMNS = {
  department: 'department',
  country: 'country_code',
  jobLevel: 'job_level',
} as const;

export type GroupBy = keyof typeof GROUP_BY_COLUMNS;

export function isGroupBy(value: unknown): value is GroupBy {
  return typeof value === 'string' && Object.hasOwn(GROUP_BY_COLUMNS, value);
}

export interface SalaryStatsRow {
  group: string;
  headcount: number;
  averageUsd: number;
  medianUsd: number;
  totalPayrollUsd: number;
}

/**
 * Headcount, average, median and total payroll of CURRENT salaries, normalized to USD,
 * grouped by one dimension and optionally filtered (e.g. Engineering in India, by level).
 *
 * All math happens in SQL. SQLite has no MEDIAN(), so we rank salaries within each group
 * with window functions and average the middle one (odd count) or two (even count).
 */
export function getSalaryStats(db: Db, groupBy: GroupBy, filters: EmployeeFilters): SalaryStatsRow[] {
  const groupColumn = GROUP_BY_COLUMNS[groupBy];
  const where = buildEmployeeWhere(filters);

  const rows = db
    .prepare(
      `WITH filtered AS (
         SELECT ${groupColumn} AS grp, amount_usd
         FROM current_salaries
         ${where.sql}
       ),
       ranked AS (
         SELECT grp, amount_usd,
                ROW_NUMBER() OVER (PARTITION BY grp ORDER BY amount_usd) AS position,
                COUNT(*)     OVER (PARTITION BY grp)                     AS group_size
         FROM filtered
       ),
       medians AS (
         SELECT grp, AVG(amount_usd) AS median_usd
         FROM ranked
         WHERE position IN ((group_size + 1) / 2, (group_size + 2) / 2)
         GROUP BY grp
       )
       SELECT f.grp              AS grp,
              COUNT(*)           AS headcount,
              AVG(f.amount_usd)  AS average_usd,
              m.median_usd       AS median_usd,
              SUM(f.amount_usd)  AS total_usd
       FROM filtered f
       JOIN medians m ON m.grp = f.grp
       GROUP BY f.grp
       ORDER BY f.grp`,
    )
    .all(...where.params) as Array<{
    grp: string;
    headcount: number;
    average_usd: number;
    median_usd: number;
    total_usd: number;
  }>;

  return rows.map((row) => ({
    group: row.grp,
    headcount: row.headcount,
    averageUsd: roundUsd(row.average_usd),
    medianUsd: roundUsd(row.median_usd),
    totalPayrollUsd: roundUsd(row.total_usd),
  }));
}

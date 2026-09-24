export interface EmployeeFilters {
  search?: string;
  department?: string;
  country?: string;
  jobLevel?: string;
}

export interface WhereClause {
  /** Either '' or a complete 'WHERE ...' clause using positional '?' params. */
  sql: string;
  params: string[];
}

/**
 * Builds a WHERE clause against the current_salaries view.
 * Values are always bound as parameters; only fixed column names appear in the SQL.
 */
export function buildEmployeeWhere(filters: EmployeeFilters): WhereClause {
  const conditions: string[] = [];
  const params: string[] = [];

  const search = filters.search?.trim();
  if (search) {
    conditions.push("full_name LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLikePattern(search)}%`);
  }
  if (filters.department) {
    conditions.push('department = ?');
    params.push(filters.department);
  }
  if (filters.country) {
    conditions.push('country_code = ?');
    params.push(filters.country);
  }
  if (filters.jobLevel) {
    conditions.push('job_level = ?');
    params.push(filters.jobLevel);
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/** So a search for "50%" matches the literal text instead of acting as a wildcard. */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

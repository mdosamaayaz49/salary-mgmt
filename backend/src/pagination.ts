import { ValidationError } from "./errors";

export interface PageRequest {
    page: number;
    pageSize: number;
}

export interface Page<T> extends PageRequest {
  items: T[];
  total: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePageRequest(raw: { page?: unknown; pageSize?: unknown }): PageRequest {
  const page = parsePositiveInt(raw.page, 1);
  const pageSize = parsePositiveInt(raw.pageSize, DEFAULT_PAGE_SIZE);

  const errors: Record<string, string> = {};
  if (page === null) errors.page = 'must be a positive integer';
  if (pageSize === null) errors.pageSize = 'must be a positive integer';
  else if (pageSize > MAX_PAGE_SIZE) errors.pageSize = `must be at most ${MAX_PAGE_SIZE}`;
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  return { page: page as number, pageSize: pageSize as number };
}

function parsePositiveInt(value: unknown, fallback: number): number | null {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

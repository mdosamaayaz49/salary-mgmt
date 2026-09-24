export interface Clock {
  /** Today's date as YYYY-MM-DD. */
  today(): string;
  /** Current instant as an ISO timestamp, recorded as created_at. */
  now(): string;
}
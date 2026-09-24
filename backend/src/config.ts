import path from 'node:path';

export const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'salary.db');
export const PORT = Number(process.env.PORT ?? 3001);

import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { DB_PATH, PORT } from './config';
import { openDb } from './db';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = openDb(DB_PATH);

const systemClock = {
  today: () => new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in the server's local time zone
  now: () => new Date().toISOString(),
};

createApp({ db, clock: systemClock }).listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

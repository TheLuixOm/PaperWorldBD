import { Pool } from 'pg';
import { env } from '../shared/env.js';

function buildPool() {
  if (env.DATABASE_URL) {
    return new Pool({
      connectionString: env.DATABASE_URL,
    });
  }

  return new Pool({
    host: env.PGHOST ?? 'localhost',
    port: env.PGPORT,
    user: env.PGUSER ?? 'postgres',
    password: env.PGPASSWORD,
    database: env.PGDATABASE ?? 'paperworld',
  });
}

export const pool = buildPool();

pool.on('error', (err: Error) => {
  // eslint-disable-next-line no-console
  console.error('[backend] PG pool error', err);
});

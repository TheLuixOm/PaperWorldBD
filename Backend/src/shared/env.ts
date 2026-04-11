import 'dotenv/config';

function num(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  PORT: num(process.env.PORT, 3001),
  DATABASE_URL: process.env.DATABASE_URL,
  PGHOST: process.env.PGHOST,
  PGPORT: num(process.env.PGPORT, 5432),
  PGUSER: process.env.PGUSER,
  PGPASSWORD: process.env.PGPASSWORD,
  PGDATABASE: process.env.PGDATABASE,
  JWT_SECRET: process.env.JWT_SECRET ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '',
} as const;

if (!env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[backend] JWT_SECRET vacío. Configúralo en Backend/.env');
}

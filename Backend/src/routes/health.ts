import { Router } from 'express';
import { query } from '../db/query.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await query('select 1 as ok');
    res.json({ ok: true, db: true, time: new Date().toISOString() });
  } catch (err) {
    const dev = (process.env.NODE_ENV ?? '').toLowerCase() !== 'production';
    const detail =
      dev && err && typeof err === 'object'
        ? {
            message: 'message' in err && typeof (err as { message?: unknown }).message === 'string'
              ? (err as { message: string }).message
              : 'DB connection error',
            code: 'code' in err && typeof (err as { code?: unknown }).code === 'string' ? (err as { code: string }).code : undefined,
          }
        : undefined;

    res.status(500).json({ ok: false, db: false, time: new Date().toISOString(), detail });
  }
});

import express from 'express';
import cors from 'cors';
import { env } from './shared/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { productosRouter } from './routes/productos.js';
import { inventarioRouter } from './routes/inventario.js';
import { ventasRouter } from './routes/ventas.js';
import { reportesRouter } from './routes/reportes.js';

export function buildApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Si usas proxy de Vite (recomendado), esto es opcional.
  // Igual lo dejamos configurable por si luego consumes la API sin proxy.
  if (env.CORS_ORIGIN) {
    app.use(
      cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
      }),
    );
  }

  app.get('/', (_req, res) => {
    res.json({ ok: true, name: 'paperworld-backend' });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/productos', productosRouter);
  app.use('/api/inventario', inventarioRouter);
  app.use('/api/ventas', ventasRouter);
  app.use('/api/reportes', reportesRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'NotFound' });
  });

  // error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[backend] unhandled error', err);

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      return res.status(500).json({ error: 'InternalServerError' });
    }

    const detail = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    const extra: Record<string, unknown> = {};
    if (err && typeof err === 'object') {
      const maybe = err as Record<string, unknown>;
      for (const key of ['code', 'detail', 'hint', 'constraint', 'table', 'column', 'schema', 'routine']) {
        if (key in maybe) {
          extra[key] = maybe[key];
        }
      }
    }

    return res.status(500).json({ error: 'InternalServerError', detail, ...extra });
  });

  return app;
}

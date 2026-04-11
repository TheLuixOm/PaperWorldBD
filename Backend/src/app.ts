import express from 'express';
import cors from 'cors';
import { env } from './shared/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { productosRouter } from './routes/productos.js';
import { inventarioRouter } from './routes/inventario.js';

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

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'NotFound' });
  });

  // error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[backend] unhandled error', err);
    res.status(500).json({ error: 'InternalServerError' });
  });

  return app;
}

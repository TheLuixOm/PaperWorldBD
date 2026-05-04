import express from 'express';
import cors from 'cors';
import { env } from './shared/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { registroRouter } from './routes/registro.js';
import { productosRouter } from './routes/productos.js';
import { inventarioRouter } from './routes/inventario.js';
import { proveedoresRouter } from './routes/proveedores.js';
import { ventasRouter } from './routes/ventas.js';
import { pedidosRouter } from './routes/pedidos.js';
import { reportesRouter } from './routes/reportes.js';

export function buildApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '5mb' }));


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
  app.use('/api/auth', registroRouter);
  app.use('/api/productos', productosRouter);
  app.use('/api/inventario', inventarioRouter);
  app.use('/api/proveedores', proveedoresRouter);
  app.use('/api/ventas', ventasRouter);
  app.use('/api/pedidos', pedidosRouter);
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

    if (
      err &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type?: unknown }).type === 'entity.too.large'
    ) {
      return res.status(413).json({
        error: 'PayloadTooLarge',
        detail: 'El cuerpo de la solicitud supera el límite permitido. Intenta con una imagen más pequeña.',
      });
    }

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

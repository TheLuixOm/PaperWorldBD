import { Router } from 'express';
import { query } from '../db/query.js';

export const reportesRouter = Router();

function toFechaDDMMYYYY(input: Date) {
  const dd = String(input.getDate()).padStart(2, '0');
  const mm = String(input.getMonth() + 1).padStart(2, '0');
  const yyyy = String(input.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

reportesRouter.get('/ventas', async (req, res, next) => {
  try {
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
    const offsetRaw = typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const result = await query<{
      id_orden: string;
      fecha: string | null;
      total: number;
      estado: string | null;
      cliente: string;
      items: number;
    }>(
      `
      select
        o.id_orden::text as id_orden,
        o.fecha::text as fecha,
        coalesce(o.total, 0)::float as total,
        o.estado as estado,
        o.usuario_id_usuario as cliente,
        coalesce(sum(lp.cantidad), 0)::int as items
      from orden o
      left join lista_productos lp on lp.orden_id_orden = o.id_orden
      group by o.id_orden
      order by o.id_orden desc
      limit $1 offset $2
      `,
      [limit, offset],
    );

    const items = result.rows.map((r) => {
      const fecha = r.fecha ? new Date(r.fecha) : null;
      return {
        id: `V-${r.id_orden}`,
        fecha: fecha ? toFechaDDMMYYYY(fecha) : '',
        cliente: r.cliente,
        items: Number.isFinite(r.items) ? r.items : 0,
        total: Number.isFinite(r.total) ? r.total : 0,
        estado: (r.estado ?? 'Procesado') as 'Procesado' | 'Reembolsado',
      };
    });

    res.json({ items, limit, offset });
  } catch (err) {
    next(err);
  }
});

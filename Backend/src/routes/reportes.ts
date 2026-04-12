import { Router } from 'express';
import { query, withTransaction } from '../db/query.js';

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
        coalesce(u.correo, u.nombre, o.usuario_id_usuario::text) as cliente,
        coalesce(sum(lp.cantidad), 0)::int as items
      from orden o
      left join usuario u on u.id_usuario = o.usuario_id_usuario
      left join lista_productos lp on lp.orden_id_orden = o.id_orden
      where o.estado = 'Procesado'
      group by o.id_orden, o.fecha, o.total, o.estado, o.usuario_id_usuario, u.correo, u.nombre
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

reportesRouter.get('/pedidos', async (req, res, next) => {
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
        coalesce(u.correo, u.nombre, o.usuario_id_usuario::text) as cliente,
        coalesce(sum(lp.cantidad), 0)::int as items
      from orden o
      left join usuario u on u.id_usuario = o.usuario_id_usuario
      left join lista_productos lp on lp.orden_id_orden = o.id_orden
      where o.estado = 'Pendiente'
      group by o.id_orden, o.fecha, o.total, o.estado, o.usuario_id_usuario, u.correo, u.nombre
      order by o.id_orden desc
      limit $1 offset $2
      `,
      [limit, offset],
    );

    const items = result.rows.map((r) => {
      const fecha = r.fecha ? new Date(r.fecha) : null;
      return {
        id: `P-${r.id_orden}`,
        fecha: fecha ? toFechaDDMMYYYY(fecha) : '',
        cliente: r.cliente,
        items: Number.isFinite(r.items) ? r.items : 0,
        total: Number.isFinite(r.total) ? r.total : 0,
        estado: (r.estado ?? 'Pendiente') as 'Pendiente' | 'En preparación' | 'Listo',
      };
    });

    res.json({ items, limit, offset });
  } catch (err) {
    next(err);
  }
});

function parseBigintLike(input: string): bigint | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^0-9-]/g, '');
  if (!digits) {
    return null;
  }

  try {
    return BigInt(digits);
  } catch {
    return null;
  }
}

reportesRouter.post('/pedidos/:id/finalizar', async (req, res, next) => {
  try {
    const idOrden = parseBigintLike(req.params.id);
    if (!idOrden) {
      return res.status(400).json({ error: 'BadRequest', detail: 'id inválido' });
    }

    const result = await withTransaction(async (client) => {
      const updated = await client.query<{ id_orden: string }>(
        `update orden set estado = 'Procesado'
         where id_orden = $1 and estado = 'Pendiente'
         returning id_orden::text as id_orden`,
        [idOrden.toString()],
      );

      if (!updated.rowCount) {
        return null;
      }

      // Mantener tabla reportes consistente (si tu esquema la usa).
      await client.query(
        `insert into reportes (fecha, tipo, orden_id_orden)
         select now(), 'venta', $1
         where not exists (
           select 1 from reportes r where r.orden_id_orden = $1 and r.tipo = 'venta'
         )`,
        [idOrden.toString()],
      );

      return updated.rows[0]!.id_orden;
    });

    if (!result) {
      return res.status(404).json({ error: 'NotFound' });
    }

    return res.json({ ok: true, id: `P-${result}`, ventaId: `V-${result}` });
  } catch (err) {
    next(err);
  }
});

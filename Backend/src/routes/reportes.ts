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

reportesRouter.get('/inventario', async (req, res, next) => {
  try {
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
    const offsetRaw = typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    // Por defecto: consideramos "cambio reciente" en últimos 7 días.
    const result = await query<{
      id_producto: string;
      producto: string;
      categoria: string;
      stock: number;
      minimo: number | null;
      ultimo_cambio: string | null;
      tipo: 'Stock bajo' | 'Cambio reciente';
      movimiento: 'Agregado' | 'Eliminado' | null;
    }>(
      `
      select
        p.id_producto::text as id_producto,
        coalesce(p.nombreproducto, '') as producto,
        coalesce(c.nombrecategoria, '') as categoria,
        coalesce(p.cantidad, 0) as stock,
        ci.stock_minimo as minimo,
        ci.fecha_actualizacion::text as ultimo_cambio,
        case
          when ci.stock_minimo is not null and coalesce(p.cantidad, 0) <= ci.stock_minimo then 'Stock bajo'
          when ci.fecha_actualizacion is not null and ci.fecha_actualizacion >= (now() - interval '7 days') then 'Cambio reciente'
          else null
        end as tipo,
        case
          when rm.tipo = 'inventario_eliminado' then 'Eliminado'
          when rm.tipo = 'inventario_agregado' then 'Agregado'
          else null
        end as movimiento
      from producto p
      left join cambios_inv ci on ci.id_actualizacion = p.inventario_id_actualizacion
      left join detalle_cat dc on dc.producto_id_producto = p.id_producto
      left join categoria c on c.id_categoria = dc.categoria_id_categoria
      left join lateral (
        select r.tipo
        from reportes r
        where r.inventario_id_actualizacion = p.inventario_id_actualizacion
          and r.tipo in ('inventario_agregado', 'inventario_eliminado')
        order by r.fecha desc
        limit 1
      ) rm on true
      where (
        (ci.stock_minimo is not null and coalesce(p.cantidad, 0) <= ci.stock_minimo)
        or (ci.fecha_actualizacion is not null and ci.fecha_actualizacion >= (now() - interval '7 days'))
      )
      order by
        case
          when ci.stock_minimo is not null and coalesce(p.cantidad, 0) <= ci.stock_minimo then 0
          else 1
        end asc,
        ci.fecha_actualizacion desc nulls last,
        p.id_producto asc
      limit $1 offset $2
      `,
      [limit, offset],
    );

    const items = result.rows
      .filter((r) => r.tipo === 'Stock bajo' || r.tipo === 'Cambio reciente')
      .map((r) => {
        const fecha = r.ultimo_cambio ? new Date(r.ultimo_cambio) : null;
        return {
          id: `I-${r.id_producto}`,
          producto: r.producto,
          categoria: r.categoria,
          stock: Number.isFinite(r.stock) ? r.stock : 0,
          minimo: r.minimo != null && Number.isFinite(r.minimo) ? r.minimo : 0,
          ultimoCambio: fecha ? toFechaDDMMYYYY(fecha) : '',
          tipo: r.tipo,
          movimiento: r.movimiento ?? undefined,
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

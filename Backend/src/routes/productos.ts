import { Router } from 'express';
import { query } from '../db/query.js';

export const productosRouter = Router();

productosRouter.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria.trim() : '';

    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
    const offsetRaw = typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

    const params: unknown[] = [];
    const where: string[] = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(
          p.nombreproducto ilike $${params.length}
          or c.nombrecategoria ilike $${params.length}
          or ('#' || lpad(p.id_producto::text, 4, '0')) ilike $${params.length}
          or p.id_producto::text ilike $${params.length}
        )`,
      );
    }

    if (categoria) {
      params.push(categoria);
      where.push(`c.nombrecategoria = $${params.length}`);
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      select
        ('#' || lpad(p.id_producto::text, 4, '0')) as id,
        p.nombreproducto as nombre,
        coalesce(c.nombrecategoria, '') as categoria,
        coalesce(p.precio, 0)::float as precio,
        coalesce(p.cantidad, 0) as cantidad,
        coalesce(p.imagen, '') as imagen,
        coalesce(v.vendidos, 0) as vendidos
      from (
        select distinct on (p0.id_producto)
          p0.id_producto,
          p0.inventario_id_actualizacion,
          p0.nombreproducto,
          p0.precio,
          p0.cantidad,
          p0.imagen
        from producto p0
        order by p0.id_producto asc, p0.inventario_id_actualizacion desc
      ) p
      left join detalle_cat dc
        on dc.producto_id_producto = p.id_producto
       and dc.producto_id_actualizacion = p.inventario_id_actualizacion
      left join categoria c
        on c.id_categoria = dc.categoria_id_categoria
      left join (
        select lp.producto_id_producto, lp.producto_inv_id_actualiz, sum(lp.cantidad)::int as vendidos
        from lista_productos lp
        group by lp.producto_id_producto, lp.producto_inv_id_actualiz
      ) v
        on v.producto_id_producto = p.id_producto
       and v.producto_inv_id_actualiz = p.inventario_id_actualizacion
      ${where.length ? `where ${where.join(' and ')}` : ''}
      order by p.id_producto asc
      limit $${params.length - 1} offset $${params.length}
    `;

    const result = await query<{
      id: string;
      nombre: string | null;
      categoria: string;
      precio: number;
      cantidad: number;
      imagen: string;
      vendidos: number;
    }>(sql, params);

    const productos = result.rows.map((r) => ({
      id: r.id,
      nombre: r.nombre ?? '',
      categoria: r.categoria,
      precio: r.precio,
      cantidad: r.cantidad,
      imagen: r.imagen,
      vendidos: r.vendidos,
    }));

    res.json({ items: productos, limit, offset });
  } catch (err) {
    next(err);
  }
});

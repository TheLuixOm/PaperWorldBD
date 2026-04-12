import { Router } from 'express';
import { withTransaction } from '../db/query.js';

export const ventasRouter = Router();

type VentaItemInput = {
  id: unknown;
  cantidad: unknown;
};

type VentaBody = {
  usuarioId?: unknown;
  items?: unknown;
};

function parseBigintLike(input: unknown): bigint | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return BigInt(Math.trunc(input));
  }

  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
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

function parseIntSafe(input: unknown, fallback: number) {
  const n = typeof input === 'number' ? input : typeof input === 'string' ? Number(input) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toFechaDDMMYYYY(input: Date) {
  const dd = String(input.getDate()).padStart(2, '0');
  const mm = String(input.getMonth() + 1).padStart(2, '0');
  const yyyy = String(input.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

ventasRouter.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as VentaBody;

    const usuarioId = typeof body.usuarioId === 'string' && body.usuarioId.trim() ? body.usuarioId.trim() : 'mostrador';
    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return res.status(400).json({ error: 'BadRequest', detail: 'items requeridos' });
    }

    const items: Array<{ idProducto: bigint; cantidad: number }> = [];
    for (const it of itemsRaw as unknown[]) {
      const obj = it as Partial<VentaItemInput>;
      const idProducto = parseBigintLike(obj?.id);
      const cantidad = Math.max(1, parseIntSafe(obj?.cantidad, 0));
      if (!idProducto) {
        return res.status(400).json({ error: 'BadRequest', detail: 'id de producto inválido' });
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return res.status(400).json({ error: 'BadRequest', detail: 'cantidad inválida' });
      }
      items.push({ idProducto, cantidad });
    }

    const result = await withTransaction(async (client) => {
      // Asegura que exista un usuario para cumplir FK (flujo actual de frontend no maneja auth real todavía).
      const correo = usuarioId.includes('@') ? usuarioId : null;
      await client.query(
        `insert into usuario (id_usuario, correo)
         values ($1, $2)
         on conflict (id_usuario) do nothing`,
        [usuarioId, correo],
      );

      // Trae y bloquea stock/precio de cada producto (última versión) y valida.
      const fetched: Array<{
        id_producto: bigint;
        inventario_id_actualizacion: bigint;
        precio: number;
        stock: number;
        nombre: string;
      }> = [];

      for (const it of items) {
        const row = await client.query<{
          id_producto: string;
          inventario_id_actualizacion: string;
          precio: number;
          stock: number;
          nombre: string;
        }>(
          `select
             p.id_producto::text as id_producto,
             p.inventario_id_actualizacion::text as inventario_id_actualizacion,
             coalesce(p.precio, 0)::float as precio,
             coalesce(p.cantidad, 0) as stock,
             coalesce(p.nombreproducto, '') as nombre
           from producto p
           where p.id_producto = $1
           order by p.inventario_id_actualizacion desc
           limit 1
           for update`,
          [it.idProducto.toString()],
        );

        if (!row.rowCount || !row.rows[0]) {
          throw new Error(`Producto no encontrado: ${it.idProducto.toString()}`);
        }

        const r = row.rows[0];
        const stock = Number.isFinite(r.stock) ? r.stock : 0;
        if (stock < it.cantidad) {
          throw new Error(`Stock insuficiente para "${r.nombre || it.idProducto.toString()}"`);
        }

        fetched.push({
          id_producto: BigInt(r.id_producto),
          inventario_id_actualizacion: BigInt(r.inventario_id_actualizacion),
          precio: Number.isFinite(r.precio) ? r.precio : 0,
          stock,
          nombre: r.nombre ?? '',
        });
      }

      const total = items.reduce((acc, it) => {
        const f = fetched.find((x) => x.id_producto === it.idProducto);
        return acc + (f ? f.precio * it.cantidad : 0);
      }, 0);

      const ordenInsert = await client.query<{ id_orden: string; fecha: string }>(
        `insert into orden (fecha, total, estado, usuario_id_usuario)
         values (now(), $1, $2, $3)
         returning id_orden::text as id_orden, fecha::text as fecha`,
        [total, 'Procesado', usuarioId],
      );

      const idOrden = BigInt(ordenInsert.rows[0]!.id_orden);

      // Inserta items + descuenta stock.
      for (const it of items) {
        const f = fetched.find((x) => x.id_producto === it.idProducto)!;

        const upd = await client.query<{ cantidad: number }>(
          `update producto
             set cantidad = cantidad - $3
           where id_producto = $1
             and inventario_id_actualizacion = $2
             and cantidad >= $3
           returning cantidad`,
          [f.id_producto.toString(), f.inventario_id_actualizacion.toString(), it.cantidad],
        );

        if (!upd.rowCount) {
          throw new Error(`No se pudo actualizar stock para producto ${it.idProducto.toString()}`);
        }

        await client.query(
          `insert into lista_productos (cantidad, producto_id_producto, producto_inv_id_actualiz, orden_id_orden)
           values ($1, $2, $3, $4)`,
          [it.cantidad, f.id_producto.toString(), f.inventario_id_actualizacion.toString(), idOrden.toString()],
        );
      }

      // Factura y reporte (opcionales pero útiles para el módulo de reportes).
      const factura = await client.query<{ id_factura: string }>(
        `insert into facturas (usuario_id_usuario, fecha_compra, total, orden_id_orden)
         values ($1, now(), $2, $3)
         returning id_factura::text as id_factura`,
        [usuarioId, total, idOrden.toString()],
      );

      await client.query(
        `insert into reportes (fecha, tipo, orden_id_orden)
         values (now(), $1, $2)`,
        ['venta', idOrden.toString()],
      );

      const fecha = new Date();

      return {
        venta: {
          id: `V-${idOrden.toString()}`,
          fecha: toFechaDDMMYYYY(fecha),
          cliente: usuarioId,
          items: items.reduce((acc, it) => acc + it.cantidad, 0),
          total,
          estado: 'Procesado' as const,
        },
        id_orden: idOrden.toString(),
      };
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

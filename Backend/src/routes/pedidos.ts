import { Router } from 'express';
import type { PoolClient } from 'pg';
import { withTransaction } from '../db/query.js';

export const pedidosRouter = Router();

type PedidoItemInput = {
  id: unknown;
  cantidad: unknown;
};

type PedidoBody = {
  usuarioId?: unknown;
  items?: unknown;
};

async function resolveUsuarioId(client: PoolClient, usuarioKey: string): Promise<bigint> {
  const clean = (usuarioKey ?? '').trim();
  const isEmail = clean.includes('@');

  // Si viene como id numérico explícito.
  if (clean && /^\d+$/.test(clean)) {
    const found = await client.query<{ id_usuario: string }>(
      'select id_usuario::text as id_usuario from usuario where id_usuario = $1 limit 1',
      [clean],
    );
    if (found.rowCount && found.rows[0]) {
      return BigInt(found.rows[0].id_usuario);
    }
  }

  if (isEmail) {
    const found = await client.query<{ id_usuario: string }>(
      'select id_usuario::text as id_usuario from usuario where lower(correo) = lower($1) limit 1',
      [clean],
    );

    if (found.rowCount && found.rows[0]) {
      return BigInt(found.rows[0].id_usuario);
    }

    const inserted = await client.query<{ id_usuario: string }>(
      'insert into usuario (correo) values ($1) returning id_usuario::text as id_usuario',
      [clean],
    );
    return BigInt(inserted.rows[0]!.id_usuario);
  }

  // Username: intenta resolver por credenciales.nombreusuario.
  if (clean) {
    const found = await client.query<{ usuario_id_usuario: string }>(
      'select usuario_id_usuario::text as usuario_id_usuario from credenciales where lower(nombreusuario) = lower($1) limit 1',
      [clean],
    );
    if (found.rowCount && found.rows[0]) {
      return BigInt(found.rows[0].usuario_id_usuario);
    }

    // Fallback seguro: intenta por correo (si alguien guardó username como correo) y si no, crea usuario.
    const byCorreo = await client.query<{ id_usuario: string }>(
      'select id_usuario::text as id_usuario from usuario where lower(correo) = lower($1) limit 1',
      [clean],
    );
    if (byCorreo.rowCount && byCorreo.rows[0]) {
      return BigInt(byCorreo.rows[0].id_usuario);
    }

    const insertedUser = await client.query<{ id_usuario: string }>(
      'insert into usuario (nombre) values ($1) returning id_usuario::text as id_usuario',
      [clean],
    );
    return BigInt(insertedUser.rows[0]!.id_usuario);
  }

  // Último recurso.
  const insertedUser = await client.query<{ id_usuario: string }>(
    'insert into usuario (nombre) values ($1) returning id_usuario::text as id_usuario',
    ['cliente'],
  );
  return BigInt(insertedUser.rows[0]!.id_usuario);
}

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

  // Soporta formatos tipo "#0001"
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

pedidosRouter.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as PedidoBody;

    const usuarioId = typeof body.usuarioId === 'string' && body.usuarioId.trim() ? body.usuarioId.trim() : 'cliente';
    const itemsRaw = body.items;
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return res.status(400).json({ error: 'BadRequest', detail: 'items requeridos' });
    }

    const items: Array<{ idProducto: bigint; cantidad: number }> = [];
    for (const it of itemsRaw as unknown[]) {
      const obj = it as Partial<PedidoItemInput>;
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
      const usuarioIdUsuario = await resolveUsuarioId(client, usuarioId);

      const fetched: Array<{
        id_producto: bigint;
        precio: number;
        stock: number;
        nombre: string;
      }> = [];

      for (const it of items) {
        const row = await client.query<{
          id_producto: string;
          precio: number;
          stock: number;
          nombre: string;
        }>(
          `select
             p.id_producto::text as id_producto,
             coalesce(p.precio, 0)::float as precio,
             coalesce(p.cantidad, 0) as stock,
             coalesce(p.nombreproducto, '') as nombre
           from producto p
           where p.id_producto = $1
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
          precio: Number.isFinite(r.precio) ? r.precio : 0,
          stock,
          nombre: r.nombre ?? '',
        });
      }

      const total = items.reduce((acc, it) => {
        const f = fetched.find((x) => x.id_producto === it.idProducto);
        return acc + (f ? f.precio * it.cantidad : 0);
      }, 0);

      const ordenInsert = await client.query<{ id_orden: string }>(
        `insert into orden (fecha, total, estado, usuario_id_usuario)
         values (now(), $1, $2, $3)
         returning id_orden::text as id_orden`,
        [total, 'Pendiente', usuarioIdUsuario.toString()],
      );

      const idOrden = BigInt(ordenInsert.rows[0]!.id_orden);

      for (const it of items) {
        const f = fetched.find((x) => x.id_producto === it.idProducto)!;

        const upd = await client.query(
          `update producto
             set cantidad = cantidad - $2
           where id_producto = $1
             and cantidad >= $2`,
          [f.id_producto.toString(), it.cantidad],
        );

        if (!upd.rowCount) {
          throw new Error(`No se pudo actualizar stock para producto ${it.idProducto.toString()}`);
        }

        await client.query(
          `insert into lista_productos (cantidad, producto_id_producto, orden_id_orden)
           values ($1, $2, $3)`,
          [it.cantidad, f.id_producto.toString(), idOrden.toString()],
        );
      }

      await client.query(
        `insert into facturas (usuario_id_usuario, fecha_compra, total, orden_id_orden)
         values ($1, now(), $2, $3)`,
        [usuarioIdUsuario.toString(), total, idOrden.toString()],
      );

      const fecha = new Date();

      return {
        pedido: {
          id: `P-${idOrden.toString()}`,
          fecha: toFechaDDMMYYYY(fecha),
          cliente: usuarioId,
          items: items.reduce((acc, it) => acc + it.cantidad, 0),
          total,
          estado: 'Pendiente' as const,
        },
        id_orden: idOrden.toString(),
      };
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

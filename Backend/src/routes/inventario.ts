import { Router } from 'express';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/query.js';
import { createClient } from '@supabase/supabase-js';
import { env } from '../shared/env.js';

export const inventarioRouter = Router();

const supabase = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

type ProductoInventario = {
  id_producto: string; // bigint como string
  inventario_id_actualizacion: string; // bigint como string
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
  categoria: string;
  fecha_actualizacion: string | null;
  stock_minimo: number | null;
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

function parseNumberSafe(input: unknown, fallback: number) {
  const n = typeof input === 'number' ? input : typeof input === 'string' ? Number(input) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function ensureCategoria(client: PoolClient, nombre: string): Promise<bigint> {
  const clean = nombre.trim();
  if (!clean) {
    throw new Error('categoria vacía');
  }

  const found = await client.query<{ id_categoria: string }>(
    'select id_categoria::text as id_categoria from categoria where lower(nombrecategoria) = lower($1) limit 1',
    [clean],
  );

  if (found.rowCount && found.rows[0]) {
    return BigInt(found.rows[0].id_categoria);
  }

  const inserted = await client.query<{ id_categoria: string }>(
    'insert into categoria (nombrecategoria) values ($1) returning id_categoria::text as id_categoria',
    [clean],
  );

  return BigInt(inserted.rows[0]!.id_categoria);
}

async function fetchProductoLatest(idProducto: bigint): Promise<ProductoInventario | null> {
  const result = await query<ProductoInventario>(
    `
    select
      p.id_producto::text as id_producto,
      p.inventario_id_actualizacion::text as inventario_id_actualizacion,
      coalesce(p.nombreproducto, '') as nombre,
      coalesce(p.precio, 0)::float as precio,
      coalesce(p.cantidad, 0) as cantidad,
      coalesce(p.imagen, '') as imagen,
      coalesce(c.nombrecategoria, '') as categoria,
      ci.fecha_actualizacion::text as fecha_actualizacion,
      ci.stock_minimo as stock_minimo
    from producto p
    left join cambios_inv ci on ci.id_actualizacion = p.inventario_id_actualizacion
    left join detalle_cat dc
      on dc.producto_id_producto = p.id_producto
    left join categoria c on c.id_categoria = dc.categoria_id_categoria
    where p.id_producto = $1
    limit 1
    `,
    [idProducto.toString()],
  );

  return result.rows[0] ?? null;
}

async function fetchProductoLatestWithClient(client: PoolClient, idProducto: bigint): Promise<ProductoInventario | null> {
  const result = await client.query<ProductoInventario>(
    `
    select
      p.id_producto::text as id_producto,
      p.inventario_id_actualizacion::text as inventario_id_actualizacion,
      coalesce(p.nombreproducto, '') as nombre,
      coalesce(p.precio, 0)::float as precio,
      coalesce(p.cantidad, 0) as cantidad,
      coalesce(p.imagen, '') as imagen,
      coalesce(c.nombrecategoria, '') as categoria,
      ci.fecha_actualizacion::text as fecha_actualizacion,
      ci.stock_minimo as stock_minimo
    from producto p
    left join cambios_inv ci on ci.id_actualizacion = p.inventario_id_actualizacion
    left join detalle_cat dc
      on dc.producto_id_producto = p.id_producto
    left join categoria c on c.id_categoria = dc.categoria_id_categoria
    where p.id_producto = $1
    limit 1
    `,
    [idProducto.toString()],
  );

  return result.rows[0] ?? null;
}

// GET /api/inventario
inventarioRouter.get('/', async (req, res, next) => {
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
      where.push(`(p.nombreproducto ilike $${params.length} or c.nombrecategoria ilike $${params.length})`);
    }

    if (categoria) {
      params.push(categoria);
      where.push(`c.nombrecategoria = $${params.length}`);
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      select distinct on (p.id_producto)
        p.id_producto::text as id_producto,
        p.inventario_id_actualizacion::text as inventario_id_actualizacion,
        coalesce(p.nombreproducto, '') as nombre,
        coalesce(p.precio, 0)::float as precio,
        coalesce(p.cantidad, 0) as cantidad,
        coalesce(p.imagen, '') as imagen,
        coalesce(c.nombrecategoria, '') as categoria,
        ci.fecha_actualizacion::text as fecha_actualizacion,
        ci.stock_minimo as stock_minimo
      from producto p
      left join cambios_inv ci on ci.id_actualizacion = p.inventario_id_actualizacion
      left join detalle_cat dc
        on dc.producto_id_producto = p.id_producto
      left join categoria c on c.id_categoria = dc.categoria_id_categoria
      ${where.length ? `where ${where.join(' and ')}` : ''}
      order by p.id_producto asc, p.inventario_id_actualizacion desc
      limit $${params.length - 1} offset $${params.length}
    `;

    const result = await query<ProductoInventario>(sql, params);

    res.json({ items: result.rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventario/:idProducto (devuelve el registro más reciente)
inventarioRouter.get('/:idProducto', async (req, res, next) => {
  try {
    const idProducto = parseBigintLike(req.params.idProducto);
    if (!idProducto) {
      return res.status(400).json({ error: 'BadRequest', detail: 'idProducto inválido' });
    }

    const item = await fetchProductoLatest(idProducto);
    if (!item) {
      return res.status(404).json({ error: 'NotFound' });
    }

    return res.json({ item });
  } catch (err) {
    next(err);
  }
});

inventarioRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<{
      id_producto: unknown;
      nombre: unknown;
      precio: unknown;
      imagen: unknown;
      imagen_base64: unknown;
      imagen_mime: unknown;
      imagen_nombre: unknown;
      cantidad: unknown;
      categoria: unknown;
      stock_minimo: unknown;
    }>;

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!nombre) {
      return res.status(400).json({ error: 'BadRequest', detail: 'nombre requerido' });
    }

    const precio = parseNumberSafe(body.precio, NaN);
    if (!Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ error: 'BadRequest', detail: 'precio inválido' });
    }

    const cantidad = Math.max(0, parseIntSafe(body.cantidad, 0));
    const imagen = typeof body.imagen === 'string' ? body.imagen.trim() : '';
    const imagenBase64 = typeof body.imagen_base64 === 'string' ? body.imagen_base64.trim() : '';
    const imagenMime = typeof body.imagen_mime === 'string' ? body.imagen_mime.trim().toLowerCase() : '';
    const imagenNombre = typeof body.imagen_nombre === 'string' ? body.imagen_nombre.trim() : '';
    const categoria = typeof body.categoria === 'string' ? body.categoria.trim() : '';

    const stockMinimoRaw = parseIntSafe(body.stock_minimo, -1);
    const stock_minimo = stockMinimoRaw >= 0 ? stockMinimoRaw : null;

    const created = await withTransaction(async (client) => {
      const cambio = await client.query<{ id_actualizacion: string }>(
        'insert into cambios_inv (fecha_actualizacion, stock_minimo) values (now(), $1) returning id_actualizacion::text as id_actualizacion',
        [stock_minimo],
      );

      const idActualizacion = BigInt(cambio.rows[0]!.id_actualizacion);

      let idProducto = parseBigintLike(body.id_producto);
      if (!idProducto) {
        const nextId = await client.query<{ next_id: string }>(
          'select (coalesce(max(id_producto), 0) + 1)::text as next_id from producto',
        );
        idProducto = BigInt(nextId.rows[0]!.next_id);
      }

      let imagenFinal = imagen;
      if (imagenBase64) {
        if (!supabase) {
          throw new Error('Supabase no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Backend/.env');
        }

        const extensionByMime: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/svg+xml': 'svg',
        };

        const extFromName = imagenNombre.includes('.')
          ? (imagenNombre.split('.').pop() ?? '').toLowerCase()
          : '';
        const extension = extFromName || extensionByMime[imagenMime] || 'bin';
        const filePath = `${idProducto.toString()}.${extension}`;
        const bytes = Buffer.from(imagenBase64, 'base64');

        const { error: uploadError } = await supabase.storage
          .from(env.SUPABASE_BUCKET)
          .upload(filePath, bytes, {
            contentType: imagenMime || 'application/octet-stream',
            upsert: true,
            cacheControl: '31536000',
          });

        if (uploadError) {
          throw new Error(`Error subiendo imagen a Supabase: ${uploadError.message}`);
        }

        const { data: publicData } = supabase.storage
          .from(env.SUPABASE_BUCKET)
          .getPublicUrl(filePath);

        if (!publicData?.publicUrl) {
          throw new Error('No se pudo obtener URL publica de la imagen en Supabase');
        }

        imagenFinal = publicData.publicUrl;
      }

      await client.query(
        `insert into producto
          (id_producto, nombreproducto, precio, imagen, cantidad, inventario_id_actualizacion)
         values
          ($1, $2, $3, $4, $5, $6)`,
        [
          idProducto.toString(),
          nombre,
          precio,
          imagenFinal,
          cantidad,
          idActualizacion.toString(),
        ],
      );

      // Registrar un movimiento inicial si arranca con stock.
      if (cantidad > 0) {
        await client.query(
          `insert into reportes (fecha, tipo, inventario_id_actualizacion)
           values (now(), 'inventario_agregado', $1)`,
          [idActualizacion.toString()],
        );
      }

      if (categoria) {
        const categoriaId = await ensureCategoria(client, categoria);
        await client.query(
          `insert into detalle_cat (producto_id_producto, categoria_id_categoria)
           values ($1, $2)
           on conflict do nothing`,
          [idProducto.toString(), categoriaId.toString()],
        );
      }

      const item = await fetchProductoLatestWithClient(client, idProducto);
      return item;
    });

    if (!created) {
      return res.status(500).json({ error: 'InternalServerError' });
    }

    return res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/inventario/:idProducto
// Actualiza el registro más reciente del producto (sin crear nueva versión)
inventarioRouter.put('/:idProducto', async (req, res, next) => {
  try {
    const idProducto = parseBigintLike(req.params.idProducto);
    if (!idProducto) {
      return res.status(400).json({ error: 'BadRequest', detail: 'idProducto inválido' });
    }

    const body = req.body as Partial<{
      nombre: unknown;
      precio: unknown;
      imagen: unknown;
      cantidad: unknown;
      categoria: unknown;
      stock_minimo: unknown;
    }>;

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const precio = parseNumberSafe(body.precio, NaN);
    const cantidad = parseIntSafe(body.cantidad, NaN);

    if (!nombre || !Number.isFinite(precio) || precio < 0 || !Number.isFinite(cantidad) || cantidad < 0) {
      return res.status(400).json({
        error: 'BadRequest',
        detail: 'Requiere nombre (string), precio (number>=0), cantidad (int>=0)',
      });
    }

    const imagen = typeof body.imagen === 'string' ? body.imagen.trim() : '';
    const categoria = typeof body.categoria === 'string' ? body.categoria.trim() : '';

    const stockMinimoRaw = parseIntSafe(body.stock_minimo, -1);
    const stock_minimo = stockMinimoRaw >= 0 ? stockMinimoRaw : null;

    const updated = await withTransaction(async (client) => {
      const latest = await client.query<{ inventario_id_actualizacion: string; cantidad: number }>(
        `select
           inventario_id_actualizacion::text as inventario_id_actualizacion,
           coalesce(cantidad, 0) as cantidad
         from producto
         where id_producto = $1
         for update`,
        [idProducto.toString()],
      );

      if (!latest.rowCount) {
        return null;
      }

      const invId = BigInt(latest.rows[0]!.inventario_id_actualizacion);
      const cantidadAntes = Number.isFinite(latest.rows[0]!.cantidad) ? Math.trunc(latest.rows[0]!.cantidad) : 0;
      const cantidadDespues = Math.trunc(cantidad);
      const deltaCantidad = cantidadDespues - cantidadAntes;

      await client.query(
        `update producto
         set nombreproducto = $1,
             precio = $2,
             imagen = $3,
             cantidad = $4
         where id_producto = $5`,
        [nombre, precio, imagen, cantidadDespues, idProducto.toString()],
      );

      // Solo marcamos el inventario como "cambio reciente" si cambió stock o el mínimo.
      if (deltaCantidad !== 0 || stock_minimo !== null) {
        if (stock_minimo !== null) {
          await client.query(
            'update cambios_inv set fecha_actualizacion = now(), stock_minimo = $1 where id_actualizacion = $2',
            [stock_minimo, invId.toString()],
          );
        } else {
          await client.query('update cambios_inv set fecha_actualizacion = now() where id_actualizacion = $1', [
            invId.toString(),
          ]);
        }
      }

      // Registrar el movimiento para que el reporte pueda mostrar + / - correctamente.
      if (deltaCantidad !== 0) {
        const tipo = deltaCantidad > 0 ? 'inventario_agregado' : 'inventario_eliminado';
        await client.query(
          `insert into reportes (fecha, tipo, inventario_id_actualizacion)
           values (now(), $1, $2)`,
          [tipo, invId.toString()],
        );
      }

      if (categoria) {
        const categoriaId = await ensureCategoria(client, categoria);
        await client.query('delete from detalle_cat where producto_id_producto = $1', [idProducto.toString()]);
        await client.query(
          `insert into detalle_cat (producto_id_producto, categoria_id_categoria)
           values ($1, $2)
           on conflict do nothing`,
          [idProducto.toString(), categoriaId.toString()],
        );
      }

      return fetchProductoLatestWithClient(client, idProducto);
    });

    if (!updated) {
      return res.status(404).json({ error: 'NotFound' });
    }

    return res.json({ item: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/inventario/:idProducto
// Elimina el registro más reciente del producto (puede fallar si hay FKs en facturas/ordenes)
inventarioRouter.delete('/:idProducto', async (req, res, next) => {
  try {
    const idProducto = parseBigintLike(req.params.idProducto);
    if (!idProducto) {
      return res.status(400).json({ error: 'BadRequest', detail: 'idProducto inválido' });
    }

    const result = await withTransaction(async (client) => {
      const latest = await client.query<{ inventario_id_actualizacion: string }>(
        `select inventario_id_actualizacion::text as inventario_id_actualizacion
         from producto
         where id_producto = $1
         for update`,
        [idProducto.toString()],
      );

      if (!latest.rowCount) {
        return { ok: false as const, status: 404 as const };
      }

      const invId = BigInt(latest.rows[0]!.inventario_id_actualizacion);

      // Limpieza de relaciones "propias" del inventario
      await client.query('delete from detalle_cat where producto_id_producto = $1', [idProducto.toString()]);
      await client.query('delete from detalles_proveedor where producto_id_producto = $1', [idProducto.toString()]);

      try {
        await client.query('delete from producto where id_producto = $1', [idProducto.toString()]);
      } catch (err) {
        // FK violation (por ejemplo, si ya está en lista_productos o detalle_factura)
        if (err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === '23503') {
          return { ok: false as const, status: 409 as const, error: 'ProductoReferenciado' as const };
        }
        throw err;
      }

      // borra cambios_inv si nadie más lo usa
      await client.query(
        'delete from cambios_inv ci where ci.id_actualizacion = $1 and not exists (select 1 from producto p where p.inventario_id_actualizacion = $1)',
        [invId.toString()],
      );

      return { ok: true as const, status: 204 as const };
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.status === 409 ? result.error : 'NotFound' });
    }

    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

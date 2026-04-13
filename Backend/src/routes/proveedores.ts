import { Router } from 'express';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/query.js';

export const proveedoresRouter = Router();

type ProveedorApiItem = {
	id_proveedor: string;
	nombre: string;
	telefono: string;
	correo: string;
	productos_relacionados: number;
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

function normalizeText(input: unknown) {
	return typeof input === 'string' ? input.trim() : '';
}
function buildProveedorSelect() {
	return `
		select
			p.id_proveedor::text as id_proveedor,
			coalesce(p.p_nombre, '') as nombre,
			coalesce(p.p_telefono, '') as telefono,
			coalesce(p.p_correo, '') as correo,
			coalesce(dp.cnt_productos, 0)::int as productos_relacionados
		from proveedor p
		left join (
			select proveedor_id_proveedor, count(*)::int as cnt_productos
			from detalles_proveedor
			group by proveedor_id_proveedor
		) dp on dp.proveedor_id_proveedor = p.id_proveedor
	`;
}

async function fetchProveedorById(client: PoolClient, idProveedor: bigint) {
	const sql = `${buildProveedorSelect()} where p.id_proveedor = $1 limit 1`;
	const result = await client.query<ProveedorApiItem>(sql, [idProveedor.toString()]);
	return result.rows[0] ?? null;
}

// GET /api/proveedores
proveedoresRouter.get('/', async (req, res, next) => {
	try {
		const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
		const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 200;
		const offsetRaw = typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

		const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;
		const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;

		const params: unknown[] = [];
		const where: string[] = [];

		if (q) {
			params.push(`%${q}%`);
			const idx = params.length;
			const terms = ['p.p_nombre ilike $' + idx, 'p.p_correo ilike $' + idx, 'p.p_telefono ilike $' + idx];
			where.push(`(${terms.join(' or ')})`);
		}

		params.push(limit);
		params.push(offset);

		const sql = `
			${buildProveedorSelect()}
			${where.length ? `where ${where.join(' and ')}` : ''}
			order by p.id_proveedor asc
			limit $${params.length - 1} offset $${params.length}
		`;

		const result = await query<ProveedorApiItem>(sql, params);
		return res.json({ items: result.rows, limit, offset });
	} catch (err) {
		next(err);
	}
});

// GET /api/proveedores/:idProveedor
proveedoresRouter.get('/:idProveedor', async (req, res, next) => {
	try {
		const idProveedor = parseBigintLike(req.params.idProveedor);

		if (!idProveedor) {
			return res.status(400).json({ error: 'BadRequest', detail: 'idProveedor inválido' });
		}

		const item = await withTransaction(async (client) => fetchProveedorById(client, idProveedor));
		if (!item) {
			return res.status(404).json({ error: 'NotFound' });
		}

		return res.json({ item });
	} catch (err) {
		next(err);
	}
});

// POST /api/proveedores
proveedoresRouter.post('/', async (req, res, next) => {
	try {
		const body = req.body as Partial<{
			id_proveedor: unknown;
			nombre: unknown;
			telefono: unknown;
			correo: unknown;
		}>;

		const nombre = normalizeText(body.nombre);
		if (!nombre) {
			return res.status(400).json({ error: 'BadRequest', detail: 'nombre requerido' });
		}

		const telefono = normalizeText(body.telefono);
		const correo = normalizeText(body.correo);

		const created = await withTransaction(async (client) => {
			let idProveedor = parseBigintLike(body.id_proveedor);
			if (!idProveedor) {
				const nextId = await client.query<{ next_id: string }>(
					'select (coalesce(max(id_proveedor), 0) + 1)::text as next_id from proveedor',
				);
				idProveedor = BigInt(nextId.rows[0]!.next_id);
			}

			await client.query(
				`insert into proveedor (id_proveedor, p_nombre, p_telefono, p_correo)
				 overriding system value
				 values ($1, $2, $3, $4)`,
				[idProveedor.toString(), nombre, telefono, correo],
			);

			return fetchProveedorById(client, idProveedor);
		});

		if (!created) {
			return res.status(500).json({ error: 'InternalServerError' });
		}

		return res.status(201).json({ item: created });
	} catch (err) {
		next(err);
	}
});

// PUT /api/proveedores/:idProveedor
proveedoresRouter.put('/:idProveedor', async (req, res, next) => {
	try {
		const idProveedor = parseBigintLike(req.params.idProveedor);

		if (!idProveedor) {
			return res.status(400).json({ error: 'BadRequest', detail: 'idProveedor inválido' });
		}

		const body = req.body as Partial<{
			nombre: unknown;
			telefono: unknown;
			correo: unknown;
		}>;

		const nombre = normalizeText(body.nombre);
		if (!nombre) {
			return res.status(400).json({ error: 'BadRequest', detail: 'nombre requerido' });
		}

		const telefono = normalizeText(body.telefono);
		const correo = normalizeText(body.correo);

		const updated = await withTransaction(async (client) => {
			const upd = await client.query(
				`update proveedor
				 set p_nombre = $1,
				     p_telefono = $2,
				     p_correo = $3
				 where id_proveedor = $4`,
				[nombre, telefono, correo, idProveedor.toString()],
			);
			if (!upd.rowCount) {
				return null;
			}

			return fetchProveedorById(client, idProveedor);
		});

		if (!updated) {
			return res.status(404).json({ error: 'NotFound' });
		}

		return res.json({ item: updated });
	} catch (err) {
		next(err);
	}
});

// DELETE /api/proveedores/:idProveedor
proveedoresRouter.delete('/:idProveedor', async (req, res, next) => {
	try {
		const idProveedor = parseBigintLike(req.params.idProveedor);

		if (!idProveedor) {
			return res.status(400).json({ error: 'BadRequest', detail: 'idProveedor inválido' });
		}

		const result = await withTransaction(async (client) => {
			try {
				const deleted = await client.query('delete from proveedor where id_proveedor = $1', [idProveedor.toString()]);

				if (!deleted.rowCount) {
					return { ok: false as const, status: 404 as const };
				}

				return { ok: true as const, status: 204 as const };
			} catch (err) {
				if (err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === '23503') {
					return { ok: false as const, status: 409 as const, error: 'ProveedorReferenciado' as const };
				}
				throw err;
			}
		});

		if (!result.ok) {
			return res.status(result.status).json({ error: result.status === 409 ? result.error : 'NotFound' });
		}

		return res.status(204).end();
	} catch (err) {
		next(err);
	}
});

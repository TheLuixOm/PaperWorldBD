import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { env } from '../shared/env.js';
import { withTransaction } from '../db/query.js';

export const authRouter = Router();

type RegisterBody = {
  id_usuario?: string;
  nombre: string;
  apellido: string;
  correo: string;
  edad?: number;
  username: string;
  password: string;
  rol?: string; // cliente | empleado | jefe (depende de tus datos)
};

type LoginBody = {
  username: string;
  password: string;
};

async function ensureRole(client: PoolClient, tipo: string): Promise<number> {
  const existing = await client.query<{ id_rol: number }>(
    'select id_rol from rol_usuario where tipo_rol = $1 order by id_rol desc limit 1',
    [tipo],
  );
  if (existing.rowCount && existing.rows[0]) {
    return existing.rows[0].id_rol;
  }

  const inserted = await client.query<{ id_rol: number }>(
    'insert into rol_usuario (tipo_rol, activo, fecha_inicio, fecha_fin) values ($1, true, current_date, null) returning id_rol',
    [tipo],
  );
  return inserted.rows[0]!.id_rol;
}

async function getRoles(client: PoolClient, userId: string): Promise<string[]> {
  const result = await client.query<{ tipo_rol: string }>(
    `select ru.tipo_rol
     from detalles_rol dr
     join rol_usuario ru on ru.id_rol = dr.rol_usuario_id_rol
     where dr.usuario_id_usuario = $1
     order by ru.id_rol asc`,
    [userId],
  );
  return result.rows.map((r) => r.tipo_rol).filter(Boolean);
}

function signToken(payload: { userId: string; username: string; roles: string[] }) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET missing');
  }

  return jwt.sign(
    {
      sub: payload.userId,
      username: payload.username,
      roles: payload.roles,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = req.body as Partial<RegisterBody>;

    if (!body.nombre || !body.apellido || !body.correo || !body.username || !body.password) {
      return res.status(400).json({ error: 'BadRequest', detail: 'Faltan campos requeridos' });
    }

    const userId = body.id_usuario?.trim() || randomUUID();
    const rol = (body.rol?.trim() || 'cliente').toLowerCase();

    const edad = typeof body.edad === 'number' && Number.isFinite(body.edad) ? Math.max(0, Math.floor(body.edad)) : null;

    const passwordHash = await bcrypt.hash(body.password, 10);

    const created = await withTransaction(async (client) => {
      const userExists = await client.query('select 1 from usuario where id_usuario = $1 limit 1', [userId]);
      if (userExists.rowCount) {
        return { ok: false as const, status: 409 as const, error: 'UserIdAlreadyExists' as const };
      }

      const emailExists = await client.query('select 1 from usuario where correo = $1 limit 1', [body.correo]);
      if (emailExists.rowCount) {
        return { ok: false as const, status: 409 as const, error: 'EmailAlreadyExists' as const };
      }

      const usernameExists = await client.query('select 1 from credenciales where nombreusuario = $1 limit 1', [body.username]);
      if (usernameExists.rowCount) {
        return { ok: false as const, status: 409 as const, error: 'UsernameAlreadyExists' as const };
      }

      await client.query(
        'insert into usuario (id_usuario, nombre, apellido, correo, edad) values ($1, $2, $3, $4, $5)',
        [userId, body.nombre, body.apellido, body.correo, edad],
      );

      await client.query(
        'insert into credenciales (nombreusuario, clave, ultimo_acceso, usuario_id_usuario) values ($1, $2, null, $3)',
        [body.username, passwordHash, userId],
      );

      const roleId = await ensureRole(client, rol);
      await client.query(
        'insert into detalles_rol (usuario_id_usuario, rol_usuario_id_rol) values ($1, $2)',
        [userId, roleId],
      );

      const roles = await getRoles(client, userId);

      return {
        ok: true as const,
        user: {
          id: userId,
          nombre: body.nombre,
          apellido: body.apellido,
          correo: body.correo,
          roles,
        },
      };
    });

    if (!created.ok) {
      return res.status(created.status).json({ error: created.error });
    }

    const token = signToken({ userId: created.user.id, username: body.username, roles: created.user.roles });

    return res.status(201).json({ token, user: created.user });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = req.body as Partial<LoginBody>;
    if (!body.username || !body.password) {
      return res.status(400).json({ error: 'BadRequest', detail: 'username y password requeridos' });
    }

    const result = await withTransaction(async (client) => {
      const found = await client.query<{
        clave: string;
        usuario_id_usuario: string;
        nombre: string | null;
        apellido: string | null;
        correo: string | null;
      }>(
        `select c.clave, c.usuario_id_usuario, u.nombre, u.apellido, u.correo
         from credenciales c
         join usuario u on u.id_usuario = c.usuario_id_usuario
         where c.nombreusuario = $1
         limit 1`,
        [body.username],
      );

      if (!found.rowCount) {
        return { ok: false as const };
      }

      const row = found.rows[0]!;
      const ok = await bcrypt.compare(body.password!, row.clave);
      if (!ok) {
        return { ok: false as const };
      }

      await client.query('update credenciales set ultimo_acceso = now() where usuario_id_usuario = $1', [row.usuario_id_usuario]);
      const roles = await getRoles(client, row.usuario_id_usuario);

      return {
        ok: true as const,
        user: {
          id: row.usuario_id_usuario,
          nombre: row.nombre ?? '',
          apellido: row.apellido ?? '',
          correo: row.correo ?? '',
          roles,
        },
      };
    });

    if (!result.ok) {
      return res.status(401).json({ error: 'InvalidCredentials' });
    }

    const token = signToken({ userId: result.user.id, username: body.username, roles: result.user.roles });
    return res.json({ token, user: result.user });
  } catch (err) {
    return next(err);
  }
});

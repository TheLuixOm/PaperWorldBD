import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { env } from '../shared/env.js';
import { withTransaction } from '../db/query.js';

export const authRouter = Router();


function normalizarTelefono(telefono: unknown) {
  return String(telefono ?? '').trim().replace(/[^0-9]/g, '');
}


async function getRoles(client: PoolClient, userId: number): Promise<string[]> {
  const result = await client.query<{ tipo_rol: string }>(
    `SELECT ru.tipo_rol
     FROM detalles_rol dr
     JOIN rol_usuario ru ON ru.id_rol = dr.rol_usuario_id_rol
     WHERE dr.usuario_id_usuario = $1
       AND dr.activo = true
       AND (dr.fecha_fin IS NULL OR dr.fecha_fin >= current_date)`,
    [userId],
  );
  return result.rows.map((r) => r.tipo_rol);
}


authRouter.post('/login', async (req, res, next) => {
  try {
    const { correo, username, contraseña } = req.body;
    const identificador = String(correo ?? username ?? '').trim();

    if (!identificador || !contraseña) {
      return res.status(400).json({ error: 'Faltan datos', detail: 'correo/username y contraseña requeridos' });
    }

    const result = await withTransaction(async (client) => {
      // Buscamos en 'usuario' y 'credenciales' usando tus columnas
      const found = await client.query(
        `SELECT c.clave, c.nombreusuario, u.id_usuario, u.correo, u.nombre
         FROM credenciales c
         JOIN usuario u ON u.id_usuario = c.usuario_id_usuario
         WHERE lower(u.correo) = lower($1) OR c.nombreusuario = $1
         LIMIT 1`,
        [identificador],
      );

      if (found.rowCount === 0) return { ok: false as const };

      const row = found.rows[0];
      

      const isBcrypt = row.clave.startsWith('$2a$') || row.clave.startsWith('$2b$');
      const authOk = isBcrypt ? await bcrypt.compare(contraseña, row.clave) : contraseña === row.clave;

      if (!authOk) return { ok: false as const };

      await client.query(
        'UPDATE credenciales SET ultimo_acceso = NOW() WHERE usuario_id_usuario = $1',
        [row.id_usuario]
      );

      const roles = await getRoles(client, row.id_usuario);

      return {
        ok: true as const,
        user: { id: row.id_usuario, correo: row.correo, username: row.nombreusuario, nombre: row.nombre, roles },
      };
    });


    if (!result.ok) {
      return res.status(401).json({});
    }

    const token = jwt.sign(
      { sub: result.user.id, roles: result.user.roles },
      env.JWT_SECRET || 'secreto_temporal',
      { expiresIn: '5h' }
    );

    return res.json({
      message: 'Login exitoso',
      token,
      user: result.user
    });

  } catch (err) {
    next(err); 
  }
});


// Recuperación de contraseña (simple): teléfono -> nueva clave
// Nota: este método se implementa así porque fue el flujo solicitado para el proyecto.
authRouter.post('/password-reset/verify-phone', async (req, res, next) => {
  try {
    const telefonoDigits = normalizarTelefono(req.body?.telefono);
    if (!telefonoDigits) {
      return res.status(400).json({ ok: false, error: 'Faltan datos', detail: 'telefono requerido' });
    }

    const result = await withTransaction(async (client) => {
      const found = await client.query<{ id_usuario: number }>(
        `SELECT u.id_usuario
         FROM usuario u
         JOIN credenciales c ON c.usuario_id_usuario = u.id_usuario
         WHERE regexp_replace(coalesce(u.telefono, ''), '[^0-9]', '', 'g') = $1
         LIMIT 1`,
        [telefonoDigits],
      );

      return { ok: (found.rowCount ?? 0) > 0 };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});


authRouter.post('/password-reset/reset', async (req, res, next) => {
  try {
    const telefonoDigits = normalizarTelefono(req.body?.telefono);
    const nuevaClave = String(req.body?.nuevaClave ?? '').trim();

    if (!telefonoDigits || !nuevaClave) {
      return res.status(400).json({ ok: false, error: 'Faltan datos', detail: 'telefono y nuevaClave requeridos' });
    }

    if (nuevaClave.length < 6) {
      return res.status(400).json({ ok: false, error: 'ClaveInvalida', detail: 'min 6 caracteres' });
    }

    const hash = await bcrypt.hash(nuevaClave, 10);

    const result = await withTransaction(async (client) => {
      const found = await client.query<{ id_usuario: number }>(
        `SELECT u.id_usuario
         FROM usuario u
         JOIN credenciales c ON c.usuario_id_usuario = u.id_usuario
         WHERE regexp_replace(coalesce(u.telefono, ''), '[^0-9]', '', 'g') = $1
         LIMIT 1
         FOR UPDATE`,
        [telefonoDigits],
      );

      if ((found.rowCount ?? 0) === 0) {
        return { ok: false };
      }

      const userId = found.rows[0].id_usuario;

      await client.query('UPDATE credenciales SET clave = $1 WHERE usuario_id_usuario = $2', [hash, userId]);

      return { ok: true };
    });

    if (!result.ok) {
      return res.status(404).json({ ok: false, error: 'TelefonoNoEncontrado' });
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
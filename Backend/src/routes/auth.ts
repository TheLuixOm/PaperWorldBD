import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { env } from '../shared/env.js';
import { withTransaction } from '../db/query.js';

export const authRouter = Router();


async function getRoles(client: PoolClient, userId: string): Promise<string[]> {
  const result = await client.query<{ tipo_rol: string }>(
    `SELECT ru.tipo_rol
     FROM detalles_rol dr
     JOIN rol_usuario ru ON ru.id_rol = dr.rol_usuario_id_rol
     WHERE dr.usuario_id_usuario = $1`,
    [userId],
  );
  return result.rows.map((r) => r.tipo_rol);
}


authRouter.post('/login', async (req, res, next) => {
  try {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
      return res.status(400).json({ error: 'Faltan datos', detail: 'correo y contraseña requeridos' });
    }

    const result = await withTransaction(async (client) => {
      // Buscamos en 'usuario' y 'credenciales' usando tus columnas
      const found = await client.query(
        `SELECT c.clave, u.id_usuario, u.correo, u.nombre
         FROM credenciales c
         JOIN usuario u ON u.id_usuario = c.usuario_id_usuario
         WHERE u.correo = $1
         LIMIT 1`,
        [correo],
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
        user: { id: row.id_usuario, correo: row.correo, nombre: row.nombre, roles },
      };
    });


    if (!result.ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
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
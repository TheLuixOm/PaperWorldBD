import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { withTransaction } from '../db/query.js';
export const registroRouter = Router();


type RegisterBody = {
	nombre: string;
	apellido: string;
	correo: string;
    username: string;
	edad?: number;
	password: string;
};

registroRouter.post('/register', async (req, res, next) => {
    try {
        const body = req.body as Partial<RegisterBody>;

        if (!body.nombre || !body.apellido || !body.correo || !body.username || !body.password) {
            return res.status(400).json({ error: 'BadRequest', detail: 'Faltan campos requeridos' });
        }

        const correo = body.correo.trim().toLowerCase();
        const username = body.username.trim();
        const passwordHash = await bcrypt.hash(body.password, 10);
        const edad = typeof body.edad === 'number' && Number.isFinite(body.edad) ? Math.max(0, Math.floor(body.edad)) : null;

        if (edad === null) {
            return res.status(400).json({ error: 'BadRequest', detail: 'La fecha de nacimiento es obligatoria.' });
        }

        const created = await withTransaction(async (client) => {

            const emailExists = await client.query('select 1 from usuario where lower(correo) = lower($1) limit 1', [correo]);
            if (emailExists.rowCount) {
                return { ok: false as const, status: 409 as const, error: 'El correo ya está registrado.' };
            }

            const usernameExists = await client.query('select 1 from credenciales where nombreusuario = $1 limit 1', [username]);
            if (usernameExists.rowCount) {
                return { ok: false as const, status: 409 as const, error: 'El nombre de usuario ya está registrado.' };
            }

            const insertedUser = await client.query<{ id_usuario: number }>(
                'insert into usuario (nombre, apellido, correo, edad) values ($1, $2, $3, $4) returning id_usuario',
                [body.nombre, body.apellido, correo, edad],
            );
            const userId = insertedUser.rows[0]!.id_usuario;


            await client.query(
                'insert into credenciales (nombreusuario, clave, ultimo_acceso, usuario_id_usuario) values ($1, $2, null, $3)',
                [username, passwordHash, userId],
            );


            await client.query(
                `insert into detalles_rol (
                    usuario_id_usuario, 
                    rol_usuario_id_rol, 
                    activo, 
                    fecha_inicio,
                    fecha_fin
                ) values ($1, 3, true, current_date, null)`,
                [userId],
            );

            return {
                ok: true as const,
                user: {
                    id: userId,
                    nombre: body.nombre,
                    apellido: body.apellido,
                    correo,
                    username,
                },
            };
        });

        if (!created.ok) {
            return res.status(created.status).json({ error: created.error });
        }

        return res.status(201).json({
            message: 'Registro exitoso',
            user: created.user,
            redirectTo: '/login',
        });
    } catch (err) {
        return next(err);
    }
});
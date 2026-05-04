import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../shared/env.js';

type JwtPayload = {
  sub: string;
  username: string;
  roles: string[];
};

export const authRequired: RequestHandler = (req, res, next) => {
  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Missing Bearer token' });
  }

  if (!env.JWT_SECRET) {
    return res.status(500).json({ error: 'ServerMisconfigured', detail: 'JWT_SECRET missing' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const sub = typeof decoded.sub === 'string' || typeof decoded.sub === 'number' ? String(decoded.sub) : '';
    const username = typeof (decoded as JwtPayload).username === 'string' ? (decoded as JwtPayload).username : '';
    const roles = Array.isArray((decoded as JwtPayload).roles)
      ? (decoded as JwtPayload).roles.filter((r): r is string => typeof r === 'string')
      : [];

    if (!sub) {
      return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid token' });
    }

    req.auth = { userId: sub, username, roles };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid token' });
  }
};

export function requireAnyRole(roles: string[]): RequestHandler {
  return (req, res, next) => {
    const current = req.auth?.roles ?? [];
    if (roles.some((r) => current.includes(r))) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

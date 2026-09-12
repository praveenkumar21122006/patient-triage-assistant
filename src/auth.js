import crypto from 'node:crypto';
import { promisify } from 'node:util';
import {
  findUserByName,
  findUserById,
  createSession,
  findSession,
  deleteSession,
  deleteExpiredSessions,
} from './db.js';

const scrypt = promisify(crypto.scrypt);

export const SESSION_COOKIE = 'pt_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === check.length && crypto.timingSafeEqual(expected, check);
}

export function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function startUserSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  createSession({
    tokenHash: tokenHash(token),
    userId,
    expiresAtMs: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function sessionCookieOptions() {
  return { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS, path: '/' };
}

export async function authenticate(req, res, next) {
  res.locals.user = null;
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) {
    deleteExpiredSessions();
    const session = findSession(tokenHash(token));
    if (session) {
      const user = findUserById(session.user_id);
      if (user) {
        req.user = user;
        res.locals.user = user;
      } else {
        deleteSession(session.id);
      }
    }
  }
  next();
}
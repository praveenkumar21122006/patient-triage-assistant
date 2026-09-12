import { Router } from 'express';
import { findUserByName, createUser, findSession, deleteSession } from '../db.js';
import {
  verifyPassword,
  hashPassword,
  startUserSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  tokenHash,
} from '../auth.js';

const router = Router();

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', {
    title: 'Log in',
    errors: [],
    form: {},
    activeNav: '',
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    const form = { username };

    const user = findUserByName(username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).render('login', {
        title: 'Log in',
        errors: ['Invalid username or password.'],
        form,
        activeNav: '',
      });
    }

    const token = await startUserSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());

    const nextPath = typeof req.body.next === 'string' && req.body.next.startsWith('/') ? req.body.next : '/';
    res.redirect(303, nextPath);
  } catch (err) {
    next(err);
  }
});

router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('register', {
    title: 'Create account',
    errors: [],
    form: {},
    activeNav: '',
  });
});

router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const displayName = (req.body.display_name || '').trim();
    const password = req.body.password || '';
    const confirm = req.body.confirm || '';
    const form = { username, display_name: displayName };

    const errors = [];
    if (!USERNAME_RE.test(username)) {
      errors.push('Username must be 3–24 characters, start with a letter or number, and use only letters, numbers, dots, dashes or underscores.');
    }
    if (displayName.length > 60) errors.push('Display name must be under 60 characters.');
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    if (password !== confirm) errors.push('Passwords do not match.');
    if (!errors.length && findUserByName(username)) errors.push('That username is already taken.');

    if (errors.length) {
      return res.status(400).render('register', {
        title: 'Create account',
        errors,
        form,
        activeNav: '',
      });
    }

    const userId = createUser({
      username,
      passwordHash: await hashPassword(password),
      displayName: displayName || null,
    });

    const token = await startUserSession(userId);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.redirect(303, '/');
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  if (token) {
    const session = findSession(tokenHash(token));
    if (session) deleteSession(session.id);
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.redirect(303, '/login');
});

export default router;
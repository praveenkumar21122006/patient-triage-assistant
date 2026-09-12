import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import cookieParser from 'cookie-parser';
import { authenticate } from './auth.js';
import authRouter from './routes/auth.js';
import indexRouter from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.path === '/api/health') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const nextPath = req.originalUrl !== '/' ? `?next=${encodeURIComponent(req.originalUrl)}` : '';
  return res.redirect(303, `/login${nextPath}`);
}

export function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layout');

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(authenticate);

  app.use(authRouter);

  app.use(requireAuth);
  app.use('/', indexRouter);

  app.use((req, res) => {
    res.status(404).render('error', { status: 404, message: 'Page not found' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { status: 500, message: 'Something went wrong' });
  });

  return app;
}
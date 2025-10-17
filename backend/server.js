import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';

import { query, transaction } from './db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'secret_admin_key_please_change';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN ?? '';
const TG_BOT_USERNAME = process.env.TG_BOT_USERNAME ?? '';
const TG_BOT_INTERNAL_SECRET = process.env.TG_BOT_INTERNAL_SECRET ?? '';
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:5173';
const API_BASE = process.env.API_BASE ?? `http://localhost:${PORT}`;

if (!process.env.JWT_SECRET) {
  console.warn('[warn] Using fallback JWT_SECRET. Set JWT_SECRET in production.');
}
if (!process.env.ADMIN_SECRET_KEY) {
  console.warn('[warn] Using fallback ADMIN_SECRET_KEY. Set ADMIN_SECRET_KEY in production.');
}
if (!TG_BOT_TOKEN || !TG_BOT_USERNAME || !TG_BOT_INTERNAL_SECRET) {
  console.warn(
    '[warn] Telegram bot credentials are incomplete. TG_BOT_TOKEN, TG_BOT_USERNAME and TG_BOT_INTERNAL_SECRET are required for Telegram auth.'
  );
}

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = (process.env.CORS_ORIGINS ?? defaultOrigins.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const STATUS_VALUES = ['in_review', 'in_design', 'printing', 'ready', 'shipped', 'delivered'];
const STATUS_SET = new Set(STATUS_VALUES);
const STATUS_LABELS = {
  in_review: 'На проверке у Fate',
  in_design: 'Готовится дизайн',
  printing: 'Печатается',
  ready: 'Готов к выдаче',
  shipped: 'Отправлен',
  delivered: 'Доставлен'
};

const TELEGRAM_HASH_SECRET = TG_BOT_TOKEN
  ? crypto.createHash('sha256').update(TG_BOT_TOKEN).digest()
  : null;
const TELEGRAM_AUTH_MAX_AGE = 24 * 60 * 60; // 1 day in seconds
const TELEGRAM_NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingLogins = new Map();

const BASE_USER_FIELDS = `id, name, email, is_admin, cover, ordered, status, created_at,
  telegram_id, telegram_username, telegram_first_name, telegram_last_name, telegram_phone`;
const USER_WITH_PASS_FIELDS = `${BASE_USER_FIELDS}, pass_hash`;

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128)
});

const adminLoginSchema = loginSchema.extend({
  secretKey: z.string().min(1)
});

const answersSchema = z.object({
  entries: z
    .array(
      z.object({
        questionIndex: z.coerce.number().int().min(0),
        text: z.string().max(5000)
      })
    )
    .max(500)
});

const coverSchema = z.object({
  name: z.string().max(500).optional()
});

const orderSchema = z.object({
  ordered: z.coerce.boolean()
});

const statusSchema = z
  .object({
    status: z.union([z.string(), z.null()])
  })
  .refine((data) => data.status === null || STATUS_SET.has(data.status), {
    message: 'INVALID_STATUS'
  });

function parseBody(schema, payload) {
  const result = schema.safeParse(payload ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const err = new Error('VALIDATION_ERROR');
    err.status = 400;
    err.details = issue?.message ?? 'Invalid payload';
    throw err;
  }
  return result.data;
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function cookieOpts() {
  return {
    httpOnly: true,
    secure: PROD,
    sameSite: 'strict',
    path: '/'
  };
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

async function ensureSchema() {
  const schemaPath = join(__dirname, 'db', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  await query(sql);
}

async function seedAdmin() {
  const emailRaw = process.env.SEED_ADMIN_EMAIL;
  const pass = process.env.SEED_ADMIN_PASSWORD;
  if (!emailRaw || !pass) return;

  const email = sanitizeEmail(emailRaw);
  const existing = await query(
    'SELECT id FROM app_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email]
  );
  if (existing.rowCount > 0) {
    return;
  }
  const passHash = await bcrypt.hash(pass, 12);
  const id = nanoid();
  await query(
    `INSERT INTO app_users (id, name, email, pass_hash, is_admin)
     VALUES ($1, $2, $3, $4, TRUE)`,
    [id, 'Fate Admin', email, passHash]
  );
  console.log('Seeded admin:', email);
}

async function fetchUserByEmail(email) {
  const { rows } = await query(
    `SELECT ${USER_WITH_PASS_FIELDS}
     FROM app_users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

async function fetchUserById(id) {
  const { rows } = await query(
    `SELECT ${BASE_USER_FIELDS}
     FROM app_users
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"]
      }
    },
    referrerPolicy: { policy: 'no-referrer' }
  })
);

function issueCsrf(req, res) {
  const token = nanoid(32);
  res.cookie('csrf_token', token, {
    httpOnly: false,
    secure: PROD,
    sameSite: 'strict',
    path: '/'
  });
  return token;
}

function csrfRequired(req, res, next) {
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies['csrf_token'];
  if (!header || !cookie || header !== cookie) {
    return res.status(403).json({ error: 'CSRF_INVALID' });
  }
  next();
}

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/csrf', (req, res) => res.json({ token: issueCsrf(req, res) }));

function authRequired(req, res, next) {
  const token = req.cookies['fate_token'];
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
}

app.post(
  '/api/auth/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = parseBody(registerSchema, req.body);
    const normalizedEmail = sanitizeEmail(email);
    const existing = await fetchUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'EMAIL_TAKEN' });
    }
    const passHash = await bcrypt.hash(password, 12);
    const id = nanoid();
    const { rows } = await query(
      `INSERT INTO app_users (id, name, email, pass_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, is_admin`,
      [id, name, normalizedEmail, passHash]
    );
    const user = rows[0];
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: !!user.is_admin
    });
    res.cookie('fate_token', token, cookieOpts());
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: !!user.is_admin
    });
  })
);

app.post(
  '/api/auth/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const normalizedEmail = sanitizeEmail(email);
    const user = await fetchUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    const ok = await bcrypt.compare(password, user.pass_hash);
    if (!ok) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: !!user.is_admin
    });
    res.cookie('fate_token', token, cookieOpts());
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: !!user.is_admin
    });
  })
);

app.post(
  '/api/admin/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, secretKey } = parseBody(adminLoginSchema, req.body);
    if (secretKey !== ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'INVALID_SECRET' });
    }
    const normalizedEmail = sanitizeEmail(email);
    const user = await fetchUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    const ok = await bcrypt.compare(password, user.pass_hash);
    if (!ok) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }
    if (!user.is_admin) {
      await query('UPDATE app_users SET is_admin = TRUE WHERE id = $1', [user.id]);
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: true
    });
    res.cookie('fate_token', token, cookieOpts());
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: true
    });
  })
);

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('fate_token', cookieOpts());
  res.json({ ok: true });
});

app.get(
  '/api/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await fetchUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM answers WHERE user_id = $1', [
      user.id
    ]);
    const answersCount = Number(rows[0]?.count ?? 0);
    const status = user.status ?? null;
    const statusLabel = status ? STATUS_LABELS[status] ?? null : null;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: !!user.is_admin,
      cover: user.cover ?? null,
      ordered: !!user.ordered,
      status,
      statusLabel,
      answersCount
    });
  })
);

app.get(
  '/api/questions',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT text
       FROM user_questions
       WHERE user_id = $1
       ORDER BY position ASC`,
      [req.user.id]
    );
    res.json(rows.map((row) => row.text));
  })
);

app.get(
  '/api/answers',
  authRequired,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT question_index, answer_text, created_at
       FROM answers
       WHERE user_id = $1
       ORDER BY question_index ASC, created_at ASC`,
      [req.user.id]
    );
    res.json(
      rows.map((row) => ({
        questionIndex: row.question_index,
        text: row.answer_text,
        createdAt: row.created_at
      }))
    );
  })
);

app.post(
  '/api/answers',
  authRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { entries } = parseBody(answersSchema, req.body);
    await transaction(async (client) => {
      await client.query('DELETE FROM answers WHERE user_id = $1', [req.user.id]);
      for (const entry of entries) {
        await client.query(
          `INSERT INTO answers (user_id, question_index, answer_text)
           VALUES ($1, $2, $3)`,
          [req.user.id, entry.questionIndex, entry.text]
        );
      }
    });
    res.json({ ok: true });
  })
);

app.post(
  '/api/cover',
  authRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { name } = parseBody(coverSchema, req.body);
    const value = (name ?? '').trim();
    const cover = value.length > 0 ? value : null;
    await query('UPDATE app_users SET cover = $2 WHERE id = $1', [req.user.id, cover]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/complete',
  authRequired,
  csrfRequired,
  writeLimiter,
  (_req, res) => {
    res.json({ ok: true });
  }
);

app.get(
  '/api/admin/users',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.is_admin,
         u.cover,
         u.ordered,
         u.status,
         u.created_at,
         COALESCE(a.answers_count, 0) AS answers_count,
         COALESCE(q.questions_count, 0) AS questions_count
       FROM app_users u
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS answers_count
         FROM answers
         WHERE user_id = u.id
       ) a ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS questions_count
         FROM user_questions
         WHERE user_id = u.id
       ) q ON TRUE
       ORDER BY u.created_at DESC`
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        isAdmin: !!row.is_admin,
        cover: row.cover ?? null,
        ordered: !!row.ordered,
        status: row.status ?? null,
        answersCount: Number(row.answers_count ?? 0),
        questionsCount: Number(row.questions_count ?? 0),
        createdAt: row.created_at
      }))
    );
  })
);

app.get(
  '/api/admin/users/:id',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const answers = await query(
      `SELECT question_index, answer_text, created_at
       FROM answers
       WHERE user_id = $1
       ORDER BY question_index ASC, created_at ASC`,
      [user.id]
    );
    const questions = await query(
      `SELECT text
       FROM user_questions
       WHERE user_id = $1
       ORDER BY position ASC`,
      [user.id]
    );
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: !!user.is_admin,
      cover: user.cover ?? null,
      ordered: !!user.ordered,
      status: user.status ?? null,
      answers: answers.rows.map((row) => ({
        questionIndex: row.question_index,
        text: row.answer_text,
        createdAt: row.created_at
      })),
      questions: questions.rows.map((row) => row.text),
      createdAt: user.created_at
    });
  })
);

app.post(
  '/api/admin/users/:id/questions',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const modeRaw = typeof req.body?.mode === 'string' ? req.body.mode : 'append';
    const mode = modeRaw === 'replace' ? 'replace' : 'append';
    const questionsArray = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const bulkRaw = typeof req.body?.bulk === 'string' ? req.body.bulk : '';

    const parsed = [];
    for (const item of questionsArray) {
      if (typeof item === 'string') {
        const value = item.trim();
        if (value) parsed.push(value);
      }
    }
    if (bulkRaw) {
      bulkRaw.split('$').forEach((rawPart) => {
        const value = rawPart.trim();
        if (value) parsed.push(value);
      });
    }

    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    let total = 0;
    await transaction(async (client) => {
      if (mode === 'replace') {
        await client.query('DELETE FROM user_questions WHERE user_id = $1', [user.id]);
      }
      let startIndex = 0;
      if (mode === 'append') {
        const maxPosition = await client.query(
          'SELECT COALESCE(MAX(position), -1) AS max FROM user_questions WHERE user_id = $1',
          [user.id]
        );
        startIndex = Number(maxPosition.rows[0]?.max ?? -1) + 1;
      }
      const limited = parsed.slice(0, 500);
      for (let idx = 0; idx < limited.length; idx += 1) {
        const question = limited[idx];
        await client.query(
          `INSERT INTO user_questions (user_id, position, text)
           VALUES ($1, $2, $3)`,
          [user.id, startIndex + idx, question]
        );
      }
      const countRes = await client.query(
        'SELECT COUNT(*)::int AS count FROM user_questions WHERE user_id = $1',
        [user.id]
      );
      total = countRes.rows[0]?.count ?? 0;
    });

    res.json({ ok: true, count: total });
  })
);

app.post(
  '/api/admin/users/:id/order',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { ordered } = parseBody(orderSchema, req.body);
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    await query('UPDATE app_users SET ordered = $2 WHERE id = $1', [user.id, ordered]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/admin/users/:id/status',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { status } = parseBody(statusSchema, req.body);
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    await query('UPDATE app_users SET status = $2 WHERE id = $1', [user.id, status]);
    res.json({ ok: true });
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'ERROR',
      details: err.details ?? undefined
    });
  }
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

const bootstrap = (async () => {
  await ensureSchema();
  await seedAdmin();
})();

bootstrap
  .then(() => {
    app.listen(PORT, () => console.log(`Fate API http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });

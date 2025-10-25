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
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

import { query, transaction } from './db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);


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
  in_review: 'Редакция изучает материалы',
  in_design: 'Дизайн и вёрстка',
  printing: 'Печать тиража',
  ready: 'Готово к выдаче',
  shipped: 'Отправлено',
  delivered: 'Доставлено'
};

const TELEGRAM_HASH_SECRET = TG_BOT_TOKEN
  ? crypto.createHash('sha256').update(TG_BOT_TOKEN).digest()
  : null;
const TELEGRAM_AUTH_MAX_AGE = 24 * 60 * 60; // 1 day in seconds
const TELEGRAM_NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const pendingLogins = new Map();

const BASE_USER_FIELDS = `id, name, email, is_admin, cover, ordered, status,
  interview_locked, created_at,
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
        text: z.string().max(100000)
      })
    )
    .max(500)
});

const coverSchema = z
  .object({
    name: z.string().max(500).optional(),
    slug: z.string().trim().max(120).optional(),
    label: z.string().trim().max(500).optional(),
    subtitle: z.string().trim().max(500).optional()
  })
  .refine((data) => {
    if (data.slug && data.slug.trim().length > 0) return true;
    return typeof data.name === 'string' && data.name.trim().length > 0;
  }, {
    message: 'INVALID_COVER'
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

const templateUpsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  questions: z.array(z.string().trim()).optional(),
  bulk: z.string().optional()
});

const telegramWidgetSchema = z.object({
  id: z.union([z.string(), z.number()]),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.union([z.string(), z.number()]),
  hash: z.string()
});

const telegramClaimSchema = z.object({
  nonce: z.string().min(16).max(256),
  tg_id: z.union([z.string(), z.number()]),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  phone: z.string().optional()
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

function normalizeQuestionsInput(payload) {
  const questionsArray = Array.isArray(payload?.questions) ? payload.questions : [];
  const bulkRaw = typeof payload?.bulk === 'string' ? payload.bulk : '';

  const normalized = [];
  for (const entry of questionsArray) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed) normalized.push(trimmed);
  }

  if (bulkRaw) {
    for (const chunk of bulkRaw.split('$')) {
      const trimmed = chunk.trim();
      if (trimmed) {
        normalized.push(trimmed);
      }
    }
  }

  return normalized;
}

function getQueryRunner(client) {
  return client ? client.query.bind(client) : query;
}

async function resequenceUserQuestions(userId, client) {
  const run = getQueryRunner(client);
  const { rows } = await run(
    `SELECT q.id,
            q.chapter_id,
            q.chapter_position,
            q.position,
            COALESCE(c.position, 0) AS chapter_order
     FROM user_questions q
     LEFT JOIN user_question_chapters c ON c.id = q.chapter_id
     WHERE q.user_id = $1
     ORDER BY COALESCE(c.position, 0) ASC, q.chapter_position ASC, q.position ASC, q.id ASC`,
    [userId]
  );

  const chapterCounters = new Map();
  let globalPosition = 0;

  for (const row of rows) {
    const chapterId = row.chapter_id ?? null;
    const nextChapterPos = chapterCounters.get(chapterId) ?? 0;
    if (row.chapter_position !== nextChapterPos) {
      await run(
        `UPDATE user_questions
         SET chapter_position = $2
         WHERE id = $1`,
        [row.id, nextChapterPos]
      );
    }
    chapterCounters.set(chapterId, nextChapterPos + 1);
    if (row.position !== globalPosition) {
      await run(
        `UPDATE user_questions
         SET position = $2
         WHERE id = $1`,
        [row.id, globalPosition]
      );
    }
    globalPosition += 1;
  }

  return globalPosition;
}

async function ensureUserChapters(userId, client) {
  const run = getQueryRunner(client);
  let modified = false;

  let existing = await run(
    `SELECT id, position, title
     FROM user_question_chapters
     WHERE user_id = $1
     ORDER BY position ASC`,
    [userId]
  );

  if (existing.rows.length === 0) {
    const inserted = await run(
      `INSERT INTO user_question_chapters (user_id, position, title)
       VALUES ($1, 0, NULL)
       RETURNING id, position, title`,
      [userId]
    );
    const defaultChapter = inserted.rows[0];
    const questions = await run(
      `SELECT id
       FROM user_questions
       WHERE user_id = $1
       ORDER BY position ASC, id ASC`,
      [userId]
    );
    for (let idx = 0; idx < questions.rows.length; idx += 1) {
      const question = questions.rows[idx];
      await run(
        `UPDATE user_questions
         SET chapter_id = $2,
             chapter_position = $3
         WHERE id = $1`,
        [question.id, defaultChapter.id, idx]
      );
    }
    modified = true;
  } else {
    const missingAssignments = await run(
      `SELECT id
       FROM user_questions
       WHERE user_id = $1
         AND chapter_id IS NULL
       ORDER BY position ASC, id ASC`,
      [userId]
    );
    if (missingAssignments.rows.length > 0) {
      const targetChapterId = existing.rows[0].id;
      const maxChapterPos = await run(
        `SELECT COALESCE(MAX(chapter_position), -1) AS max
         FROM user_questions
         WHERE chapter_id = $1`,
        [targetChapterId]
      );
      let chapterPos = Number(maxChapterPos.rows[0]?.max ?? -1) + 1;
      for (const row of missingAssignments.rows) {
        await run(
          `UPDATE user_questions
           SET chapter_id = $2,
               chapter_position = $3
           WHERE id = $1`,
          [row.id, targetChapterId, chapterPos]
        );
        chapterPos += 1;
      }
      modified = true;
    }
  }

  if (modified) {
    await resequenceUserQuestions(userId, client);
    existing = await run(
      `SELECT id, position, title
       FROM user_question_chapters
       WHERE user_id = $1
       ORDER BY position ASC`,
      [userId]
    );
  }

  return existing.rows;
}

async function loadUserQuestionMap(userId, client) {
  const run = getQueryRunner(client);
  await ensureUserChapters(userId, client);
  await resequenceUserQuestions(userId, client);

  const { rows } = await run(
    `SELECT
       c.id AS chapter_id,
       c.position AS chapter_position,
       c.title AS chapter_title,
       q.id AS question_id,
       q.text AS question_text,
       q.position AS question_position,
       q.chapter_position AS question_chapter_position
     FROM user_question_chapters c
     LEFT JOIN user_questions q
       ON q.chapter_id = c.id
     WHERE c.user_id = $1
     ORDER BY c.position ASC, q.chapter_position ASC, q.position ASC, q.id ASC`,
    [userId]
  );

  const chapters = [];
  const chapterMap = new Map();

  for (const row of rows) {
    let chapter = chapterMap.get(row.chapter_id);
    if (!chapter) {
      chapter = {
        id: row.chapter_id,
        position: row.chapter_position ?? 0,
        title: row.chapter_title ?? null,
        questions: []
      };
      chapterMap.set(row.chapter_id, chapter);
      chapters.push(chapter);
    }
    if (row.question_id) {
      chapter.questions.push({
        id: row.question_id,
        index: row.question_position ?? 0,
        chapterPosition: row.question_chapter_position ?? chapter.questions.length,
        text: row.question_text
      });
    }
  }

  chapters.sort((a, b) => a.position - b.position);

  let globalIndex = 0;
  const flatQuestions = [];

  for (const chapter of chapters) {
    chapter.questions.sort((a, b) => a.chapterPosition - b.chapterPosition);
    chapter.startIndex = globalIndex;
    const normalizedQuestions = [];
    for (let i = 0; i < chapter.questions.length; i += 1) {
      const question = chapter.questions[i];
      const payload = {
        id: question.id,
        index: globalIndex,
        chapterId: chapter.id,
        chapterPosition: i,
        text: question.text
      };
      normalizedQuestions.push(payload);
      flatQuestions.push(payload);
      globalIndex += 1;
    }
    chapter.questions = normalizedQuestions;
    chapter.questionCount = normalizedQuestions.length;
  }

  return {
    chapters,
    flatQuestions,
    totalQuestions: flatQuestions.length
  };
}

function presentQuestionStructure(structure) {
  return {
    chapters: structure.chapters.map((chapter) => ({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title,
      startIndex: chapter.startIndex,
      questionCount: chapter.questionCount
    })),
    questions: structure.flatQuestions.map((entry) => ({
      id: entry.id,
      index: entry.index,
      chapterId: entry.chapterId,
      chapterPosition: entry.chapterPosition,
      text: entry.text
    })),
    totalQuestions: structure.totalQuestions
  };
}

async function pruneUserAnswers(userId, totalQuestions, client) {
  const run = getQueryRunner(client);
  await run(
    `DELETE FROM answers
     WHERE user_id = $1
       AND question_index >= $2`,
    [userId, totalQuestions]
  );
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

async function normalizeTelegramEmails() {
  await query(
    `UPDATE app_users
     SET email = NULL
     WHERE email IS NOT NULL
       AND email ILIKE 'tg%@telegram.local'`
  );
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

async function fetchUserByTelegramId(telegramId) {
  const { rows } = await query(
    `SELECT ${BASE_USER_FIELDS}
     FROM app_users
     WHERE telegram_id = $1
     LIMIT 1`,
    [telegramId]
  );
  return rows[0] ?? null;
}

async function fetchTemplateById(id) {
  const templateRes = await query(
    `SELECT id, title, description, created_at, updated_at
     FROM question_templates
     WHERE id = $1`,
    [id]
  );
  const template = templateRes.rows[0] ?? null;
  if (!template) {
    return null;
  }
  const itemsRes = await query(
    `SELECT text
     FROM question_template_items
     WHERE template_id = $1
     ORDER BY position ASC`,
    [id]
  );
  return {
    ...template,
    questions: itemsRes.rows.map((row) => row.text)
  };
}

function mapTelegram(row) {
  if (!row?.telegram_id) {
    return null;
  }
  return {
    id: row.telegram_id,
    username: row.telegram_username ?? undefined,
    first_name: row.telegram_first_name ?? undefined,
    last_name: row.telegram_last_name ?? undefined,
    phone: row.telegram_phone ?? null
  };
}

function normalizeUserEmail(email) {
  if (typeof email !== 'string') {
    return email ?? null;
  }
  const trimmed = email.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.toLowerCase().endsWith('@telegram.local')) {
    return null;
  }
  return trimmed;
}

function parseCoverRowValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) {
    const slug = typeof raw.slug === 'string' ? raw.slug : null;
    const label = typeof raw.label === 'string' ? raw.label : null;
    const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle : null;
    return { slug, label, subtitle };
  }
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const slug = typeof parsed.slug === 'string' ? parsed.slug : null;
      const label = typeof parsed.label === 'string' ? parsed.label : null;
      const subtitle = typeof parsed.subtitle === 'string' ? parsed.subtitle : null;
      if (slug || label) {
        return { slug, label, subtitle };
      }
    }
  } catch (_error) {
    // ignore parsing issues, fall back to legacy behaviour
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return {
    slug: null,
    label: trimmed,
    subtitle: null
  };
}

const COVER_DEFINITIONS = [
  {
    slug: 'custom',
    title: 'Индивидуальный дизайн',
    subtitle: 'Создадим обложку специально под вашу историю',
    aliases: ['индивидуальный дизайн — создадим обложку специально под вашу историю']
  },
  {
    slug: 'temp-1',
    title: 'Нежный архив',
    subtitle: 'Тёплые оттенки и мягкая фактура для семейных историй',
    aliases: ['нежный архив — тёплые оттенки и мягкая фактура для семейных историй']
  },
  {
    slug: 'temp-2',
    title: 'Современная геометрия',
    subtitle: 'Выразительная композиция и лаконичные линии',
    aliases: ['современная геометрия — выразительная композиция и лаконичные линии', 'main_temp']
  }
];

function matchCoverDefinitionByLabel(label) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  const direct =
    COVER_DEFINITIONS.find((entry) => normalized === entry.title.trim().toLowerCase()) ?? null;
  if (direct) return direct;
  const startsWith =
    COVER_DEFINITIONS.find((entry) =>
      normalized.startsWith(entry.title.trim().toLowerCase())
    ) ?? null;
  if (startsWith) return startsWith;
  return (
    COVER_DEFINITIONS.find((entry) =>
      Array.isArray(entry.aliases)
        ? entry.aliases.some(
            (alias) => typeof alias === 'string' && normalized === alias.trim().toLowerCase()
          )
        : false
    ) ?? null
  );
}

function normalizeCoverValue(rawValue) {
  const parsed = parseCoverRowValue(rawValue);
  if (!parsed) {
    return {
      payload: null,
      slug: null,
      title: null,
      subtitle: null,
      label: null,
      raw: rawValue ?? null
    };
  }

  let { slug, label, subtitle } = parsed;
  if (typeof slug === 'string') {
    slug = slug.trim();
    if (!slug.length) slug = null;
  }
  if (typeof label === 'string') {
    label = label.trim();
    if (!label.length) label = null;
  }
  if (typeof subtitle === 'string') {
    subtitle = subtitle.trim();
    if (!subtitle.length) subtitle = null;
  }

  const definition = slug
    ? COVER_DEFINITIONS.find((entry) => entry.slug === slug)
    : matchCoverDefinitionByLabel(label);

  const separators = [' — ', ' - ', '—', '-'];

  const extractSubtitle = (text) => {
    if (!text) return null;
    for (const separator of separators) {
      if (text.includes(separator)) {
        const parts = text.split(separator);
        if (parts.length > 1) {
          const candidate = parts.slice(1).join(separator).trim();
          if (candidate) {
            return candidate;
          }
        }
      }
    }
    return null;
  };

  const derivedSlug = slug ?? definition?.slug ?? null;
  const title =
    definition?.title ??
    (label
      ? (() => {
          for (const separator of separators) {
            if (label.includes(separator)) {
              const candidate = label.split(separator)[0].trim();
              if (candidate) return candidate;
            }
          }
          return label.trim();
        })()
      : null);
  let resolvedSubtitle = subtitle ?? definition?.subtitle ?? null;
  if (!resolvedSubtitle && label) {
    resolvedSubtitle = extractSubtitle(label);
  }

  const payload =
    derivedSlug || label || resolvedSubtitle
      ? {
          slug: derivedSlug,
          label,
          subtitle: resolvedSubtitle
        }
      : null;

  return {
    payload,
    slug: derivedSlug,
    title,
    subtitle: resolvedSubtitle,
    label,
    raw: rawValue ?? null
  };
}

function presentUser(row) {
  const status = row.status ?? null;
  const coverInfo = normalizeCoverValue(row.cover);
  return {
    id: row.id,
    name: row.name,
    email: normalizeUserEmail(row.email),
    isAdmin: !!row.is_admin,
    cover: coverInfo.payload,
    coverSlug: coverInfo.slug,
    coverTitle: coverInfo.title,
    coverSubtitle: coverInfo.subtitle,
    coverLabel:
      coverInfo.label ??
      coverInfo.title ??
      (typeof row.cover === 'string' ? row.cover : null),
    coverRaw: coverInfo.raw,
    ordered: !!row.ordered,
    status,
    statusLabel: status ? STATUS_LABELS[status] ?? null : null,
    interviewLocked: !!row.interview_locked,
    createdAt: row.created_at,
    telegram: mapTelegram(row)
  };
}

function presentTemplate(row, questions) {
  const list = Array.isArray(questions) ? questions : row.questions;
  const questionCount = Number(
    row.question_count ?? row.questions_count ?? (Array.isArray(list) ? list.length : 0) ?? 0
  );
  const firstQuestion =
    typeof row.first_question === 'string'
      ? row.first_question
      : Array.isArray(list) && typeof list[0] === 'string'
      ? list[0]
      : null;
  const payload = {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questionCount,
    firstQuestion
  };
  if (Array.isArray(list)) {
    payload.questions = list;
  }
  return payload;
}

function tokenPayload(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: !!row.is_admin
  };
}

function issueAuthResponse(res, row, status = 200) {
  const token = signToken(tokenPayload(row));
  res.cookie('fate_token', token, cookieOpts());
  return res.status(status).json(presentUser(row));
}

function cleanupExpiredLogins() {
  const now = Date.now();
  for (const [nonce, entry] of pendingLogins) {
    if (now - entry.ts > TELEGRAM_NONCE_TTL_MS) {
      pendingLogins.delete(nonce);
    }
  }
}

function verifyTelegramAuth(auth) {
  if (!TELEGRAM_HASH_SECRET) {
    return false;
  }
  if (!auth || typeof auth !== 'object') {
    return false;
  }
  const hash = typeof auth.hash === 'string' ? auth.hash : '';
  if (!hash) {
    return false;
  }
  const dataPairs = Object.entries(auth)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort();
  const dataCheckString = dataPairs.join('\n');

  const hmac = crypto.createHmac('sha256', TELEGRAM_HASH_SECRET);
  const calculated = hmac.update(dataCheckString).digest();

  let provided;
  try {
    provided = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  if (provided.length !== calculated.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(provided, calculated)) {
    return false;
  }

  const authDateRaw = auth.auth_date ?? auth.authDate;
  const authDate = Number.parseInt(String(authDateRaw ?? ''), 10);
  if (!Number.isFinite(authDate)) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (authDate > now + 60) {
    return false;
  }
  if (now - authDate > TELEGRAM_AUTH_MAX_AGE) {
    return false;
  }
  return true;
}

async function findOrCreateUserFromTelegram(tg, { phone } = {}) {
  if (!tg || tg.id === undefined || tg.id === null) {
    throw new Error('TELEGRAM_ID_REQUIRED');
  }
  const telegramId = String(tg.id);
  let user = await fetchUserByTelegramId(telegramId);
  const username = tg.username ? tg.username.trim() || null : null;
  const firstName = tg.first_name ? tg.first_name.trim() || null : null;
  const lastName = tg.last_name ? tg.last_name.trim() || null : null;

  if (!user) {
    const displayNameParts = [firstName, lastName].filter(Boolean);
    const displayName = displayNameParts.length
      ? displayNameParts.join(' ')
      : username
        ? `@${username}`
        : `Telegram user ${telegramId}`;
    const randomPass = crypto.randomBytes(32).toString('hex');
    const passHash = await bcrypt.hash(randomPass, 12);
    const id = nanoid();
    const { rows } = await query(
      `INSERT INTO app_users (
         id, name, email, pass_hash,
         telegram_id, telegram_username, telegram_first_name, telegram_last_name, telegram_phone
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${BASE_USER_FIELDS}`,
      [id, displayName, null, passHash, telegramId, username, firstName, lastName, phone ?? null]
    );
    user = rows[0];
  } else {
    const { rows } = await query(
      `UPDATE app_users
       SET telegram_username = $2,
           telegram_first_name = $3,
           telegram_last_name = $4,
           telegram_phone = COALESCE($5, telegram_phone)
       WHERE id = $1
       RETURNING ${BASE_USER_FIELDS}`,
      [user.id, username, firstName, lastName, phone ?? null]
    );
    user = rows[0];
  }
  return user;
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
        'script-src': ["'self'", 'https://telegram.org'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https://telegram.org'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"],
        'frame-src': ["'self'", 'https://oauth.telegram.org'],
        'connect-src': ["'self'", 'https://oauth.telegram.org']
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

const tgPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
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
       RETURNING ${BASE_USER_FIELDS}`,
      [id, name, normalizedEmail, passHash]
    );
    const user = rows[0];
    return issueAuthResponse(res, user, 201);
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
    return issueAuthResponse(res, user);
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
      user.is_admin = true;
    }
    return issueAuthResponse(res, user);
  })
);

app.post(
  '/api/auth/tg_verify',
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!TELEGRAM_HASH_SECRET) {
      return res.status(503).json({ error: 'TELEGRAM_AUTH_DISABLED' });
    }
    if (!verifyTelegramAuth(req.body ?? {})) {
      return res.status(401).json({ error: 'INVALID_TELEGRAM_SIGNATURE' });
    }
    const data = parseBody(telegramWidgetSchema, req.body);
    const user = await findOrCreateUserFromTelegram({
      id: data.id,
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name
    });
    return issueAuthResponse(res, user);
  })
);

app.post(
  '/api/auth/tg_init',
  authLimiter,
  asyncHandler(async (_req, res) => {
    if (!TG_BOT_USERNAME) {
      return res.status(503).json({ error: 'TELEGRAM_AUTH_DISABLED' });
    }
    cleanupExpiredLogins();
    let nonce;
    do {
      nonce = crypto.randomBytes(32).toString('hex');
    } while (pendingLogins.has(nonce));
    pendingLogins.set(nonce, { userId: null, ts: Date.now(), consumed: false });
    res.json({
      nonce,
      tme: `https://t.me/${TG_BOT_USERNAME}?start=${nonce}`,
      site: SITE_URL,
      api: API_BASE
    });
  })
);

app.post(
  '/api/auth/tg_claim',
  asyncHandler(async (req, res) => {
    if (!TG_BOT_INTERNAL_SECRET) {
      return res.status(503).json({ error: 'TELEGRAM_AUTH_DISABLED' });
    }
    const secretHeader = req.headers['x-tg-bot-secret'];
    if (secretHeader !== TG_BOT_INTERNAL_SECRET) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    cleanupExpiredLogins();
    const claim = parseBody(telegramClaimSchema, req.body);
    const nonce = claim.nonce;
    const entry = pendingLogins.get(nonce);
    if (!entry) {
      return res.status(404).json({ error: 'NONCE_NOT_FOUND' });
    }
    if (Date.now() - entry.ts > TELEGRAM_NONCE_TTL_MS) {
      pendingLogins.delete(nonce);
      return res.status(410).json({ error: 'NONCE_EXPIRED' });
    }
    const phone = claim.phone ? String(claim.phone).trim() || null : undefined;
    const user = await findOrCreateUserFromTelegram(
      {
        id: claim.tg_id,
        username: claim.username,
        first_name: claim.first_name,
        last_name: claim.last_name
      },
      { phone }
    );
    entry.userId = user.id;
    entry.ts = Date.now();
    entry.consumed = false;
    res.json({ ok: true });
  })
);

app.get(
  '/api/auth/tg_poll',
  tgPollLimiter,
  asyncHandler(async (req, res) => {
    const nonce = typeof req.query?.nonce === 'string' ? req.query.nonce : '';
    if (!nonce) {
      return res.status(400).json({ error: 'NONCE_REQUIRED' });
    }
    cleanupExpiredLogins();
    const entry = pendingLogins.get(nonce);
    if (!entry) {
      return res.json({ ready: false });
    }
    if (!entry.userId) {
      return res.json({ ready: false });
    }
    if (entry.consumed) {
      return res.json({ ready: false });
    }
    entry.consumed = true;
    entry.ts = Date.now();
    const user = await fetchUserById(entry.userId);
    if (!user) {
      pendingLogins.delete(nonce);
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return issueAuthResponse(res, user);
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
    const payload = presentUser(user);
    res.json({
      ...payload,
      answersCount
    });
  })
);

app.get(
  '/api/questions',
  authRequired,
  asyncHandler(async (req, res) => {
    const structure = await loadUserQuestionMap(req.user.id);
    res.json(presentQuestionStructure(structure));
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
    const me = await fetchUserById(req.user.id);
    if (me?.interview_locked) {
      return res.status(403).json({ error: 'INTERVIEW_LOCKED' });
    }

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
    const { name, slug, label, subtitle } = parseBody(coverSchema, req.body);
    let storedValue = null;
    if (slug && slug.trim().length > 0) {
      storedValue = JSON.stringify({
        slug: slug.trim(),
        label: typeof label === 'string' ? label.trim() : null,
        subtitle: typeof subtitle === 'string' ? subtitle.trim() : null,
        legacy: typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined
      });
    } else {
      const value = (name ?? '').trim();
      storedValue = value.length > 0 ? value : null;
    }

    await query('UPDATE app_users SET cover = $2 WHERE id = $1', [req.user.id, storedValue]);

    const normalized = normalizeCoverValue(storedValue);
    res.json({
      ok: true,
      cover: normalized.payload,
      coverSlug: normalized.slug,
      coverTitle: normalized.title,
      coverSubtitle: normalized.subtitle,
      coverLabel: normalized.label
    });
  })
);

app.post(
  '/api/complete',
  authRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `UPDATE app_users
         SET interview_locked = TRUE,
             status = COALESCE(status, $2)
       WHERE id = $1
       RETURNING status, interview_locked`,
      [req.user.id, 'in_review']
    );
    const status = rows[0]?.status ?? null;
    const statusLabel = status ? (STATUS_LABELS[status] ?? null) : null;
    const interviewLocked = !!rows[0]?.interview_locked;
    res.json({ ok: true, status, statusLabel, interviewLocked });
  })
);

app.get(
  '/api/admin/templates',
  authRequired,
  adminRequired,
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.created_at,
         t.updated_at,
         COALESCE(q.question_count, 0) AS question_count,
         first.text AS first_question
       FROM question_templates t
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS question_count
         FROM question_template_items
         WHERE template_id = t.id
       ) q ON TRUE
       LEFT JOIN LATERAL (
         SELECT text
         FROM question_template_items
         WHERE template_id = t.id
         ORDER BY position ASC
         LIMIT 1
       ) first ON TRUE
       ORDER BY t.updated_at DESC, t.created_at DESC`
    );
    res.json({
      templates: rows.map((row) => presentTemplate(row))
    });
  })
);

app.get(
  '/api/admin/templates/:id',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const template = await fetchTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    res.json(presentTemplate(template, template.questions));
  })
);

app.post(
  '/api/admin/templates',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const payload = parseBody(templateUpsertSchema, req.body);
    const questions = normalizeQuestionsInput(payload);
    if (questions.length === 0) {
      return res.status(400).json({
        error: 'NO_QUESTIONS',
        message: 'Template must include at least one question.'
      });
    }
    const description =
      typeof payload.description === 'string' && payload.description.length
        ? payload.description
        : null;
    const id = nanoid();
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO question_templates (id, title, description)
         VALUES ($1, $2, $3)`,
        [id, payload.title, description]
      );
      for (let idx = 0; idx < questions.length; idx += 1) {
        await client.query(
          `INSERT INTO question_template_items (template_id, position, text)
           VALUES ($1, $2, $3)`,
          [id, idx, questions[idx]]
        );
      }
    });
    const template = await fetchTemplateById(id);
    res.status(201).json(presentTemplate(template, template.questions));
  })
);

app.put(
  '/api/admin/templates/:id',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const payload = parseBody(templateUpsertSchema, req.body);
    const questions = normalizeQuestionsInput(payload);
    if (questions.length === 0) {
      return res.status(400).json({
        error: 'NO_QUESTIONS',
        message: 'Template must include at least one question.'
      });
    }
    const existing = await fetchTemplateById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const description =
      typeof payload.description === 'string' && payload.description.length
        ? payload.description
        : null;
    await transaction(async (client) => {
      await client.query(
        `UPDATE question_templates
         SET title = $2,
             description = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [existing.id, payload.title, description]
      );
      await client.query('DELETE FROM question_template_items WHERE template_id = $1', [
        existing.id
      ]);
      for (let idx = 0; idx < questions.length; idx += 1) {
        await client.query(
          `INSERT INTO question_template_items (template_id, position, text)
           VALUES ($1, $2, $3)`,
          [existing.id, idx, questions[idx]]
        );
      }
    });
    const template = await fetchTemplateById(existing.id);
    res.json(presentTemplate(template, template.questions));
  })
);

app.delete(
  '/api/admin/templates/:id',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const result = await query(
      'DELETE FROM question_templates WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    res.status(204).send();
  })
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
         u.interview_locked,
         u.telegram_id,
         u.telegram_username,
         u.telegram_first_name,
         u.telegram_last_name,
         u.telegram_phone,
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
        ...presentUser(row),
        answersCount: Number(row.answers_count ?? 0),
        questionsCount: Number(row.questions_count ?? 0)
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
    const questionStructure = await loadUserQuestionMap(user.id);
    const payload = presentUser(user);
    res.json({
      ...payload,
      answers: answers.rows.map((row) => ({
        questionIndex: row.question_index,
        text: row.answer_text,
        createdAt: row.created_at
      })),
      questions: questionStructure.flatQuestions.map((entry) => entry.text),
      chapters: questionStructure.chapters.map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
        title: chapter.title,
        startIndex: chapter.startIndex,
        questionCount: chapter.questionCount,
        questions: chapter.questions.map((question) => ({
          id: question.id,
          index: question.index,
          chapterPosition: question.chapterPosition,
          text: question.text
        }))
      }))
    });
  })
);

app.get(
  '/api/admin/users/:id/export/answers',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const userRow = await fetchUserById(req.params.id);
    if (!userRow) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    const answersRes = await query(
      `SELECT question_index, answer_text, created_at
       FROM answers
       WHERE user_id = $1
       ORDER BY question_index ASC, created_at ASC`,
      [userRow.id]
    );
    const answers = answersRes.rows;
    const questionStructure = await loadUserQuestionMap(userRow.id);
    const questionMap = new Map(
      questionStructure.flatQuestions.map((entry) => [entry.index, entry.text])
    );
    const answerMap = new Map();
    answers.forEach((entry) => {
      const idx = Number(entry.question_index);
      if (!Number.isFinite(idx)) return;
      answerMap.set(idx, entry);
    });
    const user = presentUser(userRow);

    const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let latestAnswerDate = null;
    for (const entry of answers) {
      const stamp = entry.created_at ? new Date(entry.created_at) : null;
      if (!stamp || Number.isNaN(stamp.getTime())) {
        continue;
      }
      if (!latestAnswerDate || stamp > latestAnswerDate) {
        latestAnswerDate = stamp;
      }
    }
    const answerDateLabel = latestAnswerDate ? dateFormatter.format(latestAnswerDate) : 'нет данных';

    const contactParts = [];
    if (user.email) {
      contactParts.push(`Email: ${user.email}`);
    }

    const telegram = user.telegram ?? null;
    const telegramParts = [];
    if (telegram?.username) {
      telegramParts.push(`@${telegram.username}`);
    }
    const telegramName = [telegram?.first_name, telegram?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (telegramName) {
      telegramParts.push(telegramName);
    }
    if (telegram?.phone) {
      telegramParts.push(telegram.phone);
    }
    if (telegram?.id) {
      telegramParts.push(`ID: ${telegram.id}`);
    }
    if (telegramParts.length) {
      contactParts.push(`Telegram: ${telegramParts.join(' | ')}`);
    }
    const contactsLabel = contactParts.length ? contactParts.join('; ') : '—';

    const docChildren = [
      new Paragraph({
        text: 'Ответы пользователя',
        heading: HeadingLevel.HEADING1
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Дата ответов: ', bold: true }),
          new TextRun({ text: answerDateLabel })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'ФИО: ', bold: true }),
          new TextRun({ text: user.name || '—' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Контакты: ', bold: true }),
          new TextRun({ text: contactsLabel })
        ],
        spacing: { after: 300 }
      })
    ];

    const usedAnswerIndices = new Set();
    const chapterEntries = questionStructure.chapters
      .map((chapter, idx) => {
        const questions = Array.isArray(chapter?.questions) ? chapter.questions : [];
        const items = questions
          .map((question, qIdx) => {
            const questionIndex = Number(question?.index);
            if (!Number.isFinite(questionIndex)) {
              return null;
            }
            const answerEntry = answerMap.get(questionIndex);
            const answerText =
              typeof answerEntry?.answer_text === 'string'
                ? answerEntry.answer_text.trim()
                : '';
            if (!answerText.length) {
              return null;
            }
            usedAnswerIndices.add(questionIndex);
            const questionText =
              typeof question?.text === 'string' && question.text.trim().length
                ? question.text
                : questionMap.get(questionIndex) ?? `Вопрос ${questionIndex + 1}`;
            return {
              questionIndex,
              questionText,
              answerText,
              itemNumber: qIdx + 1,
              chapterNumber: idx + 1
            };
          })
          .filter(Boolean);

        if (items.length === 0) {
          return null;
        }

        const chapterLabel = chapter.title
          ? `Глава ${idx + 1}. ${chapter.title}`
          : `Глава ${idx + 1}`;

        return {
          title: chapterLabel,
          items
        };
      })
      .filter(Boolean);

    const orphanItems = [];
    answerMap.forEach((entry, questionIndex) => {
      if (usedAnswerIndices.has(questionIndex)) return;
      const answerText =
        typeof entry?.answer_text === 'string' ? entry.answer_text.trim() : '';
      if (!answerText.length) return;
      const questionText =
        questionMap.get(questionIndex) ?? `Вопрос ${questionIndex + 1}`;
      orphanItems.push({
        questionIndex,
        questionText,
        answerText,
        itemNumber: orphanItems.length + 1,
        chapterNumber: null
      });
    });

    if (orphanItems.length > 0) {
      chapterEntries.push({
        title: 'Без главы',
        items: orphanItems
      });
    }

    if (chapterEntries.length === 0) {
      docChildren.push(
        new Paragraph({
          text: 'Ответы пока не сохранены.'
        })
      );
    } else {
      chapterEntries.forEach((entry) => {
        docChildren.push(
          new Paragraph({
            text: entry.title,
            heading: HeadingLevel.HEADING2,
            spacing: { before: 240, after: 200 }
          })
        );

        entry.items.forEach((item) => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${item.itemNumber}. ${item.questionText}`,
                  bold: true
                })
              ],
              spacing: { after: 120 }
            })
          );

          const runs = [];
          const normalized = item.answerText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trimEnd();

          if (!normalized.length) {
            runs.push(new TextRun({ text: '—' }));
          } else {
            const lines = normalized.split('\n');
            lines.forEach((line, lineIndex) => {
              if (lineIndex > 0) {
                runs.push(new TextRun({ break: 1 }));
              }
              runs.push(new TextRun({ text: line }));
            });
          }

          docChildren.push(
            new Paragraph({
              children: runs,
              spacing: { after: 300 }
            })
          );
        });
      });
    }

    const document = new Document({
      sections: [
        {
          properties: {},
          children: docChildren
        }
      ]
    });

    const buffer = await Packer.toBuffer(document);
    const filename = `answers-${userRow.id}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  })
);

app.delete(
  '/api/admin/users/:id',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'CANNOT_DELETE_SELF' });
    }
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (user.is_admin) {
      return res.status(400).json({ error: 'CANNOT_DELETE_ADMIN' });
    }
    await query('DELETE FROM app_users WHERE id = $1', [user.id]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/admin/users/:id/chapters',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const titleRaw = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const chapter = await transaction(async (client) => {
      await ensureUserChapters(user.id, client);
      const maxRes = await client.query(
        `SELECT COALESCE(MAX(position), -1) AS max
         FROM user_question_chapters
         WHERE user_id = $1`,
        [user.id]
      );
      const nextPosition = Number(maxRes.rows[0]?.max ?? -1) + 1;
      const inserted = await client.query(
        `INSERT INTO user_question_chapters (user_id, position, title)
         VALUES ($1, $2, $3)
         RETURNING id, position, title`,
        [user.id, nextPosition, titleRaw.length ? titleRaw : null]
      );
      await resequenceUserQuestions(user.id, client);
      return inserted.rows[0];
    });
    res.status(201).json({
      id: chapter.id,
      position: chapter.position,
      title: chapter.title
    });
  })
);

app.get(
  '/api/admin/users/:id/questions',
  authRequired,
  adminRequired,
  asyncHandler(async (req, res) => {
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const structure = await loadUserQuestionMap(user.id);
    res.json(presentQuestionStructure(structure));
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
    const chapterIdRaw = req.body?.chapterId;
    const chapterId =
      typeof chapterIdRaw === 'number'
        ? chapterIdRaw
        : Number.parseInt(typeof chapterIdRaw === 'string' ? chapterIdRaw : '', 10);
    const questions = normalizeQuestionsInput(req.body);
    if (!Number.isInteger(chapterId)) {
      return res.status(400).json({ error: 'INVALID_CHAPTER' });
    }
    if (questions.length === 0 && mode === 'append') {
      return res.status(400).json({ error: 'NO_QUESTIONS' });
    }

    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    const logContext = {
      userId: user.id,
      chapterId,
      mode,
      requestCount: questions.length
    };
    console.info('[admin:addQuestions] start', logContext);

    try {
      const result = await transaction(async (client) => {
        await ensureUserChapters(user.id, client);
        const chapterRes = await client.query(
          `SELECT id, position, title
           FROM user_question_chapters
           WHERE id = $1
             AND user_id = $2`,
          [chapterId, user.id]
        );
        if (chapterRes.rowCount === 0) {
          const err = new Error('CHAPTER_NOT_FOUND');
          err.status = 404;
          throw err;
        }

        if (mode === 'replace') {
          await client.query(
            `DELETE FROM user_questions
             WHERE user_id = $1
               AND chapter_id = $2`,
            [user.id, chapterId]
          );
        }

        let added = 0;
        if (questions.length > 0) {
          let chapterPositionStart = 0;
          if (mode === 'append') {
            const maxRes = await client.query(
              `SELECT COALESCE(MAX(chapter_position), -1) AS max
               FROM user_questions
               WHERE user_id = $1
                 AND chapter_id = $2`,
              [user.id, chapterId]
            );
            chapterPositionStart = Number(maxRes.rows[0]?.max ?? -1) + 1;
          }

          for (let idx = 0; idx < questions.length; idx += 1) {
            const chapterPosition =
              mode === 'append' ? chapterPositionStart + idx : idx;
            await client.query(
              `INSERT INTO user_questions (user_id, chapter_id, position, chapter_position, text)
               VALUES ($1, $2, 0, $3, $4)`,
              [user.id, chapterId, chapterPosition, questions[idx]]
            );
            added += 1;
          }
        }

        const total = await resequenceUserQuestions(user.id, client);
        await pruneUserAnswers(user.id, total, client);

        return {
          added,
          total,
          chapter: {
            id: chapterRes.rows[0].id,
            position: chapterRes.rows[0].position,
            title: chapterRes.rows[0].title
          }
        };
      });

      const structure = await loadUserQuestionMap(user.id);
      const chapterPayload =
        structure.chapters.find((chapter) => chapter.id === chapterId) ?? null;

      console.info('[admin:addQuestions] success', {
        ...logContext,
        added: result.added,
        totalQuestions: result.total
      });

      res.json({
        ok: true,
        mode,
        chapterId,
        added: result.added,
        total: result.total,
        totalQuestions: structure.totalQuestions,
        chapter: chapterPayload
          ? {
              id: chapterPayload.id,
              position: chapterPayload.position,
              title: chapterPayload.title,
              startIndex: chapterPayload.startIndex,
              questionCount: chapterPayload.questionCount
            }
          : {
              ...result.chapter,
              startIndex: null,
              questionCount: null
            }
      });
    } catch (error) {
      console.error('[admin:addQuestions] failed', {
        ...logContext,
        errorCode: error.code ?? null,
        message: error.message
      });
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'DUPLICATE_QUESTION',
          constraint: error.constraint,
          detail: error.detail ?? undefined
        });
      }
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'INVALID_REFERENCE',
          constraint: error.constraint,
          detail: error.detail ?? undefined
        });
      }
      return res.status(500).json({ error: 'FAILED_TO_ADD_QUESTIONS' });
    }
  })
);

app.delete(
  '/api/admin/users/:id/questions/:questionId',
  authRequired,
  adminRequired,
  csrfRequired,
  writeLimiter,
  asyncHandler(async (req, res) => {
    const user = await fetchUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const questionId = Number.parseInt(req.params.questionId, 10);
    if (!Number.isInteger(questionId)) {
      return res.status(400).json({ error: 'INVALID_QUESTION' });
    }

    const result = await transaction(async (client) => {
      const existing = await client.query(
        `SELECT id
         FROM user_questions
         WHERE id = $1
           AND user_id = $2`,
        [questionId, user.id]
      );
      if (existing.rowCount === 0) {
        const err = new Error('QUESTION_NOT_FOUND');
        err.status = 404;
        throw err;
      }
      await client.query('DELETE FROM user_questions WHERE id = $1', [questionId]);
      const total = await resequenceUserQuestions(user.id, client);
      await pruneUserAnswers(user.id, total, client);
      return { total };
    });

    res.json({ ok: true, count: result.total });
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
  await normalizeTelegramEmails();
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




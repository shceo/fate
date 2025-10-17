import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { query, transaction } from '../db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensureSchema() {
  const schemaPath = join(__dirname, '..', 'db', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  await query(sql);
}

async function main() {
  const dbPath = join(__dirname, '..', 'data', 'db.json');
  const raw = await readFile(dbPath, 'utf8');
  const data = JSON.parse(raw);

  await ensureSchema();

  let usersMigrated = 0;
  let questionsMigrated = 0;
  let answersMigrated = 0;

  await transaction(async (client) => {
    const users = Array.isArray(data.users) ? data.users : [];
    for (const user of users) {
      const id = user.id;
      if (!id) continue;

      const email = String(user.email ?? '').trim().toLowerCase();
      const name = String(user.name ?? '').trim() || 'unknown';
      const passHash = user.passHash ?? user.pass_hash;
      if (!passHash) continue;

      const cover = data.covers?.[id] ?? null;
      const ordered = Boolean(data.ordered?.[id]);
      const status = data.status?.[id] ?? null;
      const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();

      await client.query(
        `INSERT INTO app_users (id, name, email, pass_hash, is_admin, created_at, cover, ordered, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id)
         DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           pass_hash = EXCLUDED.pass_hash,
           is_admin = EXCLUDED.is_admin,
           created_at = EXCLUDED.created_at,
           cover = EXCLUDED.cover,
           ordered = EXCLUDED.ordered,
           status = EXCLUDED.status`,
        [id, name, email, passHash, !!user.isAdmin, createdAt, cover, ordered, status]
      );
      usersMigrated += 1;

      const questions = Array.isArray(data.userQuestions?.[id])
        ? data.userQuestions[id]
        : [];
      await client.query('DELETE FROM user_questions WHERE user_id = $1', [id]);
      for (let index = 0; index < Math.min(questions.length, 500); index += 1) {
        const text = String(questions[index] ?? '').trim();
        if (!text) continue;
        await client.query(
          `INSERT INTO user_questions (user_id, position, text)
           VALUES ($1, $2, $3)`,
          [id, index, text]
        );
        questionsMigrated += 1;
      }

      const answers = Array.isArray(data.answers?.[id]) ? data.answers[id] : [];
      await client.query('DELETE FROM answers WHERE user_id = $1', [id]);
      for (const entry of answers) {
        const questionIndex = Number.parseInt(entry.questionIndex ?? entry.question_index ?? 0, 10);
        const text = String(entry.text ?? entry.answer_text ?? '');
        const createdAtAnswer = entry.createdAt ? new Date(entry.createdAt) : new Date();
        await client.query(
          `INSERT INTO answers (user_id, question_index, answer_text, created_at)
           VALUES ($1, $2, $3, $4)`,
          [id, Number.isFinite(questionIndex) && questionIndex >= 0 ? questionIndex : 0, text, createdAtAnswer]
        );
        answersMigrated += 1;
      }
    }
  });

  console.log(
    `Migration finished: users=${usersMigrated}, questions=${questionsMigrated}, answers=${answersMigrated}`
  );
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

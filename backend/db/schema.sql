CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  pass_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cover TEXT,
  ordered BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT CHECK (
    status IN ('in_review', 'in_design', 'printing', 'ready', 'shipped', 'delivered')
  ),
  interview_locked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_key
  ON app_users (LOWER(email));

ALTER TABLE app_users
  ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS user_question_chapters (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_question_chapters_user_position_key
  ON user_question_chapters (user_id, position);

CREATE TABLE IF NOT EXISTS user_questions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  chapter_id BIGINT REFERENCES user_question_chapters (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  chapter_position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_questions_user_position_key
  ON user_questions (user_id, position);

ALTER TABLE user_questions
  ADD COLUMN IF NOT EXISTS chapter_id BIGINT REFERENCES user_question_chapters (id) ON DELETE CASCADE;

ALTER TABLE user_questions
  ADD COLUMN IF NOT EXISTS chapter_position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS user_questions_chapter_position_idx
  ON user_questions (chapter_id, chapter_position);

UPDATE user_questions
SET chapter_position = position
WHERE chapter_position IS NULL;

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_user_idx ON answers (user_id);

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS telegram_id TEXT;
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS telegram_first_name TEXT;
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS telegram_last_name TEXT;
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS telegram_phone TEXT;
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS interview_locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_telegram_id_key
  ON app_users (telegram_id)
  WHERE telegram_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS question_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_template_items (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES question_templates (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS question_template_items_template_position_key
  ON question_template_items (template_id, position);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cover TEXT,
  ordered BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT CHECK (
    status IN ('in_review', 'in_design', 'printing', 'ready', 'shipped', 'delivered')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_key
  ON app_users (LOWER(email));

CREATE TABLE IF NOT EXISTS user_questions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_questions_user_position_key
  ON user_questions (user_id, position);

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_user_idx ON answers (user_id);

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

-- (на случай если где-то раньше ставили NOT NULL)
ALTER TABLE app_users
  ALTER COLUMN email DROP NOT NULL;

-- Главы с вопросами
CREATE TABLE IF NOT EXISTS user_question_chapters (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_question_chapters_user_position_key
  ON user_question_chapters (user_id, position);

-- Вопросы
CREATE TABLE IF NOT EXISTS user_questions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  chapter_id BIGINT NOT NULL REFERENCES user_question_chapters (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  chapter_position INTEGER NOT NULL,
  text TEXT NOT NULL
  -- при желании можно добавить:
  -- , created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- На всякий случай: удалить старую НЕПРАВИЛЬНУЮ уникальность, если вдруг есть
DROP INDEX IF EXISTS user_questions_user_position_key;

-- Правильная уникальность: позиция внутри конкретной главы пользователя
CREATE UNIQUE INDEX IF NOT EXISTS user_questions_user_chapter_position_key
  ON user_questions (user_id, chapter_id, chapter_position);

-- Индекс на быстрый порядок в пределах главы
CREATE INDEX IF NOT EXISTS user_questions_chapter_position_idx
  ON user_questions (chapter_id, chapter_position);

-- Триггер: авто-проставление chapter_position и синхронизация position
CREATE OR REPLACE FUNCTION public.user_questions_autopos()
RETURNS trigger AS $$
BEGIN
  -- Если не передали chapter_position:
  IF NEW.chapter_position IS NULL THEN
    -- Если передали legacy "position" — используем его
    IF NEW.position IS NOT NULL THEN
      NEW.chapter_position := NEW.position;
    ELSE
      -- Иначе ставим MAX+1 в пределах (user_id, chapter_id)
      SELECT COALESCE(MAX(chapter_position), -1) + 1
        INTO NEW.chapter_position
        FROM public.user_questions
       WHERE user_id = NEW.user_id
         AND chapter_id = NEW.chapter_id;
    END IF;
  END IF;

  -- Держим legacy "position" в синхроне
  NEW.position := NEW.chapter_position;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_questions_autopos ON public.user_questions;
CREATE TRIGGER trg_user_questions_autopos
BEFORE INSERT OR UPDATE ON public.user_questions
FOR EACH ROW
EXECUTE FUNCTION public.user_questions_autopos();

-- Ответы (как было)
CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_user_idx ON answers (user_id);

-- Доп. поля для телеграма (идемпотентно)
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

CREATE UNIQUE INDEX IF NOT EXISTS app_users_telegram_id_key
  ON app_users (telegram_id)
  WHERE telegram_id IS NOT NULL;

-- Шаблоны вопросов
CREATE TABLE IF NOT EXISTS question_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Главы в шаблонах
CREATE TABLE IF NOT EXISTS question_template_chapters (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES question_templates (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS question_template_chapters_template_position_key
  ON question_template_chapters (template_id, position);

-- Вопросы в шаблонах (теперь привязаны к главам)
CREATE TABLE IF NOT EXISTS question_template_items (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES question_templates (id) ON DELETE CASCADE,
  chapter_id BIGINT REFERENCES question_template_chapters (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  chapter_position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS question_template_items_template_chapter_position_key
  ON question_template_items (template_id, chapter_id, chapter_position);

CREATE INDEX IF NOT EXISTS question_template_items_chapter_position_idx
  ON question_template_items (chapter_id, chapter_position);

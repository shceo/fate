# Fate — React + Tailwind + Express (JWT cookies)

## Быстрый старт
### 1) Backend (API)
```bash
cd backend
cp .env.example .env   # пропишите свои секреты и DATABASE_URL
npm i
npm run dev
```
API доступен на http://localhost:8787

### 2) Frontend (Vite)
```bash
cd frontend
npm i
npm run dev
```
Vite dev-сервер: http://localhost:5173

## Сборка
```bash
cd frontend && npm run build
```
Готовая статика появится в `frontend/dist`.

## Авторизация
- Пользовательская: стандартная регистрация/логин → cookie с JWT.
- Админская: POST `/api/admin/login` (email + пароль) + секрет `ADMIN_SECRET_KEY` из `.env`.

## Админка
- Раздел `/admin` доступен только администраторам.
- Карточка пользователя (`/admin/users/:id`): ответы, статус, обложка, заказ, список вопросов и т.д.

## API
- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `POST /api/admin/login` — `{ email, password, secretKey }`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/questions`
- `GET /api/answers`
- `POST /api/answers` — `{ entries: [{ questionIndex, text }] }`
- `POST /api/cover` — `{ name }`
- `POST /api/complete`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users/:id/questions` — `{ mode, questions, bulk }`
- `POST /api/admin/users/:id/order` — `{ ordered: boolean }`
- `POST /api/admin/users/:id/status` — `{ status: 'in_review'|'in_design'|'printing'|'ready'|'shipped'|'delivered'|null }`

## Работа с Postgres
### 1. Локальная настройка
1. Установите Postgres ≥ 14.
2. Создайте базу и пользователя:
   ```bash
   psql -U postgres
   CREATE DATABASE fate;
   CREATE USER fate WITH ENCRYPTED PASSWORD 'fate';
   GRANT ALL PRIVILEGES ON DATABASE fate TO fate;
   \q
   ```
3. Примените схему:
   ```bash
   psql -d fate -U fate -f backend/db/schema.sql
   ```
4. Скопируйте `.env.example` → `.env` и пропишите `DATABASE_URL=postgres://fate:fate@localhost:5432/fate` (или свой DSN), а также обновлённые `JWT_SECRET` и `ADMIN_SECRET_KEY`.
5. Запустите API (`npm run dev`).

### 2. Перенос данных из старого JSON
Если у вас есть `backend/data/db.json`, выполните:
```bash
cd backend
node --env-file=.env ./scripts/migrate-json-to-postgres.js
# или через npm-скрипт
npm run migrate:json
```
Скрипт создаст таблицы (если нужно) и перенесёт пользователей, вопросы, ответы, статусы, заказы и обложки.

### 3. Деплой базы на хостинг
1. Создайте управляемый кластер или виртуалку с Postgres (Render, Railway, Supabase, Yandex Cloud, собственный VPS и т.д.).
2. Создайте БД и пользователя с нужными правами.
3. Примените схему:
   ```bash
   psql "<REMOTE_DATABASE_URL>" -f backend/db/schema.sql
   ```
4. Загрузите данные:
   ```bash
   # локальный дамп
   pg_dump -d fate -U fate --data-only > fate-data.sql
   # импорт на сервер
   psql "<REMOTE_DATABASE_URL>" -f fate-data.sql
   ```
   Либо запустите миграционный скрипт напрямую против удалённой базы, указав её `DATABASE_URL`.
5. На хостинге приложения задайте переменные окружения: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_SECRET_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Если провайдер требует TLS, включите `DATABASE_SSL=verify`.
6. Перезапустите backend (`npm run start`), проверьте логи и прогоните ключевые ручки.

### 4. Дополнительные меры безопасности
- В продакшене обязательно укажите собственные `JWT_SECRET`, `ADMIN_SECRET_KEY`, `SEED_ADMIN_*`.
- Ограничьте CORS списком доменов через `CORS_ORIGINS` в `.env`.
- Параметры пула (`PG_POOL_MAX`, `PG_IDLE_TIMEOUT`, `PG_CONNECTION_TIMEOUT`) вынесены в `.env`.
- При деплое в облако включайте SSL (`DATABASE_SSL=verify` или `true`).

# Fate — React + Tailwind + Express (JWT cookies)

## Запуск локально
### 1) Backend (API)
```bash
cd backend
cp .env.example .env
npm i
npm run dev
```
API: http://localhost:8787

### 2) Frontend (Vite)
```bash
cd frontend
npm i
npm run dev
```
Откройте http://localhost:5173

## Сборка
```bash
cd frontend && npm run build
```
Статика появится в `frontend/dist`.

## Авторизация
- Пользователь: регистрация/вход -> cookie с JWT.
- Админ: `/admin/login` — email, пароль и `ADMIN_SECRET_KEY` (см. `.env`).

## Админ‑панель
- Список пользователей `/admin`.
- Страница пользователя `/admin/users/:id`: ответы, выбранная обложка, чекбокс «Заказ оформлен», выпадающий «Статус книги».

## API (основное)
- POST `/api/auth/register` — {name,email,password}
- POST `/api/auth/login` — {email,password}
- POST `/api/admin/login` — {email,password,secretKey}
- GET  `/api/me`
- GET  `/api/questions`
- POST `/api/answers` — {entries:[{questionIndex,text}]}
- POST `/api/cover` — {name}
- POST `/api/complete`
- GET  `/api/admin/users`
- GET  `/api/admin/users/:id`
- POST `/api/admin/users/:id/order` — {ordered:bool}
- POST `/api/admin/users/:id/status` — {status:'in_review'|'in_design'|'printing'|'ready'|'shipped'|'delivered'}

## Данные
Файл `backend/data/db.json`. Для продакшена замените на полноценную БД (Postgres/Prisma и т.п.).

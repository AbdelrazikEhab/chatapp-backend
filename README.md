# V.Connct - Backend (Mini Chat)

## What's included
- Express + Socket.io real-time chat
- JWT authentication (register / login)
- PostgreSQL storage for users, messages, insights
- Example migration SQL
- .env.example

## Setup (local)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create Postgres database and run migrations in `migrations/`
3. Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`.
4. Start server:
   ```bash
   npm run dev
   ```

## API
- `POST /api/auth/register` { name, email, password } -> { token }
- `POST /api/auth/login` { email, password } -> { token }
- Socket.io: connect with `?token=JWT` query param or perform join after connection.

## Notes
- This is a starter backend. Frontend can connect to Socket.io and call auth endpoints.

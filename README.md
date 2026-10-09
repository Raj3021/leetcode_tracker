# LeetCode Company Tracker (Postgres-backed)

A local website that tracks which of your 374 company-tagged LeetCode
problems you've solved. Progress is stored in your local Postgres database
(visible/editable in pgAdmin4), so it survives browser restarts, private
mode, and clearing browser data.

## 1. Create the database

In pgAdmin4:
1. Right-click **Databases** → **Create** → **Database**.
2. Name it `leetcode_tracker` (or anything — just match it in `.env` below).
3. Select the new database, open the **Query Tool**, paste the contents of
   `schema.sql`, and click Execute (▶). This creates the `solved_problems` table.

## 2. Configure the connection

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in the same host/port/user/password you use to connect
in pgAdmin4 (right-click your server in pgAdmin4 → Properties → Connection,
if you need a reminder):

```
PGHOST=localhost
PGPORT=5432
PGDATABASE=leetcode_tracker
PGUSER=postgres
PGPASSWORD=your_password_here
PORT=3000
```

## 3. Install and run

You'll need [Node.js](https://nodejs.org) installed. Then, in this folder:

```bash
npm install
npm start
```

You should see:

```
Tracker running at http://localhost:3000
```

Open that URL in your browser. **Don't open `public/index.html` directly as a
file** — the page needs to be served by this Node server so it can reach the
API and the database.

## How it works

- `server.js` — a small Express server that serves the page and exposes a
  tiny API (`/api/solved`, etc.) backed by Postgres via the `pg` package.
- `public/index.html` — the tracker UI (all 374 problems embedded), which
  calls that API whenever you check/uncheck a problem.
- `schema.sql` — the one table this uses: `solved_problems(problem_id, solved_at)`.

Checking a box does an optimistic UI update, then `POST /api/solved/:id`
(or `DELETE` to uncheck) to persist it. You can inspect or edit your progress
directly in pgAdmin4 at any time — it's just rows in a table.

## Troubleshooting

- **"Could not reach the local server/database"** on the page — make sure
  `npm start` is still running in a terminal, and that you're visiting
  `http://localhost:3000` (not a `file://` path).
- **Connection refused / auth failed** in the terminal — double check
  `.env` matches your pgAdmin4 connection details exactly (host, port, user,
  password, database name).
- Changing the port: edit `PORT` in `.env`.

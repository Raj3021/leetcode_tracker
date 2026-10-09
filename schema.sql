-- Run this once in pgAdmin4 (or psql) against the database you want to use.
-- Right-click your database in pgAdmin4 -> Query Tool -> paste this -> Execute.

CREATE TABLE IF NOT EXISTS solved_problems (
    problem_id  INTEGER PRIMARY KEY,
    solved_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'leetcode_tracker',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

// Fail fast with a clear message if Postgres isn't reachable.
pool.query('SELECT 1').catch(err => {
  console.error('\nCould not connect to Postgres. Check your .env settings against pgAdmin4.');
  console.error(err.message, '\n');
});

// GET all solved problem ids
app.get('/api/solved', async (req, res) => {
  try {
    const result = await pool.query('SELECT problem_id FROM solved_problems ORDER BY problem_id');
    res.json(result.rows.map(r => r.problem_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not read progress from the database.' });
  }
});

// Mark one problem solved
app.post('/api/solved/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid problem id' });
  try {
    await pool.query(
      'INSERT INTO solved_problems (problem_id) VALUES ($1) ON CONFLICT (problem_id) DO NOTHING',
      [id]
    );
    console.log(`Probelm number ${id} solved`);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save that problem.' });
  }
});

// Unmark one problem
app.delete('/api/solved/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid problem id' });
  try {
    await pool.query('DELETE FROM solved_problems WHERE problem_id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update that problem.' });
  }
});

// Bulk import (used by the "Import progress" button)
app.post('/api/solved/bulk', async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Number.isInteger) : null;
  if (!ids) return res.status(400).json({ error: 'Expected { ids: number[] }' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const id of ids) {
      await client.query(
        'INSERT INTO solved_problems (problem_id) VALUES ($1) ON CONFLICT (problem_id) DO NOTHING',
        [id]
      );
    }
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Import failed.' });
  } finally {
    client.release();
  }
});

// Reset all progress
app.post('/api/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM solved_problems');
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reset progress.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tracker running at http://localhost:${PORT}`);
});

/**
 * Database connection + migration runner for Denver Black Limo.
 *
 * - Exposes a single SSL-aware pg Pool used across the app.
 * - `runMigrations()` applies any pending .sql files in ./migrations in order,
 *   recording each in a `schema_migrations` table so they run exactly once.
 *   It is safe to call on every boot (idempotent) and safe across multiple
 *   instances (guarded by a Postgres advisory lock).
 *
 * SSL: Neon and DigitalOcean Managed Postgres both require SSL. We enable it
 * whenever the connection string asks for it (`sslmode=require`) or when
 * DATABASE_SSL=true. Set DATABASE_SSL=false for a plain local Postgres.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const ADVISORY_LOCK_KEY = 947103; // arbitrary constant shared by all instances

function resolveSsl() {
  const url = process.env.DATABASE_URL || '';
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  // Cloud providers (Neon / DigitalOcean) put sslmode=require in the URL.
  return /sslmode=require/i.test(url) ? { rejectUnauthorized: false } : false;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

async function runMigrations(p = pool) {
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL is not set — skipping migrations.');
    return;
  }
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`No migrations directory at ${MIGRATIONS_DIR} — skipping.`);
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const client = await p.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // Serialize migrations across instances so two boots can't race.
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`→ Applying migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed (${file}): ${err.message}`);
      }
    }
    console.log(count === 0 ? 'Database schema is up to date.' : `Applied ${count} migration(s).`);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => {});
    client.release();
  }
}

module.exports = { pool, runMigrations };

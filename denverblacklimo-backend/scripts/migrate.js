#!/usr/bin/env node
/**
 * Standalone migration runner: `npm run migrate`
 *
 * Applies any pending SQL migrations against DATABASE_URL, then exits.
 * Use locally (dev/test) and as the pre-deploy step in production.
 */
require('dotenv').config();
const { pool, runMigrations } = require('../db');

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Add it to your .env or environment.');
    process.exit(1);
  }
  try {
    await runMigrations();
    console.log('✔ Migrations complete.');
    process.exit(0);
  } catch (err) {
    console.error('✖ Migration error:', err.message);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
})();

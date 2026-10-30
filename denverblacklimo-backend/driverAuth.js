/**
 * Driver accounts: passwords, sessions and the middleware that guards the
 * driver app's half of the API.
 *
 * This is a second identity system beside the admin one, and the two must not
 * be able to stand in for each other. Both are signed with the same
 * JWT_SECRET, so a valid signature proves only that *we* issued the token —
 * never what it is allowed to do. Every check here insists on the role as well
 * as the signature, and the admin middleware in server.js was tightened to do
 * the same, because until now it accepted any token we had ever signed.
 *
 * Passwords use node's own scrypt. It is a memory-hard KDF built into the
 * runtime, which means no new dependency and nothing to compile on a managed
 * build host — a native module that fails to build takes the whole deploy with
 * it, and this is not worth that risk for a handful of drivers.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'denver-black-limo-secret-2026';

/** Short, because a stolen access token cannot be revoked — only outlived. */
const ACCESS_TTL = '1h';
/** Long, because a chauffeur signing in again mid-shift is a support call. */
const REFRESH_DAYS = 60;

/** Five wrong passwords, then fifteen minutes. */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// ── Passwords ──────────────────────────────────────────────────────────────

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/**
 * "scrypt$N$r$p$salt$key" — the parameters travel with the hash so they can be
 * raised later without invalidating every password already stored.
 */
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(plain, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    // scrypt needs roughly 128 * N * r bytes; node's default cap is below that
    // at these parameters and throws without it.
    maxmem: 256 * SCRYPT.N * SCRYPT.r,
  });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join('$');
}

/** Constant-time, and false for anything malformed rather than throwing. */
function verifyPassword(plain, stored) {
  try {
    if (!stored) return false;
    const [scheme, N, r, p, saltHex, keyHex] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(plain, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 256 * Number(N) * Number(r),
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** What the office is told to pass on when it sets a driver up. */
function generatePassword() {
  // No look-alike characters: a password read down the phone must survive the
  // difference between O and 0, l and 1.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(12))
    .map((b) => alphabet[b % alphabet.length])
    .join('');
}

// ── Sessions ───────────────────────────────────────────────────────────────

/** Stored as a digest so a leaked database hands over no working sessions. */
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');

function signAccessToken(driver) {
  // `sub` is the driver, and `role` is checked everywhere — a token is never
  // trusted on its signature alone.
  return jwt.sign({ sub: driver.id, role: 'driver', name: driver.name }, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

async function createSession(driverId, { deviceLabel, ip } = {}) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expires = new Date(Date.now() + REFRESH_DAYS * 86400000);
  const { rows } = await pool.query(
    `INSERT INTO driver_sessions (driver_id, token_hash, expires_at, device_label, last_ip)
     VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
    [driverId, digest(token), expires, (deviceLabel || '').slice(0, 255) || null, (ip || '').slice(0, 64) || null]
  );
  return { refreshToken: token, sessionId: rows[0].id, expiresAt: expires };
}

/**
 * Exchanges a refresh token for a new pair, and replaces it.
 *
 * Rotation matters: a refresh token is usable exactly once, so if one is ever
 * stolen and used, the real device's next refresh fails and the theft surfaces
 * as a sign-out rather than a silent passenger.
 */
async function rotateSession(refreshToken, { ip } = {}) {
  if (!refreshToken) return null;
  const { rows } = await pool.query(
    `SELECT s.*, d.active, d.name, d.email
       FROM driver_sessions s JOIN drivers d ON d.id = s.driver_id
      WHERE s.token_hash = $1;`,
    [digest(refreshToken)]
  );
  if (!rows.length) return null;

  const session = rows[0];
  if (session.revoked_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  // A driver retired while signed in loses the session at its next refresh.
  if (!session.active) return null;

  const next = crypto.randomBytes(48).toString('base64url');
  await pool.query(
    `UPDATE driver_sessions
        SET token_hash = $1, last_used_at = now(), last_ip = COALESCE($2, last_ip)
      WHERE id = $3;`,
    [digest(next), (ip || '').slice(0, 64) || null, session.id]
  );

  return {
    refreshToken: next,
    accessToken: signAccessToken({ id: session.driver_id, name: session.name }),
    driverId: session.driver_id,
  };
}

async function revokeSession(refreshToken) {
  if (!refreshToken) return false;
  const { rowCount } = await pool.query(
    `UPDATE driver_sessions SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL;`,
    [digest(refreshToken)]
  );
  return rowCount > 0;
}

/** Signs every device out. Used when the office revokes, and on password change. */
async function revokeAllSessions(driverId) {
  const { rowCount } = await pool.query(
    `UPDATE driver_sessions SET revoked_at = now()
      WHERE driver_id = $1 AND revoked_at IS NULL;`,
    [driverId]
  );
  return rowCount;
}

// ── Sign in ────────────────────────────────────────────────────────────────

/**
 * Resolves to a driver, or to a reason that is deliberately vague on the way
 * out: "wrong password" and "no such driver" must look identical to anyone
 * probing which email addresses exist.
 */
async function authenticate(email, password) {
  const { rows } = await pool.query('SELECT * FROM drivers WHERE lower(email) = lower($1);', [
    String(email || '').trim(),
  ]);

  // Hash anyway when there is no such driver, so a missing account does not
  // answer measurably faster than a wrong password.
  if (!rows.length) {
    verifyPassword(String(password || ''), hashPassword('timing-equaliser'));
    return { ok: false, reason: 'credentials' };
  }

  const driver = rows[0];
  if (driver.locked_until && new Date(driver.locked_until) > new Date()) {
    return { ok: false, reason: 'locked', until: driver.locked_until };
  }
  if (!driver.active) return { ok: false, reason: 'inactive' };
  if (!driver.password_hash) return { ok: false, reason: 'no_password' };

  if (!verifyPassword(String(password || ''), driver.password_hash)) {
    const attempts = (driver.failed_attempts || 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000) : null;
    await pool.query('UPDATE drivers SET failed_attempts = $1, locked_until = $2 WHERE id = $3;', [
      attempts,
      lock,
      driver.id,
    ]);
    return { ok: false, reason: lock ? 'locked' : 'credentials', until: lock };
  }

  await pool.query(
    'UPDATE drivers SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1;',
    [driver.id]
  );
  return { ok: true, driver };
}

async function setPassword(driverId, plain) {
  await pool.query('UPDATE drivers SET password_hash = $1, password_set_at = now(), failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $2;', [
    hashPassword(plain),
    driverId,
  ]);
  // Changing a password ends every session. Otherwise a password changed
  // because a phone was lost would leave that phone signed in.
  return revokeAllSessions(driverId);
}

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * Guards the driver half of the API.
 *
 * Mirrors the admin middleware's status codes so one client convention covers
 * both: 401 means no credentials were presented, 403 means they were presented
 * and are not good any more — which the app reads as "sign in again".
 */
function authenticateDriver(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  jwt.verify(token, JWT_SECRET, async (err, claims) => {
    if (err) return res.status(403).json({ error: 'Your session has expired. Please sign in again.' });
    // The signature alone proves only that we issued this. An admin token is
    // signed with the same secret and must not reach a driver route.
    if (!claims || claims.role !== 'driver' || !claims.sub) {
      return res.status(403).json({ error: 'This account cannot use the driver app.' });
    }
    try {
      const { rows } = await pool.query('SELECT id, name, email, phone, active FROM drivers WHERE id = $1;', [
        claims.sub,
      ]);
      // Checked on every request rather than trusted from the token: a driver
      // retired an hour ago still holds a token that has not expired.
      if (!rows.length || !rows[0].active) {
        return res.status(403).json({ error: 'This account is no longer active.' });
      }
      req.driver = rows[0];
      next();
    } catch {
      res.status(500).json({ error: 'Could not verify your account.' });
    }
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  generatePassword,
  signAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  authenticate,
  setPassword,
  authenticateDriver,
  REFRESH_DAYS,
};

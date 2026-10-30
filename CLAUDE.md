# Denver Black Limo LLC

Luxury chauffeured transportation in Denver, Colorado. Live at
**https://denverblacklimo.llc**, deployed from `main` to DigitalOcean App
Platform on every push.

A monorepo of three applications sharing one database and one API:

| Directory | What it is |
|---|---|
| `denverblacklimo-backend/` | Express 5 + PostgreSQL. The only writer to the database. |
| `denverblacklimo-frontend/` | React 19 + Vite + Tailwind v4 + TypeScript. Public site, and the admin at `/admin`. |
| `denverblacklimo-driver-app/` | Flutter driver app (Android + iOS). Talks to the same API. |

The backend is the single source of truth. The admin and the driver app are
both clients of it; neither talks to the database directly.

## Commands

```bash
# Backend  (cwd: denverblacklimo-backend)
node server.js                 # migrations run automatically at boot

# Frontend (cwd: denverblacklimo-frontend)
npm run dev                    # Vite dev server, port 5173
npm run build                  # tsc + vite + SSR bundle + prerender + sitemap
npm run preview                # serve dist/ — the only way to test the PWA
npm run icons                  # regenerate PWA icons from the logo
npx tsc --noEmit               # type-check without building

# Driver app (cwd: denverblacklimo-driver-app)
flutter run -d chrome          # fastest loop; visible in the browser pane
flutter run                    # Android device or emulator
flutter analyze
```

**iOS cannot be built on this machine.** It is Windows; Flutter does not list
an iOS toolchain. Android is fully set up. iOS builds need macOS or a cloud Mac
(Codemagic, Bitrise, GitHub Actions macOS runners).

## Things that have already cost time

Each of these was a real bug. They are easy to reintroduce.

- **`NUMERIC` columns arrive as strings.** node-pg returns `NUMERIC(10,2)` as
  `"95.00"`, not `95.00`. Always coerce — `Number(x)` in JS, and in Dart
  `double.tryParse(x.toString())`, never `as double`.
- **Dates are text, not timestamps.** `bookings.pickup_date` is `VARCHAR(50)`
  and `pickup_time` is a string. Comparing them to a date needs the guarded
  cast in `TRIP_AT` (server.js). A raw `pickup_date >= now()` throws.
- **Format dates in SQL, never send them as timestamps.** A licence expiry is a
  calendar day with no zone; serialized as a `Date` it is re-read in the
  viewer's zone and lands a day out. Use `to_char(col, 'YYYY-MM-DD')`.
- **`\d` does not survive a JavaScript string into Postgres.** Use `[0-9]`.
- **An expired token returns 403, not 401.** 401 means no credentials were
  sent; 403 means they were sent and are no longer good. Clients must treat
  **403 as "sign in again"**.
- **Recharts renders blank under throttled animation frames.** Pass
  `isAnimationActive={false}` on every chart.
- **`AnimatePresence` exit never completes when rAF is throttled**, so
  `innerText` still reads elements that look closed. Assert on geometry
  (`getBoundingClientRect`, computed opacity), not text. Never make a critical
  warning depend on an animation finishing — the offline banner renders
  unconditionally for exactly this reason.
- **Verify against the port you think you are using.** A stale `node server.js`
  holding the port will happily answer with old code and send you hunting a bug
  you already fixed.

## Backend

- All routes live in `server.js`. Helpers are split out: `emails.js` (Resend
  templates), `agreement.js` (pdfkit), `flights.js` (AeroDataBox),
  `terms.js` (the client's agreement, the single source for emails, `/terms`
  and the signed PDF), `driverAuth.js` (driver accounts).
- **Two identities, one secret.** Admin tokens are `{ role: 'admin' }`, driver
  tokens `{ sub, role: 'driver' }`, both signed with `JWT_SECRET`. A valid
  signature therefore proves only that we issued the token — **every guard must
  check the role as well.** `authenticateToken` (admin) and
  `authenticateDriver` both do.
- Driver routes are scoped by the token, never by a parameter. No route takes a
  driver id from the client.
- Passwords use node's built-in `crypto.scrypt`. No bcrypt dependency: a native
  module that fails to build takes the whole deploy with it.

### Migrations

`migrations/NNN_name.sql`, applied at boot by `db.js` under an advisory lock
and recorded by filename in `schema_migrations`. Therefore:

- **Numbering gaps are harmless** — production applied 013 before 009 and 012.
- Write them idempotently (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`); they may
  re-run against an existing schema.
- Failures are logged, not fatal. Check the boot log after deploying one.

### Deliberate data decisions

- **Drivers are retired, never deleted** — a booking must keep the driver that
  ran it. Same for affiliates, enforced by `ON DELETE RESTRICT`.
- **Affiliates are referenced, not copied** onto a booking. The driver columns
  (`driver_name`, `driver_email`, …) are the exception: they predate the
  drivers table and are a snapshot of what was dispatched.
- **An affiliate is a company, a driver is a person.** Never conflate them.

## Frontend

- `AdminDashboard.tsx` holds the admin shell and tabs; each tab's body lives in
  `src/admin/`. Shared controls are in `src/admin/AdminUI.tsx` — use them.
- The admin is an installable PWA. `public/sw.js` **never caches `/api`** —
  this is an operations tool and a stale pick-up is worse than a slow one.
- Touch targets are raised under `@media (pointer: coarse)`, keyed on input
  type rather than width, so desktop keeps its density.
- `prerender.mjs` runs last in the build: it fetches live CMS content, writes
  each route to static HTML, injects the PWA tags into `/admin` **only**, and
  stamps the service worker version.

## Testing

There is no test suite. Work is verified by running it:

- Spin up a scratch PostgreSQL cluster on port 5499, point `DATABASE_URL` at
  it, boot the backend, and exercise the real endpoints with `curl`.
- For UI, drive the browser pane and assert on measured geometry.
- Set `RESEND_API_KEY=""` to stop test runs emailing anyone. **Note:**
  PowerShell's `$env:X = ""` *deletes* the variable, so dotenv then loads the
  real key from `.env` and mail really does go out.
- Use `delivered@resend.dev` as a recipient — Resend accepts and discards it.

## Conventions

- **Commits carry no `Co-Authored-By` trailer.** Everything is attributed to
  Ashenafi Bancha \<ashenafibanchabassa01@gmail.com\> alone.
- Commit subjects are lowercase and say what changed for the user, not which
  files moved. The body explains *why*, including what was rejected.
- Work on a feature branch, fast-forward `main`, push `main`. Pushing `main` is
  a deploy.
- Only commit or push when asked.
- Comments explain reasoning, not mechanics. If a line looks odd, say what
  would break without it.

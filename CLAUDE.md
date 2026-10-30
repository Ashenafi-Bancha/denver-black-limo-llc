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
flutter test                   # unit tests; integration ones skip with no server

# Integration tests, against a running backend:
flutter test test/api_integration_test.dart   --dart-define=API_BASE_URL=http://localhost:3010/api   --dart-define=DRIVER_EMAIL=marcus@example.com   --dart-define=DRIVER_PASSWORD=...
```

The app reads its API address from `--dart-define=API_BASE_URL`, defaulting to
production. On an Android emulator use `http://10.0.2.2:3001/api` — `localhost`
there is the emulated device, not the machine running the server.

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
  you already fixed. On this machine **port 3001 stays poisoned** — a listener
  answers there that `Get-NetTCPConnection` cannot see, so it survives every
  attempt to kill it. Start test servers on a fresh port (3010 and up) and the
  problem disappears. Two separate "bugs" in one session were only this.
- **`flutter test` blocks real network calls.** It installs an `HttpClient`
  that returns 400 for everything, so any test that genuinely needs a server
  fails with a misleading message. Set `HttpOverrides.global = null` in the
  test's `main` — see `test/api_integration_test.dart`.
- **Flutter web draws to a canvas, not the DOM.** `innerText` is empty and
  there are no `<input>` elements, so the browser pane cannot read or fill the
  driver app. Screenshots work; synthetic typing does not land reliably. Verify
  the app's behaviour through `flutter test` instead, and use screenshots only
  to check how it looks.

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
- `ALLOWED_ORIGIN` is a **comma-separated list** of browser origins (the site,
  the admin, and the driver app's web target in development). Requests with no
  `Origin` header — native apps, curl, server-to-server — are always allowed,
  because they were never subject to CORS in the first place.
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
- **Every test server must be started with the mail key disabled. No
  exceptions, every time.** Seeding hits the public `POST /api/bookings`, which
  sends a real customer confirmation and a real admin alert to the owner's
  personal Gmail — a test booking is indistinguishable from a real one at that
  point. The reliable form, because dotenv will not override a variable that is
  already present:

  ```bash
  RESEND_API_KEY=disabled DATABASE_URL=... PORT=3010 node server.js
  ```

  PowerShell's `$env:X = ""` *deletes* the variable rather than blanking it, so
  dotenv then loads the real key and mail goes out. Omitting it entirely does
  the same. Two alerts reached the owner's inbox this way once already.
- Use `delivered@resend.dev` as a recipient — Resend accepts and discards it.
  Addresses at `example.com` are rejected outright by Resend, which is a
  useful accident: the only test mail that escapes is whatever goes to a real
  address, and the admin alert is the one that does.

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

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

A status press is written to an on-device queue before it is sent
(`lib/api/pending_status.dart`), because mountain work loses signal and the
press is what a wait-time charge is billed from. The queue sends `occurredAt`,
so a late sync still records the true minute; the admin shows the gap. Entries
are owned by the driver who made them — a handset passed to the next shift must
not post the last driver's presses under a new token, which the server would
refuse as somebody else's trip and the app would then discard. Refusals that
retrying cannot fix (400, 404, 409) are dropped so they cannot jam the queue;
everything else is kept and retried on the next tick.

Trips are cached on the device (`lib/api/trip_cache.dart`). Everything else
the app does offline assumed the driver could still *read* the trip; `trips()`
was network-only, so a chauffeur in the DIA parking structure got an error
instead of the drop-off address. The last good answer is now shown, banner-
marked with its age. Only a network failure falls back — an expired session or
a server error is still raised, because those need acting on. The cache is
per-driver and cleared on sign-out: it holds passengers' names, numbers and
addresses, and must not outlive the session or reach the next shift.

The name board (`lib/screens/name_board_screen.dart`) is the one screen a
paying customer sees. It keeps the screen awake, allows landscape, and restores
both on the way out.

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
- **A pdfkit footer below the bottom margin appends a blank page.** pdfkit
  treats anything past the margin as overflow, so a footer drawn at
  `page.height - margins.bottom + n` silently doubles the page count. Lift
  `doc.page.margins.bottom` to 0 around the write and pass `lineBreak: false`.
  `agreement.js` carries a comment about this; `evidence.js` reintroduced it
  anyway.
- **`pkill` does not exist in this shell.** Git Bash on Windows has no pkill,
  and `pkill ... 2>/dev/null` fails silently — leaving the old server running
  while you believe you killed it, which is how port 3001 got poisoned. Stop
  node from PowerShell: `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`
  filtered on the command line, then `Stop-Process`.
- **`bookings.reference` is not a column.** It is derived from the id by
  `bookingRef()`. Selecting it throws.
- **`MultipartFile.fromPath` sends `application/octet-stream`.** Dart does not
  infer a type from the extension, so every photo upload came back "Photos
  must be JPG, PNG or WebP" — a refusal that reads like a problem with the
  picture. `ApiClient._typeOf` states it explicitly. curl does infer it, so
  testing the endpoint by hand hides this completely.
- **A fixed-width strip inside a grid widens the whole panel.** Grid and flex
  items are `min-width: auto`, so `overflow-x-auto` does nothing until the item
  is allowed to shrink. Without `min-w-0` the admin photo strip pushed the
  booking panel past the width of a phone and clipped it, with no page-level
  scroll to reveal what was lost.
- **Re-running the integration suite trips the login rate limit.** Each pass
  signs in several times and `/api/driver/login` allows 20 per window, so the
  third or fourth run fails everywhere at once and looks like a broken client.
  The limiter is in memory: restart the backend on a fresh port rather than
  hunting it.
- **The integration suite needs a database nobody has arrived in.** An arrival
  is set once and never moved, so a trip that has already arrived can never
  satisfy "no arrival yet". The tests now pick an un-arrived trip and skip with
  a message if there is none — reset with
  `DELETE FROM trip_events; UPDATE bookings SET driver_status=NULL, driver_status_at=NULL, driver_arrived_at=NULL;`
- **`ui.Image.toByteData(png)` never completes under `flutter test`.** The
  headless engine has no raster backend to encode with, so it hangs rather
  than failing — and it hangs inside `runAsync` too, so the usual fix for real
  async does not help. Test the gating around an encode, not the encode, and
  verify the bytes against a real engine (`flutter run -d web-server` with a
  throwaway entrypoint that prints the length to the console).
- **`setState(() => x = f())` asserts when f returns a Future.** An arrow body
  returns the assignment's value, and setState refuses a closure that returns
  anything. It reads perfectly and throws only at runtime, in debug. Use a
  block body when assigning a Future to a field. Both the photo sheet and the
  expense sheet had it.
- **Flutter web draws to a canvas, not the DOM.** `innerText` is empty and
  there are no `<input>` elements, so the browser pane cannot read or fill the
  driver app, and synthetic typing does not land reliably.
- **And its screenshots lie under viewport emulation.** The pane captured the
  name board clipped, then tiled side by side, against a layout that was
  correct — Flutter sizes its canvas from the real window, so the capture and
  the app disagree about how wide the screen is. Two "bugs" were chased this
  way and neither existed. **Verify Flutter layout with `testWidgets`**, which
  measures the real render tree at a size you set: see
  `test/name_board_test.dart`, which asserts a 38-character name stays inside
  a 400px board in both orientations.

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
- **Confirm a deploy with `GET /api/health/migrations`.** Failures are logged
  rather than fatal, and every route checks a token before it touches a table,
  so a missing table looks exactly like "not signed in" from outside. This
  compares the .sql files on disk with `schema_migrations` and answers **200
  when current, 503 when anything is pending** — so a check can rely on the
  status code alone. Anonymous callers get counts; an admin token adds the
  filenames. It is deliberately separate from `/api/health`, which is the
  platform health check and must not gain a database query, or Postgres
  hiccuping would restart the container.
- Write them idempotently (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`); they may
  re-run against an existing schema.
- Failures are logged, not fatal. Check the boot log after deploying one.

### Trip photos

Evidence for the damage and no-show charges the agreement allows. Bytes go in
Postgres as `bytea`, like `site_images` and for the same reason — App Platform
disks are ephemeral — but unlike `site_images` **every read is behind a token**:
these show damaged interiors, luggage and the doorway nobody came out of. A
driver only ever gets their own trips' photos, and a request for someone
else's answers 404 rather than 403, so the set cannot be enumerated. Deleting
one is admin-only: the person who took it is the last who should be able to
remove it.

Uploads carry a `clientId` and the insert is `ON CONFLICT DO NOTHING`, because
a phone upload can time out after the server has committed it and the app will
retry.

The app downscales to 1600px at quality 80 before sending, which is roughly
300KB a photo. Worth watching: the database is the only persistent store this
app has, so photos accumulate there forever. At a few per trip it is years
before this matters, but if it does, the move is Spaces, not the filesystem.

### Signatures

Proof of delivery is filed as a trip photo of kind `signature`, not through a
mechanism of its own: it is an image attached to a trip, so it inherits the
token guard, the offline queue, the admin strip and the trip record without
any of them learning a new concept. The signer goes in `note`. The pad draws
**dark ink on white** — the image is embedded in a PDF next to type, where
white-on-black would read as a negative and transparent would vanish — and
renders at a fixed 1000px width so a signature taken on a small handset is not
a smudge in a document sent to a customer. `signature` is deliberately absent
from the camera's kind chips in the app: it is captured on the pad, never
pointed at with a lens.

### Trip expenses

What the chauffeur paid out — tolls, parking, fuel, cleaning. The agreement
already allows these to be charged on, but nothing recorded them, so a driver
paid the E-470 toll and the DIA structure themselves and the company billed
neither the client nor them.

Its own table rather than another kind of trip photo, because it has an
**amount**: money in a free-text note cannot be summed, and the office needs a
total per booking. The total is coerced to a number by the API — node-pg hands
NUMERIC back as the string "13.50", and every reader that forgets concatenates
instead of adding. A single expense is capped at $2000, so a fat-fingered
12500 is refused rather than invoiced, and a non-numeric amount is rejected
outright rather than silently parsed.

Deleting one is admin-only, like a photograph: it is what a driver is owed.

**Not queued offline**, unlike statuses and photographs — it is money rather
than evidence with a time on it, and is almost always entered at a booth with
signal. If drivers start losing them, copy `pending_status.dart`.

### The trip record

`GET /api/bookings/:id/record.pdf` (admin) builds the booking, its
`trip_events` and its `trip_photos` into one PDF — `evidence.js`, pdfkit, same
house style as the agreement. It exists because the evidence has to leave: a
customer disputing a damage or wait-time charge is not given a login.

It prints the wait as a **measured gap and stops there**, naming the
arithmetic the office still has to do. The agreement bills from the scheduled
pick-up and, for airports, from 30 minutes after gate arrival — neither of
which this system knows — and `pickup_time` is wall-clock text while events are
absolute timestamps. A derived figure would be wrong by hours for a reader in
another zone, in writing, to a customer.

pdfkit embeds JPEG and PNG only. A WebP photo is still stored and still listed;
the record prints a box naming its id instead of a silent gap.

### Flight status

The flight time on a booking is the schedule as published when the booking was
taken, which can be months earlier. On the day the plane is early, late or
diverted, and the chauffeur was finding that out by standing in the terminal.
`GET /api/driver/trips/:id/flight` answers how it is actually running, and the
strip under the flight row on the trip card shows it.

**The quota is the whole design.** The free AeroDataBox plan is 600 units a
month and a lookup costs 2 — about 300 a month for the whole site, shared with
the public booking form. Three things keep the app inside it, and none of them
should be loosened without redoing the arithmetic:

- `lookupFlight` takes a **`maxAgeMs`**. The booking form omits it and takes
  any unexpired entry, because a published schedule does not move; the driver
  route passes ten minutes. One flight therefore costs at most six lookups an
  hour however many drivers are watching it.
- The route **only looks up a trip that is nearly due** — pick-up within six
  hours ahead or three behind. Outside that the published time is all anyone
  needs. The window is tested **in SQL**, because `pickup_date` is text and
  `TRIP_AT` casts it to a *zoneless* timestamp: comparing it to `now()` in
  JavaScript is out by the server's UTC offset, which in Denver is most of the
  window.
- The app **asks once per card and never polls**. The strip is deliberately not
  on the thirty-second tick the rest of the screen runs on.

The flight number and date come off the **booking, never the request** — a
parameter would let any signed-in driver spend the month's quota on any flight.

`kind` says which end of the flight is Denver's, and both the model and the
strip read that side. Reading the arrival side of a departure would show a
driver in Denver the clock in Frankfurt.

**A delay is never presented as gate arrival.** The provider gives
`revisedTime` (the airline's estimate, then the actual) and `runwayTime`
(wheels on the tarmac); `delayFrom` says which one a figure came from, and the
strip prints "wheels down" when it is the latter. Touchdown is several minutes
before the door opens, and the agreement bills airport waiting from thirty
minutes after the **gate** — so a wait derived from touchdown would overcharge
a customer in writing. This is the same reason the trip record prints the wait
as a measured gap and refuses to compute the charge.

When the provider cannot be reached, a recent answer is returned labelled
`stale` with its `fetchedAt`, and the strip says it could not reach the airline
and how old what it is showing is — the judgement the trip cache already makes
about a lost signal. Nothing about the flight is cached on the device: a status
from the last time there was signal is precisely the figure that will have
changed.

With no `AERODATABOX_API_KEY` every lookup answers `unavailable` and the card
falls back to the booking's own time, so a missing key breaks nothing and is
easy not to notice. It is set in `.do/app.yaml`.

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

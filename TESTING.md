# Denver Black Limo — Running & Testing Guide

This document explains everything needed to **run the app locally** and **test every feature, logic path, and functionality**.

---

## 1. What you need

| Requirement | Why | Notes |
|---|---|---|
| **Node.js 18+** | run backend + frontend | already installed |
| **A Postgres database** | bookings, inbox, CMS content | use the included Docker DB (easiest) **or** a Neon URL |
| **Docker Desktop** | for the local DB option | only if you use the Docker DB |
| **Resend API key** *(optional)* | to actually send emails | without it, everything works but emails are skipped (logged instead) |

You **do not** need online payments or pricing — by design every booking is a "request only".

---

## 2. Start everything

### A. Database (choose one)

**Option 1 — Local Docker DB (recommended for testing, no signup):**
```bash
docker compose up -d        # starts Postgres on localhost:5433 (persistent)
```
The backend `.env` is already pointed at it:
`DATABASE_URL="postgresql://dbl:dbl_local_password@localhost:5433/denverblacklimo"`

**Option 2 — Neon (cloud):** create a free DB at neon.tech and put its connection string in `denverblacklimo-backend/.env` as `DATABASE_URL`.

### B. Backend
```bash
cd denverblacklimo-backend
npm install
npm run migrate     # create/update tables (auto-runs on start too)
npm start           # http://localhost:3001
```
Make sure `.env` has: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
(and optionally `RESEND_API_KEY`, `ADMIN_NOTIFY_EMAIL`, `SENDER_EMAIL` for emails).

### C. Frontend
```bash
cd denverblacklimo-frontend
npm install
npm run dev         # http://localhost:5173
```

Open **http://localhost:5173**. Admin is at **http://localhost:5173/admin** (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

---

## 3. Test checklist

### 3.1 Public site — general
- [ ] Home, Services, Fleet, Service Areas, About, Contact pages all load
- [ ] Header phone / Book Now / nav work; Services dropdown lists all services
- [ ] Footer shows contact info + social links
- [ ] Mobile: hamburger menu opens; layout is responsive (resize the window)

### 3.2 Booking wizard (`/book`) — the core feature
For **each service category** in the dropdown, confirm the **fields change correctly**:
- [ ] **Airport Transportation** → Arrival/Departure toggle, **searchable airline dropdown**, flight #, and after picking an airline the **Meet & Greet box** appears (United → *West Terminal, Door 508*; American → *East Terminal, Door 509*). Airport is auto-set as pickup (Arrival) or destination (Departure).
- [ ] **Private Aviation / FBO** → FBO terminal, aircraft type, tail #, FBO meet & greet
- [ ] **Executive & Corporate** → pickup/dropoff, optional hours, Company field
- [ ] **Hourly Chauffeur** → date, start time, duration, service area
- [ ] **Mountain Resort** → Pickup Type (Airport/Hotel/Residence); Airport option shows airline + meet & greet; resort dropdown
- [ ] **Wedding** → multi-stop **itinerary timeline** (Pickup → Venue → Return), add stop
- [ ] **Concert & Red Rocks / Sporting** → venue dropdown, event date/time, recommended-pickup note, post-event return
- [ ] **Bachelor & Bachelorette** → hourly + **as-directed itinerary** builder, Party Bus default
- [ ] **Trip Type** (One Way / Round Trip / Hourly) shows on every service; **Round Trip reveals** return location/date/time
- [ ] The **live summary sidebar** updates as you type; vehicle image changes with the vehicle category
- [ ] Required-field validation blocks submit; fixing errors clears them
- [ ] **Submit** → success screen. (No child seat / booster / booking-notes fields anywhere — only "Special Requests".)

### 3.3 Forms
- [ ] **Contact** (`/contact`): fill + send → success message
- [ ] **Quote** (`/quote`): fill + send → success message
- [ ] Both show an error state if the backend is down (stop the backend and retry)

### 3.4 Admin — Bookings
- [ ] Log in at `/admin`; wrong password is rejected
- [ ] Submitted bookings appear; click to expand full details (contact, trip, preferences, **Trip Specifics** from `details`, special requests)
- [ ] Change **status** dropdown (Pending → Confirmed …) — it persists on refresh
- [ ] **Email** button opens the composer (sends only if Resend is configured)

### 3.5 Admin — Inbox
- [ ] Contact + Quote submissions appear with the right **type badge** and "New" flag
- [ ] Expand to see message; change status; **Reply** opens the email composer (sets status to "Replied" on send)

### 3.6 Admin — Content (CMS) — the big one
For each section card (Business, Home Hero, Home Sections, About, Services, Fleet, Service Areas, Reviews):
- [ ] Open it; existing content is pre-filled
- [ ] **Edit** a text field → **Save Changes** → reload the public site → change is live
- [ ] **Image upload**: click the upload icon on any image field, pick a file → preview updates → Save → shows on the site
- [ ] **Collections** (Services/Fleet/Areas/Reviews): **Add New**, **Edit** (modal), **Delete**, and **reorder** (▲▼) → Save → reflected on the site
- [ ] Example quick check: edit **Business & Contact Info → Phone**, save, and confirm the header/footer/contact page show the new number

### 3.7 Emails (only if `RESEND_API_KEY` is set)
- [ ] Submit a booking → customer gets a confirmation, admin (`ADMIN_NOTIFY_EMAIL`) gets an alert
- [ ] Submit contact/quote → confirmation + admin alert
- [ ] Admin "Email/Reply" → customer receives the message
- [ ] Without a key: submissions still succeed; the backend log prints "RESEND_API_KEY not set — skipping…"

---

## 4. Quick data / API checks (optional)

Confirm data is really landing (Docker DB):
```bash
docker exec -e PGPASSWORD=dbl_local_password dbl-postgres \
  psql -U dbl -d denverblacklimo -c "select name, service_type, status from bookings; select type, name, status from inquiries;"
```

Hit the API directly:
```bash
curl -s http://localhost:3001/api/settings | head -c 200         # public content
curl -s -X POST http://localhost:3001/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{"type":"Contact","name":"T","email":"t@t.com","message":"hi"}'
```

---

## 5. Reset / troubleshooting

- **Fresh database:** `docker compose down -v && docker compose up -d && (cd denverblacklimo-backend && npm run migrate)`
- **Stop the DB (keep data):** `docker compose down`
- **"DATABASE_URL is not set":** add it to `denverblacklimo-backend/.env`
- **CORS errors in browser:** set `ALLOWED_ORIGIN="http://localhost:5173"` in the backend `.env`
- **Admin login fails:** check `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the backend `.env`
- **Port already in use:** something else is on 3001/5173/5433 — stop it or change the port

---

## 6. What's verified vs. needs your services

| Area | Status |
|---|---|
| Booking wizard (all services, meet & greet, round trip, itineraries) | ✅ works |
| Contact & Quote forms → database | ✅ verified end-to-end |
| Admin bookings / inbox / status / CMS save + auth | ✅ verified end-to-end |
| Migrations (dev/test/prod, SSL) | ✅ verified against real Postgres |
| **Emails** | ⚠️ needs a **Resend API key** to actually send |
| **Production DB** | ⚠️ needs the **DigitalOcean Managed DB** URL (see DEPLOYMENT_GUIDE.md) |

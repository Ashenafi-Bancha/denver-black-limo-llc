# Local & Production Deployment Guide

Here is a step-by-step guide on how to run your Denver Black Limo app locally and how to deploy it to production using **DigitalOcean App Platform**. This approach allows you to host your Frontend (Static Site), Backend (Web Service), and Database (Managed Postgres) all in one place.

---

## 1. Running the App Locally

### Setting up the Local Database (Neon)
For local development, it's often easiest to use a free cloud Postgres database like Neon.
1. Go to [neon.tech](https://neon.tech/) and sign up.
2. Create a new project (e.g., "denver-limo-db").
3. Copy the **Connection String** provided.

### Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd denverblacklimo-backend
   ```
2. Create a file named `.env` in this folder and add your variables:
   ```env
   DATABASE_URL="<Paste your Neon connection string here>"
   JWT_SECRET="my-super-secret-key"
   ADMIN_PASSWORD="admin"
   ```
3. Install dependencies, run migrations, and start the server:
   ```bash
   npm install
   npm run migrate   # creates/updates all tables (safe to run repeatedly)
   npm start
   ```
   *(Your backend is now running on `http://localhost:3001`. Migrations also run automatically on startup, so `npm run migrate` is optional locally — but it's the recommended way to apply schema changes explicitly.)*

### Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd denverblacklimo-frontend
   ```
2. Create a file named `.env` in this folder (though for local development, it defaults to localhost automatically):
   ```env
   VITE_API_URL="http://localhost:3001/api"
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(Your frontend is now running on `http://localhost:5173`)*

---

## Database Schema & Migrations

The database schema is version-controlled with plain SQL migration files — no ORM, no boot-time guesswork.

- **Where:** `denverblacklimo-backend/migrations/*.sql` (run in filename order).
- **Runner:** `denverblacklimo-backend/scripts/migrate.js` (`npm run migrate`). It records applied files in a `schema_migrations` table so each runs exactly once, wraps every file in a transaction, and uses a Postgres advisory lock so concurrent instances can't race.
- **Tables:** `bookings` (booking wizard), `inquiries` (contact + quote messages), `site_settings` (the CMS content store), plus `schema_migrations`.
- **SSL:** the connection pool auto-enables SSL when the `DATABASE_URL` contains `sslmode=require` (true for both Neon and DigitalOcean). Override with `DATABASE_SSL=true|false` only if needed.

**To change the schema:** add a new numbered file (e.g. `004_add_column.sql`) with idempotent SQL (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.), then run `npm run migrate`. Never edit an already-applied migration — add a new one.

**Environments:**
- **Dev:** a Neon database (or branch). Put its URL in `.env` and run `npm run migrate`.
- **Test:** a separate Neon branch or throwaway DB; run `npm run migrate` before your tests.
- **Production:** see Step D below — migrations run automatically on backend boot, and you can also run them as an explicit pre-deploy job.

---

## 2. Deploying to DigitalOcean App Platform

The DigitalOcean App Platform allows you to deploy the frontend, backend, and database together in a single App.

### Step A: Push to GitHub
1. Ensure your entire project (`denverblacklimo-backend` and `denverblacklimo-frontend`) is pushed to a GitHub repository.

### Step B: Set Up Your Email Service (Resend)
1. Go to [resend.com](https://resend.com/) and create a **free** account.
2. In the Resend Dashboard, go to **API Keys** → **Create API Key**. Copy the key (it starts with `re_`).
3. *(Optional but recommended for production)* Go to **Domains** → **Add Domain** and verify your domain (e.g., `denverblacklimo.com`). This lets you send from `noreply@denverblacklimo.com`.
   - For testing without a domain, use the default test sender: `onboarding@resend.dev` (emails only go to your Resend-verified email).

### Step B: Create an App in DigitalOcean
1. Log in to [DigitalOcean](https://cloud.digitalocean.com/) and navigate to **Apps**.
2. Click **Create App**.
3. Under **Service Provider**, select **GitHub**, authenticate if necessary, and select your repository.
4. Leave the Source Directory as `/` for now and click **Next**.
5. Click **Edit Plan** to select the tier you want (e.g., Basic or Professional).

### Step C: Configure the Database
1. On the **Resources** page, click **Add Resource** and select **Database**.
2. Choose **Dev Database** (for testing/cheap hosting) or **Managed Database** (for production reliability).
3. Name it (e.g., `db`). DigitalOcean will automatically expose a `DATABASE_URL` environment variable for it.

### Step D: Configure the Backend (Web Service)
1. Still on the **Resources** page, click **Add Resource** and select **Web Service**.
2. Point it to your GitHub repository and set the **Source Directory** to `/denverblacklimo-backend`.
3. Configure the following settings for the web service:
   - **Name**: `backend`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **HTTP Route**: `/api` (This makes the backend available at `your-app-url.com/api`)
   - **Migrations**: run automatically when the backend boots (`npm start` → migrations → server). SSL is handled automatically for the DO Managed Database. *(Optional, recommended for larger setups: add a **Pre-Deploy Job** component pointing to `/denverblacklimo-backend` with Run Command `npm run migrate` so schema changes are applied before the new backend goes live.)*
4. Go to the **Environment Variables** section for this Web Service and add:
   - `JWT_SECRET`: *(Enter a secure random string, e.g. from [randomkeygen.com](https://randomkeygen.com/))*
   - `ADMIN_EMAIL`: *(The email you use to log in to the admin dashboard)*
   - `ADMIN_PASSWORD`: *(Enter a secure password for your admin dashboard)*
   - `DATABASE_URL`: *(Reference `${db.DATABASE_URL}` to auto-inject the database URL from Step C)*
   - `RESEND_API_KEY`: *(Paste your Resend API key from Step B)*
   - `ADMIN_NOTIFY_EMAIL`: *(Your personal email to receive new booking alerts)*
   - `SENDER_EMAIL`: *(e.g., `noreply@denverblacklimo.com` if domain verified, or `onboarding@resend.dev` for testing)*

### Step E: Configure the Frontend (Static Site)
1. Click **Add Resource** again and select **Static Site**.
2. Point it to your GitHub repository and set the **Source Directory** to `/denverblacklimo-frontend`.
3. Configure the following settings for the static site:
   - **Name**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **HTTP Route**: `/`
4. Go to the **Environment Variables** section for this Static Site and add:
   - `VITE_API_URL`: `${APP_URL}/api` *(This dynamically injects the public URL of your App Platform deployment)*

### Step F: Review and Deploy
1. Click **Next** until you reach the Review page.
2. Review the resources: You should have a Database, a Web Service (`/api`), and a Static Site (`/`).
3. Click **Create Resources** (or Deploy).

DigitalOcean will now build and deploy your app. Once finished, you can visit the provided App URL, and both your frontend and backend will be live!

**Congratulations!** Your site is now live on DigitalOcean App Platform!

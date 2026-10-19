# DiabetesCare - Next.js + Supabase

The original HTML/CSS/JS clinic app, converted to a **pure Next.js (App Router) + Supabase** application.
There is no separate backend: Server Components, Server Actions and Route Handlers talk straight to Supabase
(Auth, PostgreSQL, Row Level Security). See [`APP_OVERVIEW.md`](./APP_OVERVIEW.md) for how everything fits together.

## 1. Install

```bash
npm install
```

Requires Node.js 20.6 or newer.

## 2. Create the Supabase project

1. Go to <https://supabase.com> and create a project.
2. **SQL Editor** -> paste the whole of `supabase/setup_database.sql` and click **Run**. It creates every table,
   relationship, trigger, security policy and default setting, and contains no demo data. It is safe to run again.
   (Supabase CLI users can use the same content split into `supabase/migrations/001-003` with `supabase db push`.)

   If you already ran the old Prisma-style script (tables `"User"`, `"Patient"`, ... with `passwordHash`), run
   `supabase/optional/reset_legacy_prisma_tables.sql` first. That script revoked the access this app needs.
3. **Authentication -> Providers -> Email**: keep **Confirm email** switched **on** for real use.
   Patients who register with an email the clinic already has on file are linked to that record, so the email
   must be proven first. Turn it off only for local testing.
4. **Authentication -> URL Configuration**: add these to *Redirect URLs* (use your real domain in production):
   - `http://localhost:3000/auth/callback`
5. Storage: the app does not store files yet, so no bucket is needed.

## 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings -> API -> Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings -> API Keys -> Publishable key (legacy projects: `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings -> API Keys -> Secret / service_role key. **Server only - never prefix with `NEXT_PUBLIC_`, never commit.** |

Optional: `NEXT_PUBLIC_SITE_URL` (public URL used in emails) and `CLINIC_TIMEZONE` (default `Asia/Manila`).

## 4. Create the first administrator

Staff cannot register themselves. In **SQL Editor** open `supabase/create_first_admin.sql`, change the name, email and
password at the top, and click **Run**. Then log in at `/login`. Change the password afterwards in **Admin Panel -> Settings**.

(Alternative from your terminal: `npm run create-admin -- you@clinic.com "password" "Your Name"`.)

There are no demo or pre-made accounts. Every other staff login is created by an administrator in **Admin Panel -> Staff**, and patients register themselves.

## 5. Run

```bash
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

Checks: `npm run lint` and `npm run typecheck`.

## Notes

- **Middleware:** this project targets Next.js 15 and uses `src/middleware.ts`. If you upgrade to Next.js 16, rename it
  to `src/proxy.ts` and rename the exported function to `proxy` (nothing else changes).
- **Styling:** the original CSS is reused as-is (scoped per area so `style.css` and `admin.css` can't clash).
  Tailwind v4 is installed for new components, without its reset, so it cannot change the existing look.
- **Switches on the Settings page** ("Email Notifications", "Automatic Backups") are stored preferences only.
  Supabase handles backups itself and nothing sends notification emails yet.
- **Glucose:** the original had no screen for recording readings, so the Glucose Report reads an (empty) `glucose_readings` table.

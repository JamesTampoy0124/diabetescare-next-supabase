# DiabetesCare - app overview (pure Next.js + Supabase)

## Architecture

```text
Browser
  |  React (Client Components only where interaction is needed: forms, modals, filters)
  v
Next.js App Router
  |-- middleware.ts          refresh Supabase session, redirect visitors, 15-minute idle timeout
  |-- Server Components      read data (dashboard, lists) with the logged-in user's rights
  |-- Server Actions         every create / update / archive / password operation (validated with zod)
  |-- Route Handlers         /auth/callback (email links), /auth/signout, /api/session/touch
  v
Supabase
  |-- Auth                   passwords, sessions, email confirmation, password reset
  |-- PostgreSQL + RLS       profiles, patients, appointments, medications, reports, notifications, ...
```

No Express/NestJS, no local JSON "database", no localStorage data. The service-role key is used only in
`src/lib/supabase/admin.ts` (marked `server-only`) for creating staff logins, resetting passwords and the
login-lockout table.

## Pages

| Original file | Now | Who |
| --- | --- | --- |
| `index.html` (login + register toggle) | `/login`, `/register`, `/forgot-password`, `/reset-password` | everyone |
| `dashboard.html` | `/dashboard` | all logged-in roles |
| `admin.html` sections | `/admin` (dashboard), `/admin/patients`, `/staff`, `/appointments`, `/medications`, `/reports`, `/notifications`, `/settings` | admin only |
| `guard.js` | `middleware.ts` + `requireProfile()` in every page/action + RLS | - |
| `store.js` | Supabase tables + `src/lib/*` helpers | - |

## What was real vs. placeholder in the original

| Feature | Original | Now |
| --- | --- | --- |
| Login, register, roles, lockout (5 tries / 5 min), idle timeout | worked (localStorage) | works, enforced on the server |
| Patients: add / view / edit / archive / search / filter | worked | works, search + filter + paging run in the database |
| Staff: add / (de)activate / reset password | worked | works through Supabase Auth |
| Dashboard numbers | partly hard-coded | real counts (patients, staff, appointments this month, reports) |
| Appointments, medications | hard-coded rows, placeholder buttons | real tables, "New Appointment" / "Add Medication" forms, status updates |
| Reports | `alert("Report generated")` | computed in the database, stored, listed under "Recent Reports" |
| Notifications | hard-coded | created by database triggers (new patient, pending appointment, report) |
| Settings: edit name / email / password | password only | all three; the two switches are saved preferences |
| Forgot password | "ask the admin" | Supabase reset email |

## Security model

- **Roles** come from `profiles.role`, set only by the database trigger from `app_metadata` (server-writable).
  Public sign-ups are always patients.
- **Three layers:** middleware (logged in? idle?), page/action `requireProfile(["admin"])`, and Row Level Security
  in PostgreSQL. Layouts are not trusted for authorization because they don't re-run on every navigation.
- Deactivated accounts are blocked at login and on every request; patient archive/restore also switches the patient's login (trigger).
- Patient records are archived, never deleted (no delete policy).
- Passwords never touch the app's tables. Login errors are generic; the forgot-password answer doesn't reveal whether an email exists.

## Folder map

```text
src/
  middleware.ts
  app/            routes: (auth)/, dashboard/, admin/, auth/, api/
  actions/        Server Actions (auth, patients, staff, appointments, medications, reports, notifications, settings)
  components/     auth/, layout/, admin/, ui/
  lib/            supabase/ (client, server, admin, middleware), auth.ts, session.ts, validations/, utils/
  styles/         globals.css, auth.css, admin.css, dashboard.css (original CSS, scoped)
  types/
supabase/setup_database.sql    one-paste setup (= migrations 001+002+003)
supabase/create_first_admin.sql  first administrator login
supabase/migrations/   001 schema, 002 RLS, 003 settings defaults (for the Supabase CLI)
scripts/               create-admin.mjs
```

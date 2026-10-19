-- =====================================================================
-- DiabetesCare - Row Level Security
-- Run AFTER 001_initial_schema.sql.
--
-- Rules of thumb:
--   * RLS is ON for every table. No table is left open.
--   * Visitors who are not logged in (anon) can read and write nothing.
--   * The browser only ever holds the publishable key; the service-role
--     key (server only) is used for Auth admin tasks and login_attempts.
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.patients          enable row level security;
alter table public.appointments      enable row level security;
alter table public.medications       enable row level security;
alter table public.glucose_readings  enable row level security;
alter table public.reports           enable row level security;
alter table public.notifications     enable row level security;
alter table public.system_settings   enable row level security;
alter table public.login_attempts    enable row level security;

-- login_attempts has NO policies on purpose: only the service role can use it.
revoke all on public.login_attempts from anon, authenticated;

-- Nothing here is meant for visitors who are not logged in.
revoke all on public.profiles, public.patients, public.appointments,
              public.medications, public.glucose_readings, public.reports,
              public.notifications, public.system_settings
  from anon;


-- ---------- profiles -------------------------------------------------

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: staff read all"
  on public.profiles for select
  to authenticated
  using ((select public.is_staff()));

create policy "profiles: admin update"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- No insert/delete policies: profiles are created by the trigger in 001
-- and removed only when the auth user is deleted.


-- ---------- patients -------------------------------------------------

create policy "patients: staff read"
  on public.patients for select
  to authenticated
  using ((select public.is_staff()));

create policy "patients: patient reads own record"
  on public.patients for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "patients: front office insert"
  on public.patients for insert
  to authenticated
  with check ((select public.is_front_office()));

create policy "patients: front office update"
  on public.patients for update
  to authenticated
  using ((select public.is_front_office()))
  with check ((select public.is_front_office()));

-- No delete policy: records are archived, never deleted.


-- ---------- appointments --------------------------------------------

create policy "appointments: staff read"
  on public.appointments for select
  to authenticated
  using ((select public.is_staff()));

create policy "appointments: patient reads own"
  on public.appointments for select
  to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.id = appointments.patient_id
        and p.profile_id = (select auth.uid())
    )
  );

create policy "appointments: front office insert"
  on public.appointments for insert
  to authenticated
  with check ((select public.is_front_office()));

create policy "appointments: front office update"
  on public.appointments for update
  to authenticated
  using ((select public.is_front_office()))
  with check ((select public.is_front_office()));


-- ---------- medications ---------------------------------------------

create policy "medications: logged-in users read"
  on public.medications for select
  to authenticated
  using (true);

create policy "medications: admin insert"
  on public.medications for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "medications: admin update"
  on public.medications for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- ---------- glucose_readings ----------------------------------------

create policy "glucose: staff read"
  on public.glucose_readings for select
  to authenticated
  using ((select public.is_staff()));

create policy "glucose: patient reads own"
  on public.glucose_readings for select
  to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.id = glucose_readings.patient_id
        and p.profile_id = (select auth.uid())
    )
  );

create policy "glucose: patient adds own"
  on public.glucose_readings for insert
  to authenticated
  with check (
    exists (
      select 1 from public.patients p
      where p.id = glucose_readings.patient_id
        and p.profile_id = (select auth.uid())
        and p.status = 'Active'
    )
  );


-- ---------- reports --------------------------------------------------

create policy "reports: admin read"
  on public.reports for select
  to authenticated
  using ((select public.is_admin()));

create policy "reports: admin insert"
  on public.reports for insert
  to authenticated
  with check ((select public.is_admin()));


-- ---------- notifications -------------------------------------------

create policy "notifications: admin read"
  on public.notifications for select
  to authenticated
  using ((select public.is_admin()));

create policy "notifications: admin update"
  on public.notifications for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Rows are inserted by the SECURITY DEFINER triggers in 001.


-- ---------- system_settings -----------------------------------------

create policy "settings: admin read"
  on public.system_settings for select
  to authenticated
  using ((select public.is_admin()));

create policy "settings: admin insert"
  on public.system_settings for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "settings: admin update"
  on public.system_settings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));


-- =====================================================================
-- Grants (belt and braces)
-- RLS decides WHICH rows a user may touch; these grants only let the
-- "authenticated" role reach the tables at all. They are repeated here on
-- purpose so the app also works if default privileges on this project were
-- ever changed (for example by an older script that revoked them).
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.profiles, public.patients, public.appointments, public.medications,
  public.glucose_readings, public.reports, public.notifications, public.system_settings
  to authenticated;

grant all on
  public.profiles, public.patients, public.appointments, public.medications,
  public.glucose_readings, public.reports, public.notifications, public.system_settings,
  public.login_attempts
  to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

revoke execute on function public.is_admin(), public.is_front_office(), public.is_staff() from public, anon;
grant  execute on function public.is_admin(), public.is_front_office(), public.is_staff() to authenticated, service_role;

revoke execute on function public.generate_report(public.report_type, date) from public, anon;
grant  execute on function public.generate_report(public.report_type, date) to authenticated, service_role;

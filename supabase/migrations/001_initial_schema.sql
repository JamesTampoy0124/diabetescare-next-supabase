-- =====================================================================
-- DiabetesCare - initial schema
-- Run in the Supabase SQL editor (or `supabase db push`) BEFORE 002 and 003.
-- =====================================================================

-- ---------- Types ----------------------------------------------------

create type public.user_role as enum ('admin', 'doctor', 'nurse', 'frontdesk', 'patient');
create type public.record_status as enum ('Active', 'Inactive');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type public.report_type as enum ('patient', 'glucose', 'appointment');


-- ---------- Generic helpers ------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------- profiles (one row per login: staff AND patients) ----------
-- Replaces the old "diabetesUsers" localStorage list. Passwords live in
-- Supabase Auth (auth.users), never in this table.

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        public.user_role not null default 'patient',
  specialty   text not null default '',
  phone       text not null default '',
  birth_date  date,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email))
);

create unique index profiles_email_key on public.profiles (email);
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ---------- patients (clinic records; may or may not have a login) ----
-- Replaces "diabetesPatients". Records are archived (status = 'Inactive'),
-- never deleted, so patient numbers are never reused.

create table public.patients (
  id              uuid primary key default gen_random_uuid(),
  patient_number  integer generated always as identity,
  name            text not null,
  email           text not null default '',
  phone           text not null default '',
  birth_date      date,
  status          public.record_status not null default 'Active',
  source          text not null default 'admin',
  profile_id      uuid unique references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint patients_name_length check (char_length(trim(name)) between 2 and 80),
  constraint patients_email_lowercase check (email = lower(email)),
  constraint patients_source_check check (source in ('admin', 'self-registration'))
);

create unique index patients_number_key on public.patients (patient_number);
create unique index patients_email_key on public.patients (email) where email <> '';
create index patients_status_idx on public.patients (status);
create index patients_created_at_idx on public.patients (created_at desc);
create index patients_name_idx on public.patients (lower(name));

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();


-- ---------- appointments --------------------------------------------
-- Date and time are stored as the clinic's local date/time on purpose
-- (no time-zone conversion surprises).

create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null,
  doctor_id         uuid,
  appointment_date  date not null,
  appointment_time  time not null,
  status            public.appointment_status not null default 'pending',
  notes             text not null default '',
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint appointments_patient_id_fkey
    foreign key (patient_id) references public.patients (id) on delete restrict,
  constraint appointments_doctor_id_fkey
    foreign key (doctor_id) references public.profiles (id) on delete set null,
  constraint appointments_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null
);

create index appointments_date_idx on public.appointments (appointment_date, appointment_time);
create index appointments_patient_idx on public.appointments (patient_id);
create index appointments_doctor_idx on public.appointments (doctor_id);
create index appointments_status_idx on public.appointments (status);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();


-- ---------- medications (clinic medication catalogue) ----------------

create table public.medications (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  dosage       text not null default '',
  status       public.record_status not null default 'Active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint medications_name_length check (char_length(trim(name)) between 1 and 80)
);

create unique index medications_name_key on public.medications (lower(name));

create trigger medications_set_updated_at
  before update on public.medications
  for each row execute function public.set_updated_at();


-- ---------- glucose_readings ----------------------------------------
-- Needed so the "Glucose Report" has a real data source. The original
-- project has no screen for recording readings yet.

create table public.glucose_readings (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  value_mgdl   numeric(5, 1) not null check (value_mgdl between 10 and 900),
  measured_at  timestamptz not null default now(),
  notes        text not null default '',
  created_at   timestamptz not null default now()
);

create index glucose_readings_patient_idx on public.glucose_readings (patient_id, measured_at desc);


-- ---------- reports --------------------------------------------------

create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  type          public.report_type not null,
  summary       jsonb not null default '{}'::jsonb,
  generated_by  uuid references public.profiles (id) on delete set null,
  generated_at  timestamptz not null default now()
);

create index reports_generated_at_idx on public.reports (generated_at desc);


-- ---------- notifications (admin bell + Notifications page) ----------

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  message     text not null default '',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_created_at_idx on public.notifications (created_at desc);
create index notifications_unread_idx on public.notifications (created_at desc) where read_at is null;


-- ---------- system_settings (admin Settings page switches) -----------

create table public.system_settings (
  key         text primary key,
  value       boolean not null default true,
  updated_at  timestamptz not null default now()
);


-- ---------- login_attempts (server-side lockout) ---------------------
-- Only the server (service role) touches this table; see 002 for RLS.

create table public.login_attempts (
  email         text primary key,
  fail_count    integer not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);


-- =====================================================================
-- Role helper functions (used by the RLS policies in 002)
-- SECURITY DEFINER so they can read profiles without RLS recursion.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin'
  );
$$;

create or replace function public.is_front_office()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('admin', 'frontdesk')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role in ('admin', 'doctor', 'nurse', 'frontdesk')
  );
$$;


-- =====================================================================
-- New auth user  ->  profile (+ patient record for patients)
-- Role comes ONLY from raw_app_meta_data, which can be set by the server
-- (admin API) but NOT by a visitor calling signUp. Anyone registering
-- publicly is always a patient.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role     public.user_role;
  v_email    text := lower(new.email);
  v_name     text;
  v_phone    text := coalesce(trim(new.raw_user_meta_data ->> 'phone'), '');
  v_birth    date;
  v_patient  public.patients;
begin
  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'patient')::public.user_role;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(v_email, '@', 1)
  );

  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;

  insert into public.profiles (id, email, full_name, role, specialty, phone, birth_date, created_by)
  values (
    new.id,
    v_email,
    v_name,
    v_role,
    coalesce(new.raw_app_meta_data ->> 'specialty', ''),
    v_phone,
    v_birth,
    nullif(new.raw_app_meta_data ->> 'created_by', '')::uuid
  );

  if v_role = 'patient' then

    select * into v_patient from public.patients where email = v_email limit 1;

    if found then
      -- The clinic already created a record for this email: link to it.
      if v_patient.status = 'Inactive' then
        raise exception 'This patient record is inactive. Please contact the clinic.';
      end if;

      update public.patients
      set profile_id = new.id,
          phone      = case when phone = '' then v_phone else phone end,
          birth_date = coalesce(birth_date, v_birth)
      where id = v_patient.id;
    else
      insert into public.patients (name, email, phone, birth_date, source, profile_id)
      values (v_name, v_email, v_phone, v_birth, 'self-registration', new.id);
    end if;

  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Keep profiles.email in step when a user confirms an email change.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();


-- Archiving / restoring or renaming a patient also updates their login.
create or replace function public.sync_patient_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null
     and (new.status is distinct from old.status or new.name is distinct from old.name) then
    update public.profiles
    set active    = (new.status = 'Active'),
        full_name = new.name
    where id = new.profile_id and role = 'patient';
  end if;
  return new;
end;
$$;

create trigger patients_sync_profile
  after update of status, name on public.patients
  for each row execute function public.sync_patient_to_profile();


-- =====================================================================
-- Notifications raised by database events
-- =====================================================================

create or replace function public.notify_new_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (title, message)
  values (
    'New patient registered',
    case when new.source = 'self-registration'
      then 'A new patient has created an account.'
      else 'A patient record was added by staff.'
    end
  );
  return new;
end;
$$;

create trigger patients_notify_insert
  after insert on public.patients
  for each row execute function public.notify_new_patient();


create or replace function public.notify_pending_appointment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (title, message)
    values ('Appointment pending', 'An appointment requires confirmation.');
  end if;
  return new;
end;
$$;

create trigger appointments_notify_insert
  after insert on public.appointments
  for each row execute function public.notify_pending_appointment();


-- =====================================================================
-- Report generation (runs with the caller's rights, so RLS applies)
-- =====================================================================

create or replace function public.generate_report(p_type public.report_type, p_today date)
returns public.reports
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_summary jsonb;
  v_row     public.reports;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if p_type = 'patient' then

    select jsonb_build_object(
      'total',           count(*),
      'active',          count(*) filter (where status = 'Active'),
      'inactive',        count(*) filter (where status = 'Inactive'),
      'self_registered', count(*) filter (where source = 'self-registration'),
      'added_by_staff',  count(*) filter (where source = 'admin')
    )
    into v_summary
    from public.patients;

  elsif p_type = 'appointment' then

    select jsonb_build_object(
      'total',     count(*),
      'pending',   count(*) filter (where status = 'pending'),
      'confirmed', count(*) filter (where status = 'confirmed'),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'upcoming',  count(*) filter (
                     where appointment_date >= p_today
                       and status in ('pending', 'confirmed')
                   )
    )
    into v_summary
    from public.appointments;

  else

    select jsonb_build_object(
      'readings', count(*),
      'patients', count(distinct patient_id),
      'average',  round(avg(value_mgdl), 1),
      'lowest',   min(value_mgdl),
      'highest',  max(value_mgdl)
    )
    into v_summary
    from public.glucose_readings;

  end if;

  insert into public.reports (type, summary, generated_by)
  values (p_type, v_summary, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.notify_report_generated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (title, message)
  values ('Report generated', 'A ' || new.type::text || ' report was generated.');
  return new;
end;
$$;

create trigger reports_notify_insert
  after insert on public.reports
  for each row execute function public.notify_report_generated();

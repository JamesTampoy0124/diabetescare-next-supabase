-- =====================================================================
-- DiabetesCare - PATIENT PORTAL + DOCTOR APPOINTMENTS
-- Run once in Supabase -> SQL Editor (after setup_database.sql). Safe to run again.
--
--  * Doctors can create appointments for THEMSELVES and update the status of THEIR OWN appointments.
--  * Patients can read their own appointments (view only), including the doctor's name,
--    through the function my_appointments(). They cannot create, edit or cancel anything.
--  * Admin and front desk keep the access they already have.
-- =====================================================================

-- Is the logged-in user an active doctor?
create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'doctor' and active
  )
$$;

revoke execute on function public.is_doctor() from public, anon;
grant  execute on function public.is_doctor() to authenticated, service_role;

-- Doctors: create appointments assigned to themselves
drop policy if exists "appointments: doctor insert own" on public.appointments;
create policy "appointments: doctor insert own"
  on public.appointments for insert
  to authenticated
  with check ((select public.is_doctor()) and doctor_id = (select auth.uid()));

-- Doctors: update their own appointments (they cannot hand them to another doctor)
drop policy if exists "appointments: doctor update own" on public.appointments;
create policy "appointments: doctor update own"
  on public.appointments for update
  to authenticated
  using ((select public.is_doctor()) and doctor_id = (select auth.uid()))
  with check ((select public.is_doctor()) and doctor_id = (select auth.uid()));

-- Patients: their own appointments with the doctor's name (read only)
create or replace function public.my_appointments()
returns table (
  id               uuid,
  appointment_date date,
  appointment_time time,
  status           public.appointment_status,
  notes            text,
  doctor_name      text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.appointment_date, a.appointment_time, a.status, a.notes, d.full_name
  from public.appointments a
  join public.patients p
    on p.id = a.patient_id and p.profile_id = (select auth.uid())
  left join public.profiles d on d.id = a.doctor_id
  where exists (
    select 1 from public.profiles me
    where me.id = (select auth.uid()) and me.active
  )
  order by a.appointment_date desc, a.appointment_time desc
$$;

revoke execute on function public.my_appointments() from public, anon;
grant  execute on function public.my_appointments() to authenticated, service_role;

notify pgrst, 'reload schema';

-- Check: both policies and both functions should be listed
select 'policy' as kind, policyname as name from pg_policies
  where schemaname = 'public' and tablename = 'appointments' and policyname like 'appointments: doctor%'
union all
select 'function', proname from pg_proc
  where pronamespace = 'public'::regnamespace and proname in ('is_doctor', 'my_appointments');

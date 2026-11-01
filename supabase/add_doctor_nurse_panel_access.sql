-- =====================================================================
-- DiabetesCare - DOCTOR AND NURSE ACCESS TO THE ADMIN PANEL
-- Run once in Supabase -> SQL Editor, AFTER add_patient_portal_and_doctor_access.sql. Safe to run again.
--
-- Doctors and nurses open the same panel as the administrator, without Staff management:
--   patients      add and edit (only the administrator archives / restores)
--   appointments  nurse: view only - doctor: their own (allowed by the previous script) - admin: all.
--                 Front desk can no longer create or change appointments.
--   medications   the administrator and doctors add; nurses view only
--   reports       generate and read
--   notifications read
-- Patients are unchanged.
-- =====================================================================

create or replace function public.is_doctor_or_nurse()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('doctor', 'nurse') and active)
$$;

create or replace function public.is_panel_user()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'doctor', 'nurse') and active)
$$;

revoke execute on function public.is_doctor_or_nurse(), public.is_panel_user() from public, anon;
grant  execute on function public.is_doctor_or_nurse(), public.is_panel_user() to authenticated, service_role;

-- Patients: doctors and nurses can add and edit
drop policy if exists "patients: doctor nurse insert" on public.patients;
create policy "patients: doctor nurse insert"
  on public.patients for insert to authenticated
  with check ((select public.is_doctor_or_nurse()));

drop policy if exists "patients: doctor nurse update" on public.patients;
create policy "patients: doctor nurse update"
  on public.patients for update to authenticated
  using ((select public.is_doctor_or_nurse()))
  with check ((select public.is_doctor_or_nurse()));

-- ...but only the administrator may archive or restore a patient (this also switches the patient's login off/on).
create or replace function public.guard_patient_status()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and (select auth.uid()) is not null          -- the SQL editor and server tools are not blocked
     and not (select public.is_admin()) then
    raise exception 'Only an administrator can archive or restore a patient.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists patients_guard_status on public.patients;
create trigger patients_guard_status
  before update of status on public.patients
  for each row execute function public.guard_patient_status();

-- Appointments: only the administrator (and each doctor for their own, see the previous script) can create or change them.
-- Nurses, front desk and patients can only view. (Removes the nurse policies from an earlier version of this script.)
drop policy if exists "appointments: nurse insert" on public.appointments;
drop policy if exists "appointments: nurse update" on public.appointments;

drop policy if exists "appointments: admin insert" on public.appointments;
create policy "appointments: admin insert"
  on public.appointments for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "appointments: admin update" on public.appointments;
create policy "appointments: admin update"
  on public.appointments for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "appointments: front office insert" on public.appointments;
drop policy if exists "appointments: front office update" on public.appointments;

-- Medications: doctors can add (the administrator already can)
drop policy if exists "medications: doctor insert" on public.medications;
create policy "medications: doctor insert"
  on public.medications for insert to authenticated
  with check ((select public.is_doctor()));

-- Reports: read and generate
drop policy if exists "reports: panel read" on public.reports;
create policy "reports: panel read"
  on public.reports for select to authenticated
  using ((select public.is_panel_user()));

drop policy if exists "reports: panel insert" on public.reports;
create policy "reports: panel insert"
  on public.reports for insert to authenticated
  with check ((select public.is_panel_user()));

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
  if not public.is_panel_user() then
    raise exception 'Not authorized';
  end if;

  if p_type = 'patient' then
    select jsonb_build_object(
      'total',           count(*),
      'active',          count(*) filter (where status = 'Active'),
      'inactive',        count(*) filter (where status = 'Inactive'),
      'self_registered', count(*) filter (where source = 'self-registration'),
      'added_by_staff',  count(*) filter (where source = 'admin')
    ) into v_summary from public.patients;

  elsif p_type = 'appointment' then
    select jsonb_build_object(
      'total',     count(*),
      'pending',   count(*) filter (where status = 'pending'),
      'confirmed', count(*) filter (where status = 'confirmed'),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'upcoming',  count(*) filter (where appointment_date >= p_today and status in ('pending', 'confirmed'))
    ) into v_summary from public.appointments;

  else
    select jsonb_build_object(
      'readings', count(*),
      'patients', count(distinct patient_id),
      'average',  round(avg(value_mgdl), 1),
      'lowest',   min(value_mgdl),
      'highest',  max(value_mgdl)
    ) into v_summary from public.glucose_readings;
  end if;

  insert into public.reports (type, summary, generated_by)
  values (p_type, v_summary, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- Notifications: read (only the administrator marks them as read)
drop policy if exists "notifications: panel read" on public.notifications;
create policy "notifications: panel read"
  on public.notifications for select to authenticated
  using ((select public.is_panel_user()));

notify pgrst, 'reload schema';

-- Check: these policies should be listed
select tablename, policyname from pg_policies
where schemaname = 'public'
  and policyname in ('patients: doctor nurse insert', 'patients: doctor nurse update', 'appointments: admin insert',
                     'appointments: admin update', 'medications: doctor insert', 'reports: panel read', 'reports: panel insert',
                     'notifications: panel read')
order by tablename, policyname;

-- =====================================================================
-- DiabetesCare - APPOINTMENT REMINDERS FOR DOCTORS
-- Run once in Supabase -> SQL Editor, AFTER add_glucose_and_video.sql and add_meeting_link.sql.
-- Safe to run again.
--
-- A doctor gets two in-app reminders per appointment (bell + Notifications page):
--   * "Appointment tomorrow"        - from the day before the appointment
--   * "Appointment starting soon"   - within the 30 minutes before it starts
-- Only for the appointment's own doctor. Pending and confirmed appointments count.
--
-- No scheduled job is needed: the app creates a doctor's reminders whenever that doctor has the admin panel open
-- (it also refreshes once a minute). Each reminder is created only once per appointment.
--
-- Notifications become private per person from now on:
--   * administrators see the system notifications (new patient, pending appointment, ...)
--   * a doctor sees only their own reminders
--   * nurses and front desk see none
-- =====================================================================

alter table public.notifications
  add column if not exists recipient_id   uuid references public.profiles(id) on delete cascade,   -- null = system notification (admins)
  add column if not exists appointment_id uuid references public.appointments(id) on delete cascade,
  add column if not exists kind           text;

-- one reminder of each kind per appointment
create unique index if not exists notifications_reminder_once
  on public.notifications (appointment_id, kind)
  where appointment_id is not null;

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, read_at);

-- Who can read and mark as read
drop policy if exists "notifications: admin read"  on public.notifications;
drop policy if exists "notifications: panel read"  on public.notifications;
drop policy if exists "notifications: admin update" on public.notifications;
drop policy if exists "notifications: read"        on public.notifications;
drop policy if exists "notifications: update"      on public.notifications;

create policy "notifications: read"
  on public.notifications for select to authenticated
  using (
    ((select public.is_admin()) and recipient_id is null)
    or recipient_id = (select auth.uid())
  );

create policy "notifications: update"
  on public.notifications for update to authenticated
  using (
    ((select public.is_admin()) and recipient_id is null)
    or recipient_id = (select auth.uid())
  )
  with check (
    ((select public.is_admin()) and recipient_id is null)
    or recipient_id = (select auth.uid())
  );

-- Creates the calling doctor's reminders that are due (and have not been created yet).
-- Times are in the clinic time zone: change 'Asia/Manila' below if the clinic is elsewhere.
create or replace function public.create_my_appointment_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid      := (select auth.uid());
  v_now   timestamp := (now() at time zone 'Asia/Manila');
  v_today date      := (now() at time zone 'Asia/Manila')::date;
begin
  if v_uid is null or not (select public.is_doctor()) then
    return;
  end if;

  -- the day before
  insert into public.notifications (title, message, recipient_id, appointment_id, kind)
  select 'Appointment tomorrow',
         'Tomorrow at ' || to_char(a.appointment_time, 'FMHH12:MI AM') || ' with ' || p.name
           || ' (P' || lpad(p.patient_number::text, 3, '0') || ')'
           || case when a.status = 'pending' then '. Still pending - remember to confirm it.' else '.' end,
         v_uid, a.id, 'day_before'
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  where a.doctor_id = v_uid
    and a.status in ('pending', 'confirmed')
    and a.appointment_date = v_today + 1
  on conflict do nothing;

  -- within the 30 minutes before the start
  insert into public.notifications (title, message, recipient_id, appointment_id, kind)
  select 'Appointment starting soon',
         'Today at ' || to_char(a.appointment_time, 'FMHH12:MI AM') || ' with ' || p.name
           || ' (P' || lpad(p.patient_number::text, 3, '0') || ')'
           || case when a.status = 'pending' then '. Still pending - remember to confirm it.' else '.' end,
         v_uid, a.id, 'soon'
  from public.appointments a
  join public.patients p on p.id = a.patient_id
  where a.doctor_id = v_uid
    and a.status in ('pending', 'confirmed')
    and a.appointment_date = v_today
    and (a.appointment_date + a.appointment_time) >  v_now
    and (a.appointment_date + a.appointment_time) <= v_now + interval '30 minutes'
  on conflict do nothing;
end;
$$;

revoke execute on function public.create_my_appointment_reminders() from public, anon;
grant  execute on function public.create_my_appointment_reminders() to authenticated, service_role;

notify pgrst, 'reload schema';

-- Check: the new columns, policies and function should be listed
select 'column' as kind, column_name as name from information_schema.columns
  where table_schema = 'public' and table_name = 'notifications'
    and column_name in ('recipient_id', 'appointment_id', 'kind')
union all
select 'policy', policyname from pg_policies where schemaname = 'public' and tablename = 'notifications'
union all
select 'function', proname from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'create_my_appointment_reminders'
order by kind, name;

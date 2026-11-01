-- =====================================================================
-- DiabetesCare - ADD AN "age" COLUMN TO THE PATIENTS TABLE
-- Run once in Supabase -> SQL Editor (after add_patient_health_fields.sql). Safe to run again.
--
-- age is filled in automatically from birth_date:
--   * when a patient is added, or their date of birth is changed (trigger),
--   * for every patient that already exists (backfill below),
--   * and refreshed every day so it never goes out of date (step 4, optional).
-- The app itself always shows the age calculated live from the date of birth.
-- =====================================================================

-- 1. The column
alter table public.patients add column if not exists age integer;

-- 2. Age in whole years, using the clinic's local date. Change 'Asia/Manila' to your time zone if needed.
create or replace function public.compute_age(p_birth date)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth is null then null
    when p_birth > (now() at time zone 'Asia/Manila')::date then null
    else extract(year from age((now() at time zone 'Asia/Manila')::date, p_birth))::integer
  end
$$;

grant execute on function public.compute_age(date) to authenticated, service_role;

-- 3. Keep it correct automatically when a patient is added or the birth date changes
create or replace function public.set_patient_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.age := public.compute_age(new.birth_date);
  return new;
end;
$$;

drop trigger if exists patients_set_age on public.patients;
create trigger patients_set_age
  before insert or update of birth_date on public.patients
  for each row execute function public.set_patient_age();

-- Fill in the age of every patient that already exists
update public.patients set age = public.compute_age(birth_date);

-- 4. OPTIONAL - refresh all ages once a day (birthdays pass while nobody edits the record).
--    First switch on pg_cron: Supabase -> Database -> Extensions -> pg_cron.
--    Then run the two statements below (remove the leading "-- ").
create or replace function public.refresh_patient_ages()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.patients
  set age = public.compute_age(birth_date)
  where age is distinct from public.compute_age(birth_date);
$$;

revoke execute on function public.refresh_patient_ages() from public, anon, authenticated;
grant  execute on function public.refresh_patient_ages() to service_role;

-- select cron.schedule('refresh-patient-ages', '5 16 * * *', 'select public.refresh_patient_ages()');  -- every day at 00:05 Manila time
-- (to stop it later:  select cron.unschedule('refresh-patient-ages');)

notify pgrst, 'reload schema';

-- Check: patients with their age
select patient_number, name, birth_date, age from public.patients order by patient_number;

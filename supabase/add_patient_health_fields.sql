-- =====================================================================
-- DiabetesCare - ADD BP, HIP, WAIST AND PHILHEALTH TO THE PATIENTS TABLE
-- Run once in Supabase -> SQL Editor. Safe to run again. Existing patients keep
-- all their data (the new columns start empty).
--
-- Age is NOT stored: the app works it out from the date of birth, so it is
-- always correct and never needs updating.
-- =====================================================================

alter table public.patients
  add column if not exists blood_pressure    text         not null default '',   -- e.g. 120/80 (mmHg)
  add column if not exists hip_cm            numeric(4,1),                       -- centimetres, empty = not recorded
  add column if not exists waist_cm          numeric(4,1),                       -- centimetres, empty = not recorded
  add column if not exists philhealth_number text         not null default '';   -- 12 digits, no dashes

alter table public.patients drop constraint if exists patients_blood_pressure_check;
alter table public.patients add  constraint patients_blood_pressure_check
  check (blood_pressure = '' or blood_pressure ~ '^[0-9]{2,3}/[0-9]{2,3}$');

alter table public.patients drop constraint if exists patients_hip_cm_check;
alter table public.patients add  constraint patients_hip_cm_check
  check (hip_cm is null or (hip_cm >= 20 and hip_cm <= 300));

alter table public.patients drop constraint if exists patients_waist_cm_check;
alter table public.patients add  constraint patients_waist_cm_check
  check (waist_cm is null or (waist_cm >= 20 and waist_cm <= 300));

alter table public.patients drop constraint if exists patients_philhealth_number_check;
alter table public.patients add  constraint patients_philhealth_number_check
  check (philhealth_number = '' or philhealth_number ~ '^[0-9]{12}$');

-- Make the API pick up the new columns right away
notify pgrst, 'reload schema';

-- Check: the four new columns should be listed
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'patients'
  and column_name in ('blood_pressure', 'hip_cm', 'waist_cm', 'philhealth_number')
order by column_name;

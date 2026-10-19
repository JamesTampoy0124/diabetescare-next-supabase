-- =====================================================================
-- OPTIONAL - only if you already ran the old Prisma-style script
-- (tables "User", "Patient", "Appointment", "Medication", "Report" with a
-- passwordHash column). That design belongs to the dropped NestJS backend and
-- is NOT used by this app. Run this ONCE in the SQL editor, then run
-- 001, 002 and 003 from supabase/migrations.
--
-- It deletes those five tables (and any rows in them) and their enum types,
-- and puts back Supabase's normal default privileges that the old script removed.
-- Do not run it if those tables hold data you need.
-- =====================================================================

drop table if exists public."Report"      cascade;
drop table if exists public."Appointment" cascade;
drop table if exists public."Medication"  cascade;
drop table if exists public."Patient"     cascade;
drop table if exists public."User"        cascade;

drop type if exists public."ReportType"        cascade;
drop type if exists public."AppointmentStatus" cascade;
drop type if exists public."PatientSource"     cascade;
drop type if exists public."PatientStatus"     cascade;
drop type if exists public."Role"              cascade;

alter default privileges for role postgres in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to anon, authenticated, service_role;

-- =====================================================================
-- DiabetesCare - starter configuration
-- Run AFTER 001 and 002. Safe to run more than once.
--
-- This file adds NO demo people, patients, medications or appointments:
-- everything in the app comes from what you enter in it.
-- The first administrator is created with:  npm run create-admin
-- =====================================================================

-- Defaults for the two switches on the admin Settings page
insert into public.system_settings (key, value) values
  ('email_notifications', true),
  ('automatic_backups',   true)
on conflict (key) do nothing;

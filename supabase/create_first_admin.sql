-- =====================================================================
-- DiabetesCare - CREATE THE FIRST ADMINISTRATOR
-- Run AFTER setup_database.sql (Supabase -> SQL Editor).
--
-- 1. Change the three values just below (name, email, password).
-- 2. Click Run. You will see "Administrator created: ..." in the results/notices.
-- 3. Log in on /login with that email and password.
--
-- Use a temporary password and change it right away in
-- Admin Panel -> Settings -> Change password (the SQL editor keeps a history of
-- the queries you run, so don't reuse a password you use anywhere else).
--
-- You can run this again with different values to add more administrators.
-- Doctors, nurses and front desk staff are added later from Admin Panel -> Staff.
-- =====================================================================

do $$
declare
  -- >>> EDIT THESE THREE VALUES <<<
  v_name     text := 'Clinic Administrator';
  v_email    text := 'admin@yourclinic.com';
  v_password text := 'ChangeMe-12345';
  -- >>> -------------------------- <<<

  v_id uuid := gen_random_uuid();
begin
  v_email := lower(trim(v_email));

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter a valid email address.';
  end if;

  if char_length(v_password) < 8 then
    raise exception 'The password must contain at least 8 characters.';
  end if;

  if char_length(trim(v_name)) < 2 then
    raise exception 'Please enter the administrator''s name.';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A login with the email % already exists.', v_email;
  end if;

  -- The login. The role comes from raw_app_meta_data, which the database trigger
  -- (handle_new_user) turns into the administrator profile.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'admin'),
    jsonb_build_object('full_name', trim(v_name)),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  -- Lets the email + password login work
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  if not exists (select 1 from public.profiles where id = v_id and role = 'admin' and active) then
    raise exception 'The login was created but no administrator profile was made. Run setup_database.sql first, then try again.';
  end if;

  raise notice 'Administrator created: %. You can log in now.', v_email;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- LIVE-VOLUME RETROFIT: demote the app off the superuser role, zero data loss.
--
-- Context: the app historically connected as `vault_user`, a SUPERUSER. Init
-- scripts do NOT run on an existing volume, so we apply this once by hand as the
-- superuser. It creates a DML-only `vault_app` role for the application and locks
-- down the public schema. `vault_user` REMAINS the admin/owner (used only for
-- migrations) — we do not demote it, so object ownership is untouched.
--
-- Run:  psql -U vault_user -d password_manager -v app_pw="'<APP_DB_PASSWORD>'" -f retrofit.sql
--       (the deploy script pipes the password in from the Docker secret file.)
-- ─────────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vault_app') THEN
    EXECUTE format(
      'CREATE ROLE vault_app LOGIN PASSWORD %s '
      'NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_pw');
  ELSE
    EXECUTE format(
      'ALTER ROLE vault_app LOGIN PASSWORD %s '
      'NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', :'app_pw');
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE password_manager FROM PUBLIC;
GRANT CONNECT ON DATABASE password_manager TO vault_app;
GRANT USAGE ON SCHEMA public TO vault_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vault_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vault_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vault_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO vault_app;

-- Proof: these must all be denied when reconnected as vault_app (see deploy checks).
--   CREATE ROLE x SUPERUSER;            -> denied
--   COPY (SELECT 1) TO PROGRAM 'id';    -> denied
--   CREATE TABLE evil(id int);          -> denied

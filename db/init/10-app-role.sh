#!/bin/sh
# Provision the least-privilege application role on a FRESH volume.
# (Init scripts run ONLY on first initialisation of an empty data dir. For an
#  already-initialised volume, apply db/retrofit.sql instead — see that file.)
#
# WHY: the app must NEVER connect as a superuser. A superuser can COPY ... TO
# PROGRAM (OS command execution) and CREATE ROLE ... SUPERUSER (persistent
# backdoor). vault_app is DML-only, so one SQL-injection/RCE can't take the host.
set -eu

APP_PW="$(cat "$APP_DB_PASSWORD_FILE")"

# APP_DB_USER and APP_PW are operator-controlled (hex) values, safe to interpolate.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_PW}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  ELSE
    ALTER ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_PW}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
\$\$;

-- Lock down the public schema, then grant the app exactly DML + sequence usage.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_DB_USER};
GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_DB_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${APP_DB_USER};
SQL

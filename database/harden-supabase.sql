-- Run AFTER db:seed in Supabase SQL Editor (schema lumina default).
-- Keep lumina OUT of Settings > API > Exposed schemas.
REVOKE ALL ON SCHEMA lumina FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA lumina FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA lumina FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA lumina REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='lumina' LOOP
    EXECUTE format('ALTER TABLE lumina.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  END LOOP;
END $$;
-- App uses custom sessions via Node/pg, not the Supabase anonymous REST API.
-- Least privilege runtime role: replace password BEFORE running these statements.
-- CREATE ROLE lumina_app LOGIN PASSWORD '<unique-strong-password>';
-- GRANT USAGE ON SCHEMA lumina TO lumina_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA lumina TO lumina_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA lumina TO lumina_app;
-- Runtime role is restricted by RLS. Add server-only policies for this role:
-- DO $$ DECLARE t record; BEGIN
--   FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='lumina' LOOP
--     EXECUTE format('CREATE POLICY server_only ON lumina.%I TO lumina_app USING (true) WITH CHECK (true)',t.tablename);
--   END LOOP;
-- END $$;
-- Use lumina_app.<project-ref> in Transaction Pooler DATABASE_URL on Vercel.
-- Keep migrations/admin initialization on the postgres connection, locally only.

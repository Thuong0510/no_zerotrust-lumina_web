-- Existing referenced media is authorized through its parent record.
CREATE TABLE uploaded_media (
  url text PRIMARY KEY CHECK (url ~ '^/api/media/[a-f0-9]{64}\.(png|jpg)$'),
  user_id integer NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX uploaded_media_owner ON uploaded_media(user_id);
REVOKE ALL ON uploaded_media FROM PUBLIC;
ALTER TABLE uploaded_media ENABLE ROW LEVEL SECURITY;
-- Existing deployments can apply this migration without granting broad privileges again.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lumina_app') THEN
    GRANT SELECT, INSERT ON uploaded_media TO lumina_app;
    CREATE POLICY server_only ON uploaded_media TO lumina_app USING (true) WITH CHECK (true);
  END IF;
END $$;

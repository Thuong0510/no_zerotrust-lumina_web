// Run locally with the admin DATABASE_URL after db:seed; never run on each request.
import {pool,transaction,all,run} from '../src/models/database.js';
import {config} from '../src/config/runtime.js';
const role='lumina_app';
try {
  await transaction(async()=> {
    if(!await all('SELECT 1 FROM pg_roles WHERE rolname=?',role).then(r=>r.length)) {
      const password=process.env.INIT_RUNTIME_PASSWORD || '';
      if(password.length<16 || password.startsWith('REPLACE_'))throw new Error('Set INIT_RUNTIME_PASSWORD (16+ characters) locally.');
      await run(`CREATE ROLE ${role} LOGIN PASSWORD '${password.replace(/'/g,"''")}'`);
    }
    await run(`GRANT USAGE ON SCHEMA "${config.schema}" TO ${role}`);
    await run(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "${config.schema}" TO ${role}`);
    await run(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${config.schema}" TO ${role}`);
    await run(`REVOKE INSERT, UPDATE, DELETE ON "${config.schema}".schema_migrations FROM ${role}`);
    await run(`REVOKE UPDATE, DELETE ON "${config.schema}".activity_logs FROM ${role}`);
    const untrusted=await all("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
    for(const roleName of ['PUBLIC',...untrusted.map(r=>r.rolname)]) {
      await run(`REVOKE ALL ON SCHEMA "${config.schema}" FROM ${roleName}`);
      await run(`REVOKE ALL ON ALL TABLES IN SCHEMA "${config.schema}" FROM ${roleName}`);
      await run(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA "${config.schema}" FROM ${roleName}`);
      await run(`ALTER DEFAULT PRIVILEGES IN SCHEMA "${config.schema}" REVOKE ALL ON TABLES FROM ${roleName}`);
    }
    const tables=await all('SELECT tablename FROM pg_tables WHERE schemaname=?',config.schema);
    for(const {tablename:table} of tables) {
      if(!/^[a-z_]+$/.test(table))throw new Error('Unexpected table');
      const target=`"${config.schema}"."${table}"`;
      await run(`ALTER TABLE ${target} ENABLE ROW LEVEL SECURITY`);
      await run(`DROP POLICY IF EXISTS server_only ON ${target}`);
      await run(`CREATE POLICY server_only ON ${target} TO ${role} USING (true) WITH CHECK (true)`);
    }
  },true);
  console.log('Runtime role ready. Set Vercel DATABASE_URL username to lumina_app.<project-ref> and use its password.');
} catch(error:any) {console.error('Runtime role setup failed',{name:error.name,code:error.code});process.exitCode=1;}
finally {await pool.end();}


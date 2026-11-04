// Fresh PostgreSQL (WASM) per mode; never reads .env or a hosted database.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const mode=process.argv[2];
if(!mode) {
  for(const test of ['integration','checkout','accounts','security','owasp','owasp-registration','production','role']) {
    const code=await new Promise<number>(resolve=>{const child=spawn(process.execPath,['--import','tsx','tests/embedded.ts',test],{stdio:'inherit',env:process.env});child.on('exit',code=>resolve(code || 0));child.on('error',()=>resolve(1));});
    if(code){process.exitCode=code;break;}
  }
} else {
  process.env.DOTENV_CONFIG_PATH='.lumina-test-env-'+process.pid;
  process.env.DATABASE_SSL='false';process.env.SUPABASE_URL='';process.env.SUPABASE_STORAGE_KEY='';process.env.SMTP_HOST='';process.env.NODE_ENV='test';process.env.DEMO_MODE='false';
  delete process.env.VERCEL_ENV;
  const db=await PGlite.create();
  const socket=new PGLiteSocketServer({db,port:Number(process.env.TEST_PG_PORT || 55432),host:'127.0.0.1',maxConnections:10});
  await socket.start();
  process.env.TEST_DATABASE_URL=`postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_PG_PORT || 55432}/lumina_test`;
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  try {
    if(mode==='integration') await import('./integration');
    else if(mode==='checkout') await import('./checkout');
    else if(mode==='accounts') await import('./accounts');
    else if(mode==='security') await import('./security');
    else if(mode==='owasp') await import('./owasp-verification');
    else if(mode==='owasp-registration') await import('./owasp-registration');
    else if(mode==='production') {
      process.env.NODE_ENV='production';process.env.DATABASE_SSL='true';process.env.APP_ORIGIN='https://lumina.test';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_STORAGE_KEY='unused-test';
      const {pool}=await import('../backend/src/models/database');
      // PGlite's local TCP transport does not implement TLS; live TLS is a separate deployment check.
      pool.options.ssl=false;
      await import('./production');
    } else if(mode==='role') {
      process.env.INIT_ADMIN_PASSWORD='Admin-Test!'+Date.now();process.env.INIT_ADMIN_EMAIL='owner@lumina.test';process.env.INIT_RUNTIME_PASSWORD='Runtime-Test!'+Date.now();
      const {migrate}=await import('../backend/src/models/migrate');const {initialize}=await import('../backend/src/services/initializeService');
      await migrate();await initialize();await import('../backend/scripts/runtime-role');
      await db.exec('SET ROLE lumina_app');
      assert.equal((await db.query<{n:number}>('SELECT COUNT(*) n FROM lumina.users')).rows[0].n,1);
      await db.exec("INSERT INTO lumina.categories(name,description) VALUES('Role test','allowed')");
      await assert.rejects(()=>db.exec('DROP TABLE lumina.categories'),/owner|permission/);
      await assert.rejects(()=>db.exec('DELETE FROM lumina.activity_logs'),/permission/);
      await assert.rejects(()=>db.exec('DELETE FROM lumina.schema_migrations'),/permission/);
      await db.exec('RESET ROLE');assert.ok((await db.query("SELECT rowsecurity FROM pg_tables WHERE schemaname='lumina'")).rows.every((r:any)=>r.rowsecurity));
      assert.equal((await db.query("SELECT rolsuper OR rolbypassrls AS elevated FROM pg_roles WHERE rolname='lumina_app'")).rows[0].elevated,false);
      console.log(JSON.stringify({passed:7,assertions:'Runtime role read/write, no DROP, no audit/migration DELETE, RLS enabled, no superuser/bypass'}));
    } else throw new Error('Unknown test mode');
  } finally {await socket.stop();await new Promise(r=>setTimeout(r,200));await db.close();}
}

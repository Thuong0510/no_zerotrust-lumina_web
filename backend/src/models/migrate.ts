import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pool, transaction, all, run } from './database.js';
import { pathToFileURL } from 'node:url';
export async function migrate() {
  const {config} = await import('../config/runtime.js');
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "${config.schema}"`);
  await transaction(async()=> {
    await run('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for(const name of (await readdir('database/migrations')).filter(n=>n.endsWith('.sql')).sort()) {
      const sql=await readFile('database/migrations/'+name,'utf8');
      const hash=createHash('sha256').update(sql).digest('hex');
      const previous=(await all('SELECT checksum FROM schema_migrations WHERE name=?',name))[0];
      if(previous) {if(previous.checksum!==hash)throw new Error('Applied migration was edited: '+name);continue;}
      await run(sql);
      await run('INSERT INTO schema_migrations(name,checksum) VALUES(?,?)',name,hash);
      console.log('Applied migration',name);
    }
  },true);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  migrate().then(()=>pool.end()).catch(async error=>{console.error('Migration failed',error.message);await pool.end();process.exitCode=1;});
}


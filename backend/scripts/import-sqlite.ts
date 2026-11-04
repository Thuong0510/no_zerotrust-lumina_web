// Optional one-way import from an existing local D1/SQLite application database.
import { DatabaseSync } from 'node:sqlite';
import { pool, transaction, all, run } from '../src/models/database.js';
import { migrate } from '../src/models/migrate.js';
const filename=process.argv[2];
if(!filename)throw new Error('Usage: npm run db:import -- /path/to/application.sqlite');
const sqlite=new DatabaseSync(filename,{readOnly:true});
const order=['roles','permissions','categories','suppliers','employees','customers','users','user_roles','role_permissions','products','product_variants','inventory','orders','order_items','inventory_transactions','notifications','notification_reads','activity_logs','settings'];
try {
  await migrate();
  await transaction(async()=> {
    for(const table of order)if((await all(`SELECT COUNT(*) n FROM ${table}`))[0].n>0)throw new Error('Destination must be empty before import: '+table);
    const tables=new Set(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r:any)=>r.name));
    if(!tables.has('users') || !tables.has('products') || !tables.has('settings'))throw new Error('This is not the LUMINA SQLite database. Choose the application .sqlite file.');
    for(const table of order) {
      if(!tables.has(table))continue;
      const destination=new Set((await all("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=?",table)).map(r=>r.column_name));
      const columns=(sqlite.prepare(`PRAGMA table_info(${table})`).all() as any[]).map(r=>r.name).filter(c=>destination.has(c));
      if(columns.some(c=>!/^[a-z_]+$/.test(c)))throw new Error('Unexpected column name');
      const rows=sqlite.prepare(`SELECT ${columns.map(c=>'"'+c+'"').join(',')} FROM ${table}`).all();
      for(const row of rows)await run(`INSERT INTO ${table}(${columns.map(c=>'"'+c+'"').join(',')}) VALUES(${columns.map(()=>'?').join(',')})`,...columns.map(c=>row[c]));
      console.log('Imported',table,rows.length);
    }
    await run("INSERT INTO settings(key,value) VALUES('seeded','1') ON CONFLICT(key) DO UPDATE SET value='1'");
    const identities=await all("SELECT table_name FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='id' AND is_identity='YES'");
    for(const {table_name:t} of identities) {
      if(!/^[a-z_]+$/.test(t))throw new Error('Invalid identifier');
      await run(`SELECT setval(pg_get_serial_sequence('${t}','id'),COALESCE((SELECT MAX(id) FROM ${t}),1),EXISTS(SELECT 1 FROM ${t}))`);
    }
  },true);
  console.log('Import complete. Sessions/reset tokens were intentionally not imported. Copy uploads separately.');
} catch(e:any) {console.error('Import failed:',e.message);process.exitCode=1;}
finally {sqlite.close();await pool.end();}


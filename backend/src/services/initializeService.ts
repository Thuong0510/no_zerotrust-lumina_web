import { pathToFileURL } from 'node:url';
import { transaction, run, one, all, pool } from '../models/database.js';
import { ensureSeed, permissionNames, defaults } from './demoSeedService.js';
import { hashPassword } from '../middleware/security.js';
import { config } from '../config/runtime.js';
import { migrate } from '../models/migrate.js';
import { z } from 'zod';
export async function initialize() {
  await transaction(async()=> {
    if(config.demo) {
      if((process.env.DEMO_PASSWORD || '').length<8 || process.env.DEMO_PASSWORD?.startsWith('REPLACE_'))throw new Error('DEMO_PASSWORD must have at least 8 characters.');
      await ensureSeed();
    } else if(!(await one('SELECT id FROM users LIMIT 1'))) {
      const password=process.env.INIT_ADMIN_PASSWORD || '';
      if(password.length<12 || password.startsWith('REPLACE_'))throw new Error('Set INIT_ADMIN_PASSWORD (12+ characters) for first production start.');
      const email=z.string().email().parse(process.env.INIT_ADMIN_EMAIL || 'admin@lumina.vn').toLowerCase();
      for(const [i,role] of ['Admin','Employee','Guest'].entries())await run('INSERT INTO roles(id,name) VALUES(?,?) ON CONFLICT DO NOTHING',i+1,role);
      for(const [i,name] of permissionNames.entries())await run('INSERT INTO permissions(id,name) VALUES(?,?) ON CONFLICT DO NOTHING',i+1,name);
      for(const [role,permissions] of Object.entries(defaults))for(const name of permissions)await run('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?) ON CONFLICT DO NOTHING',['Admin','Employee','Guest'].indexOf(role)+1,permissionNames.indexOf(name)+1);
      const user=await run("INSERT INTO users(name,username,email,password_hash,status) VALUES('Administrator','admin',?,?,'Active')",email,await hashPassword(password));
      await run('INSERT INTO user_roles(user_id,role_id) VALUES(?,1)',user.meta.last_row_id);
      await run("INSERT INTO settings(key,value) VALUES('seeded','1') ON CONFLICT DO NOTHING");
      console.log('Created initial admin; no demo records inserted.');
    }
    const tables=await all("SELECT table_name FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='id' AND is_identity='YES'");
    for(const {table_name:t} of tables) {
      if(!/^[a-z_]+$/.test(t))throw new Error('Invalid table identifier');
      await run(`SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT MAX(id) FROM ${t}),1), EXISTS(SELECT 1 FROM ${t}))`);
    }
  },true);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  migrate().then(initialize).then(()=>pool.end()).catch(async error=>{console.error('Initialization failed',error.message);await pool.end();process.exitCode=1;});
}


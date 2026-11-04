import { Pool, types, type PoolClient } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { config } from '../config/runtime.js';
import { apiPath } from '../config/apiPath.js';
// Counts, monetary values and epoch milliseconds fit the application's limits.
types.setTypeParser(20, Number);
types.setTypeParser(1700, Number);
const ssl = process.env.DATABASE_SSL === 'true'
  ? {rejectUnauthorized:true, ...(process.env.DATABASE_CA_PEM ? {ca:process.env.DATABASE_CA_PEM.replace(/\\n/g,'\n')} : {}), ...(process.env.DATABASE_CA_FILE ? {ca:readFileSync(process.env.DATABASE_CA_FILE,'utf8')} : {})}
  : undefined;
const connectionUrl=new URL(config.databaseUrl);
for(const key of ['sslmode','ssl','sslrootcert','sslcert','sslkey'])connectionUrl.searchParams.delete(key);
export const pool = new Pool({connectionString:connectionUrl.href,ssl,max:Number(process.env.DATABASE_POOL_MAX || 2),connectionTimeoutMillis:10000,idleTimeoutMillis:10000,allowExitOnIdle:true});
pool.on('error', error => console.error('PostgreSQL pool error', {code:(error as any).code}));
const context = new AsyncLocalStorage<PoolClient>();
type Statement = {sql:string,args:any[]};
const idTables = new Set(['activity_logs','categories','customers','employees','inventory','inventory_transactions','notifications','order_items','orders','product_variants','products','suppliers','users']);
// Parameter conversion is quote-aware; data always remains bound parameters.
function postgresSql(sql:string) {
  let output='',quoted=false,index=0;
  for(let i=0;i<sql.length;i++) {
    const c=sql[i];
    if(c==="'") { output+=c; if(quoted && sql[i+1]==="'") {output+=sql[++i];continue;} quoted=!quoted; }
    else output+=c==='?' && !quoted ? '$'+(++index) : c;
  }
  if(/^INSERT OR IGNORE INTO/i.test(output)) output=output.replace(/^INSERT OR IGNORE INTO/i,'INSERT INTO')+' ON CONFLICT DO NOTHING';
  return output;
}
async function execute(s:Statement, returning=false) {
  let sql=postgresSql(s.sql);
  const table=sql.match(/^INSERT INTO\s+([a-z_]+)/i)?.[1];
  if(returning && table && idTables.has(table) && !/\bRETURNING\b/i.test(sql))sql+=' RETURNING id';
  if (!context.getStore()) return transaction(() => execute(s, returning));
  const raw=await context.getStore()!.query(sql,s.args).catch(error=> {
    if(process.env.NODE_ENV==='test')console.error('Test SQL error:',error.message,'SQL:',sql);
    throw error;
  });
  const result=Array.isArray(raw) ? raw[raw.length-1] : raw;
  return {results:result.rows,meta:{changes:result.rowCount || 0,last_row_id:result.rows[0]?.id}};
}
export const stmt=(sql:string,...args:any[]):Statement=>({sql,args});
export const one=async(sql:string,...args:any[]) => (await execute(stmt(sql,...args))).results[0] || null;
export const all=async(sql:string,...args:any[]) => (await execute(stmt(sql,...args))).results;
export const run=(sql:string,...args:any[]) => execute(stmt(sql,...args),true);
export async function transaction<T>(fn:()=>Promise<T>, lock=false):Promise<T> {
  if(context.getStore())return fn();
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO "${config.schema}"`);
    await client.query("SET LOCAL statement_timeout = '15s'");
    if(lock)await client.query('SELECT pg_advisory_xact_lock(728341901)');
    const result=await context.run(client,fn);
    await client.query('COMMIT');return result;
  } catch(error) {await client.query('ROLLBACK');throw error;}
  finally {client.release();}
}
async function batch(statements:Statement[]) {
  return transaction(async()=> {
    const client=context.getStore()!;
    await client.query('SAVEPOINT lumina_batch');
    try {
      const results=[];
      for(const s of statements)results.push(await execute(s,true));
      await client.query('RELEASE SAVEPOINT lumina_batch');return results;
    } catch(error) {await client.query('ROLLBACK TO SAVEPOINT lumina_batch');await client.query('RELEASE SAVEPOINT lumina_batch');throw error;}
  });
}
export const db=()=>({batch});
// Roll back failed mutations. Failed login attempts deliberately persist throttle counters.
export async function requestTransaction(req:Request, fn:()=>Promise<Response>) {
  const path = apiPath(new URL(req.url).pathname);
  if (!path) return new Response(JSON.stringify({error:'Page Not Found'}),{status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  // Throttle first: its transaction commits even if input validation rejects the action.
  const action = req.method==='PUT' && path[0]==='profile' ? 'profile' : req.method === 'POST' ? new URL(req.url).pathname.match(/^\/api\/(?:auth\/)?(login|register|forgot|reset|change-password|upload)$/)?.[1] : undefined;
  if(action) {
    const { throttle, ip, AppError } = await import('../middleware/security.js');
    try { await throttle((action === 'login' ? 'login-ip' : action) + ':' + ip(req), ['upload','profile'].includes(action) ? 30 : ['login','change-password'].includes(action) ? 15 : 8); }
    catch(error) { if(error instanceof AppError) return new Response(JSON.stringify({error:error.message}),{status:error.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); throw error; }
  }

  try {
    return await transaction(async()=> {
      const response=await fn();
      if(response.status>=400 && !(path[0]==='auth' && path[1]==='login' && [401,403,429].includes(response.status)))throw response;
      return response;
    },!['GET','HEAD'].includes(req.method));
  } catch(error) {if(error instanceof Response)return error;throw error;}
}


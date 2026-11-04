process.env.DOTENV_CONFIG_PATH='.lumina-test-env-'+process.pid;
import assert from 'node:assert/strict';
if(!process.env.TEST_DATABASE_URL || !/^lumina_test(?:_[a-z0-9]+)?$/.test(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1)))throw new Error('Use a fresh disposable lumina_test database.');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
process.env.NODE_ENV='production';process.env.DATABASE_SSL='true';process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_STORAGE_KEY='test-only-unused';process.env.DEMO_MODE='false';process.env.APP_ORIGIN='https://lumina.test';
process.env.INIT_ADMIN_PASSWORD='InitialAdmin!'+Date.now();process.env.INIT_ADMIN_EMAIL='owner@lumina.test';
delete process.env.SMTP_HOST;
const {pool,one,requestTransaction}=await import('../backend/src/models/database');
const {migrate}=await import('../backend/src/models/migrate');const {initialize}=await import('../backend/src/services/initializeService');
const {dispatch}=await import('../backend/src/app');
try {
  if((await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount)throw new Error('Database must be empty.');
  await migrate();await initialize();await initialize();
  assert.equal((await one('SELECT COUNT(*) n FROM users')).n,1);
  assert.equal((await one('SELECT COUNT(*) n FROM products')).n,0);
  const call=async(path:string,body?:any,cookie?:string)=>{const req=new Request('https://lumina.test/api/'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:'https://lumina.test',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return dispatch(req,'production-test');};
  const boot=await call('bootstrap');assert.equal(boot.status,200);assert.equal((await boot.json()).demo,false);
  const login=await call('auth/login',{login:'admin',password:process.env.INIT_ADMIN_PASSWORD});assert.equal(login.status,200);assert.ok(login.headers.get('set-cookie')!.includes('Secure'));assert.ok(login.headers.get('set-cookie')!.includes('HttpOnly'));
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const session=await call('bootstrap',undefined,cookie);assert.equal(session.status,200);assert.equal((await session.json()).user.role,'Admin');
  assert.equal((await call('products',undefined,cookie)).status,200);
  assert.equal((await call('users',undefined,cookie)).status,200);
  assert.equal((await call('users')).status,401);
  const forgot=await call('auth/forgot',{email:'owner@lumina.test'});assert.equal(forgot.status,200);assert.equal((await forgot.json()).resetUrl,undefined);
  console.log(JSON.stringify({passed:15,mode:'production',assertions:'Admin-only initialization, idempotent startup, no demo records, Secure cookie, no reset token disclosure, authenticated management through production dispatcher'}));
} finally {await pool.end();}

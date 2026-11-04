// Runs only in the disposable PGlite harness, without .env/cloud services.
import assert from 'node:assert/strict';
import sharp from 'sharp';
if (!process.env.TEST_DATABASE_URL || !/^lumina_test(?:_[a-z0-9]+)?$/.test(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1))) throw new Error('Disposable test database required');
process.env.DEMO_MODE='true';
process.env.DEMO_PASSWORD='Security-Test!'+Date.now();
process.env.UPLOADS_DIR='./.test-uploads';
const {pool,one,run,requestTransaction}=await import('../backend/src/models/database');
const {migrate}=await import('../backend/src/models/migrate');
const {initialize}=await import('../backend/src/services/initializeService');
const {dispatch}=await import('../backend/src/app');
const {digest,random}=await import('../backend/src/middleware/security');
let passed=0, sequence=0;
type Session={cookie:string;csrf:string;user:any};
const password=process.env.DEMO_PASSWORD;
async function call(path:string,method='GET',body?:unknown,session?:Session,status=200,ip?:string,extra:Record<string,string>={}) {
  const response=await dispatch(new Request('https://lumina.test/api/'+path,{
    method,headers:{'Content-Type':'application/json',...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...extra},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  }),ip || 'test-'+(++sequence));
  assert.equal(response.status,status,path+': '+await response.clone().text());
  assert.ok(response.headers.get('X-Request-ID'));
  assert.equal(response.headers.get('X-Frame-Options'),'DENY');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  passed++;
  return response;
}
async function login(name:string):Promise<Session> {
  const response=await call('auth/login','POST',{login:name,password});
  const cookie=response.headers.get('Set-Cookie')!.split(';')[0];
  const user=(await (await call('bootstrap','GET',undefined,{cookie,csrf:'',user:null})).json()).user;
  return {cookie,csrf:user.csrf,user};
}
try {
  await migrate();await initialize();
  const admin=await login('admin'), employee=await login('employee01'), guest=await login('guest01'), other=await login('guest02');
  await call('auth/login','POST',{login:"' OR 1=1 --",password},undefined,401);
  const injection="'; DROP TABLE users; -- <img src=x onerror=alert(1)>";
  const category=await (await call('categories','POST',{name:injection,description:'Bound parameter test'},admin)).json();
  const stored=await (await call('categories/'+category.id,'GET',undefined,admin)).json();
  assert.equal(stored.name,injection);assert.ok(await one('SELECT 1 FROM users LIMIT 1'));passed++;
  // Previously accepted aliases skipped the exact-path persistent rate limiter.
  for (const path of ['auth//login','/auth/login','auth/login/','auth/login/extra'])
    await call(path,'POST',{login:'admin',password},undefined,404,'alias-ip');
  for(let i=0;i<15;i++)await call('auth/login','POST',{login:'no-such-user',password:'wrong'},undefined,401,'limited-ip');
  await call('auth/login','POST',{login:'admin',password},undefined,429,'limited-ip');
  await call('auth/login/extra','POST',{login:'admin',password},undefined,404,'limited-ip');
  const dashboard=await (await call('dashboard','GET',undefined,employee)).json();
  assert.equal(dashboard.limited,true);assert.equal(dashboard.counts.revenue,undefined);assert.equal(dashboard.counts.employees,undefined);assert.equal(dashboard.monthly,undefined);passed++;
  // New uploads can be previewed by their owner, but cannot be read/claimed by another account.
  const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  const form=new FormData();form.append('file',new File([png],'private.png',{type:'image/png'}));
  const upload=await dispatch(new Request('https://lumina.test/api/upload',{method:'POST',headers:{Cookie:guest.cookie,'X-CSRF-Token':guest.csrf},body:form}),'upload-ip');
  assert.equal(upload.status,200);passed++;
  const media=(await upload.json()).url;
  await call(media.slice(5),'GET',undefined,guest);
  await call(media.slice(5),'GET',undefined,other,404);
  await call('profile','PUT',{name:other.user.name,email:other.user.email,phone:other.user.phone,avatar:media},other,404);
  await call('profile','PUT',{name:guest.user.name,email:guest.user.email,phone:guest.user.phone,avatar:media},guest);
  await call(media.slice(5),'GET',undefined,other,404);
  await call(media.slice(5),'GET',undefined,admin);
  // Legacy referenced product images follow the product's visibility.
  const key=random()+'.png', url='/api/media/'+key;
  const {env}=await import('../backend/src/config/runtime');
  await env.BUCKET.put('uploads/'+key,new Uint8Array(png));
  await run("UPDATE products SET image=?,status='Active' WHERE id=1",url);
  await call('media/'+key,'GET',undefined,other);
  await run("UPDATE products SET status='Draft' WHERE id=1");
  await call('media/'+key,'GET',undefined,other,404);
  await call('media/'+key,'GET',undefined,employee);
  const forgotten=await (await call('auth/forgot','POST',{email:other.user.email})).json();
  const token=new URL(forgotten.resetUrl,'https://lumina.test').searchParams.get('reset')!;
  await call('auth/change-password','POST',{old_password:password,password:'NewPassword!123',confirm:'NewPassword!123'},other);
  await call('auth/reset','POST',{token,password:'StolenPassword!123',confirm:'StolenPassword!123'},undefined,400);
  // Admin account edits also invalidate any outstanding recovery token.
  const resetToken='b'.repeat(64);
  await run('INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)',await digest(resetToken),other.user.id,Date.now()+900000);
  await call('users/'+other.user.id,'PUT',{name:other.user.name,username:other.user.username,email:other.user.email,phone:other.user.phone,employee_id:null,status:'Active',role:'Guest',password:'AdminChanged!123'},admin);
  await call('auth/reset','POST',{token:resetToken,password:'StolenPassword!123',confirm:'StolenPassword!123'},undefined,400);
  const first=await (await call('auth/forgot','POST',{email:guest.user.email})).json();
  await call('auth/forgot','POST',{email:guest.user.email});
  await call('auth/reset','POST',{token:new URL(first.resetUrl,'https://lumina.test').searchParams.get('reset'),password:'NewPassword!123',confirm:'NewPassword!123'},undefined,400);
  await call('products','POST',null,admin,422);
  const malformed=await dispatch(new Request('https://lumina.test/api/upload',{method:'POST',headers:{Cookie:guest.cookie,'X-CSRF-Token':guest.csrf,'Content-Type':'multipart/form-data; boundary=invalid'},body:'invalid'}),'multipart-ip');
  assert.equal(malformed.status,400);passed++;
  // Login's exception must persist expected failure counters, never partial work after a 500.
  await requestTransaction(new Request('https://lumina.test/api/auth/login',{method:'POST'}),async()=>{
    await run("INSERT INTO categories(name) VALUES('MUST_ROLL_BACK')");
    return new Response('{}',{status:500});
  });
  assert.equal(await one("SELECT 1 FROM categories WHERE name='MUST_ROLL_BACK'"),null);passed++;
  assert.ok(await one("SELECT 1 FROM activity_logs WHERE action='UPLOAD_IMAGE' AND user_id=?",guest.user.id));passed++;
  await call('bootstrap','GET',undefined,undefined,403,undefined,{'Sec-Fetch-Site':'cross-site'});
  console.log(JSON.stringify({passed,suite:'OWASP security regression',assertions:'Canonical routing/rate limits, private media ownership, dashboard RBAC, reset revocation, malformed input, rollback and response headers'}));
} finally {await pool.end();}

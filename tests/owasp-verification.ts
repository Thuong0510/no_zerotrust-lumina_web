import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import nodemailer from 'nodemailer';
if(!process.env.TEST_DATABASE_URL || !/^lumina_test(?:_[a-z0-9]+)?$/.test(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1)))throw new Error('Disposable test DB required');
process.env.DEMO_MODE='true';process.env.DEMO_PASSWORD='Owasp-Test!'+Date.now();
process.env.APP_ORIGIN='http://127.0.0.1:3000';
const before=process.env.TEST_OWASP_PHASE==='before';
const {pool,run,one}=await import('../backend/src/models/database');
const {migrate}=await import('../backend/src/models/migrate');
const {initialize}=await import('../backend/src/services/initializeService');
const {dispatch}=await import('../backend/src/app');
const {digest,random}=await import('../backend/src/middleware/security');
const {env}=await import('../backend/src/config/runtime');
const {createAppServer}=await import('../backend/src/server');
type Session={cookie:string;csrf:string;user:any};
const checks:any[]=[];let sequence=0;
async function call(route:string,method='GET',body?:unknown,s?:Session) {
  return dispatch(new Request('https://lumina.test/api/'+route,{method,headers:{'Content-Type':'application/json',...(s?{Cookie:s.cookie,'X-CSRF-Token':s.csrf}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),'owasp-'+(++sequence));
}
function evidence(id:string,description:string,expected:unknown,actual:unknown,details?:unknown) {
  const pass=JSON.stringify(actual)===JSON.stringify(expected);
  checks.push({id,description,expected,actual,pass,...(details?{details}:{})});
  console.log(JSON.stringify(checks.at(-1)));
}
async function login(name:string):Promise<Session> {
  const response=await call('auth/login','POST',{login:name,password:process.env.DEMO_PASSWORD});assert.equal(response.status,200);
  const cookie=response.headers.get('Set-Cookie')!.split(';')[0];
  const user=(await(await call('bootstrap','GET',undefined,{cookie,csrf:'',user:null})).json()).user;
  return {cookie,csrf:user.csrf,user};
}
let server:ReturnType<typeof createAppServer>|undefined;
try {
  await migrate();await initialize();
  const account=await login('guest01'),otherSession=await login('guest01');
  const profile={name:account.user.name,email:'changed@lumina.test',phone:account.user.phone};
  const noPassword=await call('profile','PUT',profile,account);
  evidence('EMAIL-01','Change recovery email without current password',403,noPassword.status);
  await run('UPDATE users SET email=? WHERE id=?',account.user.email,account.user.id);
  const wrongPassword=await call('profile','PUT',{...profile,current_password:'WrongPassword!'},account);
  evidence('EMAIL-02','Wrong password cannot authorize recovery email change',403,wrongPassword.status);
  const token=random();
  await run('INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)',await digest(token),account.user.id,Date.now()+900000);
  const changed=await call('profile','PUT',{...profile,...(before?{}:{current_password:process.env.DEMO_PASSWORD})},account);
  evidence('EMAIL-03','Legitimate recovery email change succeeds',200,changed.status);
  evidence('EMAIL-04','Recovery email change revokes other sessions',401,(await call('profile','GET',undefined,otherSession)).status);
  const reset=await call('auth/reset','POST',{token,password:'Reset-Test!123',confirm:'Reset-Test!123'});
  evidence('EMAIL-05','Recovery token from former email is invalidated',400,reset.status);
  const smtpUser=await one("SELECT id,email FROM users WHERE username='guest02'");
  const originalTransport=nodemailer.createTransport;
  env.DEMO_MODE='false';process.env.SMTP_HOST='smtp.test.invalid';process.env.SMTP_FROM='test@lumina.test';
  (nodemailer as any).createTransport=()=>({sendMail:async()=>{throw new Error('MOCK_SMTP_UNAVAILABLE');}});
  try {
    const known=await call('auth/forgot','POST',{email:smtpUser.email});
    const unknown=await call('auth/forgot','POST',{email:'absent@lumina.test'});
    const knownBody=await known.json(),unknownBody=await unknown.json();
    evidence('SMTP-01','SMTP failure returns same status for existing/missing account',[200,200],[known.status,unknown.status]);
    evidence('SMTP-02','SMTP failure does not disclose account through response body',true,JSON.stringify(knownBody)===JSON.stringify(unknownBody));
  } finally {nodemailer.createTransport=originalTransport;env.DEMO_MODE='true';process.env.SMTP_HOST='';}
  server=createAppServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();assert.ok(address&&typeof address!=='string');
  const malformed=await fetch(`http://127.0.0.1:${address.port}/%E0%A4%A`);
  evidence('URL-01','Malformed URL encoding is a client error, not server failure',400,malformed.status);
  evidence('URL-02','Malformed URL error is not cacheable','no-store',malformed.headers.get('Cache-Control'));
  const missingCsrf=await call('profile','PUT',{name:'Blocked',email:smtpUser.email,phone:''},{...account,csrf:'invalid'});
  // Account may have been invalidated by the reset in the vulnerable baseline.
  evidence('CSRF-01','Invalid/stale session or CSRF never allows write',true,[401,403].includes(missingCsrf.status));
} finally {
  if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
  await pool.end();
  const result={phase:before?'before':'after',timestamp:new Date().toISOString(),environment:'Disposable PGlite; mock SMTP; ephemeral loopback HTTP; no .env/cloud',checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length};
  const directory=process.env.OWASP_EVIDENCE_DIR;
  if(directory){await mkdir(directory,{recursive:true});await writeFile(`${directory}/${result.phase}-observations.json`,JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({suite:'OWASP verification',passed:result.passed,failed:result.failed}));
  if(result.failed)process.exitCode=1;
}

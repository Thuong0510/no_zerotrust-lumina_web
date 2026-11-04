import {mkdir,writeFile} from 'node:fs/promises';
if(!process.env.TEST_DATABASE_URL || !/^lumina_test(?:_[a-z0-9]+)?$/.test(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1)))throw new Error('Disposable test DB required');
process.env.DEMO_MODE='true';process.env.DEMO_PASSWORD='Registration-Test!'+Date.now();
const {pool,one}=await import('../backend/src/models/database');
const {migrate}=await import('../backend/src/models/migrate');
const {initialize}=await import('../backend/src/services/initializeService');
const {dispatch}=await import('../backend/src/app');
const checks:any[]=[];
function evidence(id:string,expected:unknown,actual:unknown){checks.push({id,expected,actual,pass:JSON.stringify(expected)===JSON.stringify(actual)});console.log(JSON.stringify(checks.at(-1)));}
try {
  await migrate();await initialize();
  const existing=await one("SELECT email FROM users WHERE username='guest02'");
  const call=(username:string,email:string)=>dispatch(new Request('https://lumina.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Registration Test',username,email,phone:'0901234567',password:'Register-Test!123',confirm:'Register-Test!123',terms:true})}),'register-'+username);
  const known=await call('anotherguest',existing.email),unknown=await call('brandnewguest','new-registration@lumina.test');
  evidence('REGISTER-01',[200,200],[known.status,unknown.status]);
  evidence('REGISTER-02',true,JSON.stringify(await known.json())===JSON.stringify(await unknown.json()));
  const created=await one("SELECT u.status,r.name role FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.username='brandnewguest'");
  evidence('REGISTER-03',{status:'Pending',role:'Guest'},created);
} finally {
  await pool.end();
  const result={phase:process.env.TEST_OWASP_PHASE==='before'?'before':'after',timestamp:new Date().toISOString(),environment:'Disposable PGlite; no .env/cloud',checks,passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length};
  if(process.env.OWASP_EVIDENCE_DIR){await mkdir(process.env.OWASP_EVIDENCE_DIR,{recursive:true});await writeFile(`${process.env.OWASP_EVIDENCE_DIR}/${result.phase}-registration-observations.json`,JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({suite:'OWASP registration verification',passed:result.passed,failed:result.failed}));
  if(result.failed)process.exitCode=1;
}

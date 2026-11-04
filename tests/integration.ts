process.env.DATABASE_SSL=process.env.TEST_DATABASE_SSL || 'false';
process.env.SUPABASE_URL='';process.env.SUPABASE_STORAGE_KEY='';
process.env.DOTENV_CONFIG_PATH='.lumina-test-env-'+process.pid;
// Run only against a disposable test database. Never use your deployed database URL.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
if(!process.env.TEST_DATABASE_URL)throw new Error('Set TEST_DATABASE_URL for a disposable database named lumina_test.');
const dbName=new URL(process.env.TEST_DATABASE_URL).pathname.slice(1);
if(!/^lumina_test(?:_[a-z0-9]+)?$/.test(dbName))throw new Error('Tests require a database named lumina_test or lumina_test_<suffix>.');
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
process.env.NODE_ENV='test';process.env.APP_ORIGIN='http://127.0.0.1:3199';process.env.PORT='3199';
process.env.DEMO_MODE='true';process.env.DEMO_PASSWORD='Test-Only!'+Date.now();
process.env.UPLOADS_DIR='./.test-uploads';
const {pool,requestTransaction}=await import('../backend/src/models/database');
const {migrate}=await import('../backend/src/models/migrate');
const {initialize}=await import('../backend/src/services/initializeService');
const {handle}=await import('../backend/src/routes/apiRoutes');
const {createAppServer}=await import('../backend/src/server');
const existing=await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
if(existing.rowCount)throw new Error('Test database must be empty; create a fresh database.');
await migrate();await initialize();await initialize();
const server=createAppServer();server.listen(3199,'127.0.0.1');await once(server,'listening');
let count=0;
const password=process.env.DEMO_PASSWORD;
const mf={async dispatchFetch(url:string,options:any={}) {
  if(!new URL(url).pathname.startsWith('/api/'))return fetch('http://127.0.0.1:3199'+new URL(url).pathname,options);
  const request=new Request(url,options);
  return requestTransaction(request,()=>handle(request));
}};
try {
let clientIp=1;
async function call(path,method='GET',body,session,expected=200,headers={}){const res=await mf.dispatchFetch('https://lumina.test/api/'+path,{method,headers:{'Content-Type':'application/json','X-Lumina-Client-IP':'10.0.0.'+clientIp,...(session?{Cookie:session.cookie,'X-CSRF-Token':session.csrf}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(expected!==null)assert.equal(res.status,expected,path+': '+JSON.stringify(data));else assert.equal(res.status,200,path+': '+JSON.stringify(data));count++;return {data,res};}
async function login(username){clientIp++;const {res}=await call('auth/login','POST',{login:username,password,remember:true});const cookie=res.headers.get('set-cookie').split(';')[0];const {data}=await call('bootstrap','GET',undefined,{cookie});return {cookie,csrf:data.user.csrf,user:data.user};}
await call('products','GET',undefined,undefined,401);
const admin=await login('admin'),employee=await login('employee01'),guest=await login('guest01');
assert.equal(admin.user.role,'Admin');assert.equal(employee.user.role,'Employee');assert.equal(guest.user.role,'Guest');
const dash=(await call('dashboard','GET',undefined,admin)).data;assert.equal(dash.counts.products,20);assert.equal(dash.counts.orders,15);assert.equal(dash.counts.employees,4);
const gd=(await call('dashboard','GET',undefined,guest)).data;assert.equal(gd.limited,true);assert.equal(gd.counts.revenue,undefined);
const gp=(await call('products','GET',undefined,guest)).data;
const guestDetail=(await call('products/1','GET',undefined,guest)).data;assert.equal(guestDetail.variants[0].quantity,undefined);assert.equal(gp[0].cost,undefined);assert.equal(gp[0].stock,undefined);
const adminProduct=(await call('products/1','GET',undefined,admin)).data;
const employeeProduct=(await call('products/1','GET',undefined,employee)).data;
assert.equal(adminProduct.price,employeeProduct.price);assert.equal(adminProduct.price,guestDetail.price);
for(const variant of adminProduct.variants) {
  assert.equal(variant.available,variant.quantity>0);
  assert.equal(employeeProduct.variants.find(v=>v.id===variant.id).available,variant.available);
  const guestVariant=guestDetail.variants.find(v=>v.id===variant.id);
  assert.equal(guestVariant.available,variant.available);assert.equal(guestVariant.quantity,undefined);assert.equal(guestVariant.threshold,undefined);
}
count++;
for(const resource of ['users','employees','roles','activity','reports','inventory','orders','customers','suppliers'])await call(resource,'GET',undefined,guest,403);
for(const resource of ['users','employees','roles','activity','reports','suppliers'])await call(resource,'GET',undefined,employee,403);
await call('products','POST',{name:'blocked'},guest,403);
await call('categories','POST',{name:'CSRF'},admin,403,{'X-CSRF-Token':'wrong'});
await call('categories','POST',{name:'Origin'},admin,403,{Origin:'https://evil.test'});
const category=(await call('categories','POST',{name:'Test Category',description:'Test'},admin)).data;
await call('categories/'+category.id,'PUT',{name:'Test Updated',description:'Changed'},admin);
await call('categories/'+category.id,'DELETE',undefined,admin);
await call('products','POST',{name:'Bad Product',sku:'BAD',category_id:1,supplier_id:1,price:-1,cost:0,status:'Active'},admin,422);
await call('orders/2147483648','GET',undefined,admin,400);
await call('products/abc','GET',undefined,admin,400);
const prod=(await call('products','POST',{name:'Test Product',sku:'TEST-SKU',description:'Cotton',category_id:1,supplier_id:1,price:500000,cost:200000,status:'Active',image:null},admin)).data;
await call('products/'+prod.id+'/variants','POST',{size:'S',color:'White',sku:'TEST-SKU-S-W',quantity:12},admin);
const pd=(await call('products/'+prod.id,'GET',undefined,admin)).data;assert.equal(pd.variants.length,1);const variant=pd.variants[0].id;
await call('inventory','POST',{variant_id:variant,action:'Stock Out',quantity:100,note:'Should rollback'},employee,409);
let inv=(await call('inventory','GET',undefined,employee)).data;assert.equal(inv.find(r=>r.id===variant).quantity,12);
await call('inventory','POST',{variant_id:variant,action:'Stock In',quantity:5,note:'Test input'},employee);
await call('inventory','POST',{variant_id:variant,action:'Adjustment',quantity:20,note:'Test count'},admin);
const order=(await call('orders','POST',{customer_id:1,payment_method:'Cash',payment:'Unpaid',items:[{variant_id:variant,quantity:3},{variant_id:variant,quantity:2}]},employee)).data;
const od=(await call('orders/'+order.id,'GET',undefined,employee)).data;assert.equal(od.total,2500000);assert.equal(od.items.length,1);
inv=(await call('inventory','GET',undefined,employee)).data;assert.equal(inv.find(r=>r.id===variant).quantity,15);
await call('orders/'+order.id,'PUT',{status:'Completed',payment:'Paid',payment_method:'Cash'},employee,422);
await call('orders/'+order.id,'PUT',{status:'Cancelled',payment:'Unpaid',payment_method:'Cash'},employee);
await call('orders/'+order.id,'PUT',{status:'Cancelled',payment:'Unpaid',payment_method:'Cash'},employee,422);
inv=(await call('inventory','GET',undefined,employee)).data;assert.equal(inv.find(r=>r.id===variant).quantity,20);
await call('orders','POST',{customer_id:1,payment_method:'Card',payment:'Paid',items:[{variant_id:variant,quantity:21}]},employee,409);
const editingOrder=(await call('orders','POST',{customer_id:1,payment_method:'Cash',payment:'Unpaid',items:[{variant_id:variant,quantity:2}]},employee)).data;
await call('orders/'+editingOrder.id+'/items','PUT',{items:[{variant_id:variant,quantity:4}]},employee);
assert.equal((await call('orders/'+editingOrder.id,'GET',undefined,employee)).data.total,2000000);
assert.equal((await call('inventory','GET',undefined,employee)).data.find(r=>r.id===variant).quantity,16);
await call('orders/'+editingOrder.id+'/items','PUT',{items:[{variant_id:variant,quantity:1000}]},employee,409);
await call('orders/'+editingOrder.id,'PUT',{status:'Cancelled',payment:'Unpaid',payment_method:'Cash'},employee);
assert.equal((await call('inventory','GET',undefined,employee)).data.find(r=>r.id===variant).quantity,20);
const order2=(await call('orders','POST',{customer_id:1,payment_method:'Card',payment:'Paid',items:[{variant_id:variant,quantity:2}]},employee)).data;
for(const status of ['Confirmed','Processing','Shipped','Completed'])await call('orders/'+order2.id,'PUT',{status,payment:'Paid',payment_method:'Card'},employee);
await call('orders/'+order2.id+'/items','PUT',{items:[{variant_id:variant,quantity:1}]},employee,422);
const dash2=(await call('dashboard','GET',undefined,admin)).data;assert.equal(dash2.counts.revenue,dash.counts.revenue+1000000);
const report=(await call('reports?from=2000-01-01&to=2100-01-01','GET',undefined,admin)).data;assert.ok(report.products.some(p=>p.name==='Test Product'&&p.revenue===1000000));
await call('reports?from=bad&to=2026-01-01','GET',undefined,admin,422);
await call('auth/register','POST',{name:'New Guest',username:'newguest',email:'newguest@example.com',phone:'0901234567',password:'Registration!123',confirm:'Registration!123',terms:true});
await call('auth/register','POST',{name:'Duplicate',username:'newguest',email:'newguest@example.com',phone:'0901234567',password:'Registration!123',confirm:'Registration!123',terms:true},undefined,200);
await call('auth/login','POST',{login:'newguest',password:'Registration!123'},undefined,403);
const newUser=(await call('users','GET',undefined,admin)).data.find(u=>u.username==='newguest');assert.equal(newUser.role,'Guest');
await call('users/'+newUser.id,'PUT',{name:newUser.name,username:newUser.username,email:newUser.email,phone:newUser.phone,employee_id:null,status:'Active',role:'Guest'},admin);
const newLogin=await call('auth/login','POST',{login:'newguest',password:'Registration!123'});assert.ok(newLogin.res.headers.get('set-cookie'));
await call('profile','PUT',{name:guest.user.name,phone:guest.user.phone,email:guest.user.email,role:'Admin'},guest,422);
await call('profile','PUT',{name:'Guest Updated',phone:'0901234567',email:guest.user.email,avatar:null},guest);
const forgot=(await call('auth/forgot','POST',{email:'newguest@example.com'})).data;assert.ok(forgot.resetUrl);const token=new URL('https://lumina.test'+forgot.resetUrl).searchParams.get('reset');
await call('auth/reset','POST',{token,password:'Changed!456',confirm:'Changed!456'});
await call('auth/reset','POST',{token,password:'Changed!456',confirm:'Changed!456'},undefined,400);
await call('auth/login','POST',{login:'newguest',password:'Registration!123'},undefined,401);
await call('auth/login','POST',{login:'newguest',password:'Changed!456'});
const ns=(await call('notifications','GET',undefined,guest)).data;assert.ok(ns.every(n=>['All','Guest'].includes(n.audience)));
await call('notifications/'+ns[0].id+'/read','POST',{},guest);
assert.equal((await call('notifications','GET',undefined,guest)).data.find(n=>n.id===ns[0].id).read_status,'Read');
await call('notifications/4/read','POST',{},guest,404);
const roles=(await call('roles','GET',undefined,admin)).data;const guestPermissions=roles.assignments.filter(p=>p.role_id===3).map(p=>p.permission_id);await call('roles','PUT',{role_id:3,permission_ids:[]},admin);await call('products','GET',undefined,guest,403);await call('roles','PUT',{role_id:3,permission_ids:guestPermissions},admin);
const search=(await call('search?q=Test','GET',undefined,admin)).data;assert.ok(search.some(r=>r.name==='Test Product'));
const logs=(await call('activity','GET',undefined,admin)).data;assert.ok(logs.some(l=>l.action==='CREATE_ORDER'));assert.ok(!JSON.stringify(logs).includes(password));
await call('auth/logout','POST',{},guest);await call('products','GET',undefined,guest,401);

// Remaining entity CRUD, uploads and account security.
for(const [entity,fields] of Object.entries({customers:{name:'Test Customer',email:'crud@example.com',phone:'0901234567',address:'TP HCM'},suppliers:{name:'Test Supplier',contact_person:'Test Person',phone:'0901234567',email:'supplier@example.com',address:'TP HCM',status:'Active'},employees:{name:'Test Employee',email:'employeecrud@example.com',phone:'0901234567',birthday:'2000-01-01',address:'TP HCM',department:'IT',position:'Developer',join_date:'2026-10-01',avatar:null,status:'Active'},notifications:{title:'Test Announcement',message:'Team update',audience:'All'}})){
 const r=(await call(entity,'POST',fields,admin)).data;await call(entity+'/'+r.id,'GET',undefined,admin);await call(entity+'/'+r.id,'PUT',{...fields,...(fields.name?{name:fields.name+' Updated'}:{title:'Updated Announcement'})},admin);await call(entity+'/'+r.id,'DELETE',undefined,admin);
}
await call('products/'+prod.id,'PUT',{name:'Test Product Updated',sku:'TEST-SKU',description:'Cotton updated',category_id:1,supplier_id:1,price:500000,cost:200000,status:'Active',image:null},admin);
await call('products/'+prod.id,'DELETE',undefined,admin,409);
const temporary=(await call('products','POST',{name:'Delete Product',sku:'DELETE-SKU',category_id:1,supplier_id:1,price:100000,cost:50000,status:'Draft'},admin)).data;await call('products/'+temporary.id,'DELETE',undefined,admin);
const concurrency=await Promise.all(Array.from({length:2},()=>call('inventory','POST',{variant_id:variant,action:'Stock Out',quantity:15,note:'Concurrent withdrawal'},employee,undefined).catch(e=>e)));
// Exactly one concurrent withdrawal succeeds; the other hits the nonnegative CHECK.
assert.equal(concurrency.filter(r=>!(r instanceof Error)).length,1);
assert.equal((await call('inventory','GET',undefined,admin)).data.find(r=>r.id===variant).quantity,3);
await call('users/'+newUser.id,'PUT',{name:newUser.name,username:newUser.username,email:newUser.email,phone:newUser.phone,employee_id:null,status:'Locked',role:'Guest',password:'AdminReset!789'},admin);
await call('auth/login','POST',{login:'newguest',password:'AdminReset!789'},undefined,403);
await call('users/'+newUser.id,'PUT',{name:newUser.name,username:newUser.username,email:newUser.email,phone:newUser.phone,employee_id:null,status:'Active',role:'Guest'},admin);
const activeLogin=await call('auth/login','POST',{login:'newguest',password:'AdminReset!789'});const activeCookie=activeLogin.res.headers.get('set-cookie').split(';')[0];const activeBootstrap=(await call('bootstrap','GET',undefined,{cookie:activeCookie})).data;const activeSession={cookie:activeCookie,csrf:activeBootstrap.user.csrf};
await call('auth/change-password','POST',{old_password:'Wrong',password:'ChangedAgain!123',confirm:'ChangedAgain!123'},activeSession,400);
await call('auth/change-password','POST',{old_password:'AdminReset!789',password:'ChangedAgain!123',confirm:'ChangedAgain!123'},activeSession);
await call('users/'+newUser.id,'DELETE',undefined,admin);await call('products','GET',undefined,activeSession,401);
const sharp=(await import('sharp')).default;
const png=await sharp({create:{width:1,height:1,channels:3,background:{r:255,g:255,b:255}}}).png().toBuffer();
const file=new FormData();file.append('file',new File([png],'avatar.png',{type:'image/png'}));const encoded=new Request('https://lumina.test/api/upload',{method:'POST',body:file});const up=await mf.dispatchFetch(encoded.url,{method:'POST',headers:{Cookie:employee.cookie,'X-CSRF-Token':employee.csrf,'Content-Type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});assert.equal(up.status,200);count++;const media=(await up.json()).url;
const imageResponse=await mf.dispatchFetch('https://lumina.test'+media,{headers:{Cookie:employee.cookie}});assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get('content-type'),'image/png');count++;
await call('profile','PUT',{name:employee.user.name,phone:employee.user.phone,email:employee.user.email,avatar:media},employee);
const invalid=new FormData();invalid.append('file',new File(['<script>alert(1)</script>'],'bad.png',{type:'image/png'}));const encodedBad=new Request('https://lumina.test/api/upload',{method:'POST',body:invalid});const badUpload=await mf.dispatchFetch(encodedBad.url,{method:'POST',headers:{Cookie:employee.cookie,'X-CSRF-Token':employee.csrf,'Content-Type':encodedBad.headers.get('content-type')},body:await encodedBad.arrayBuffer()});assert.equal(badUpload.status,422);count++;
clientIp=99;for(let i=0;i<5;i++)await call('auth/login','POST',{login:'guest02',password:'BadPassword'},undefined,401);await call('auth/login','POST',{login:'guest02',password},undefined,429);
clientIp=100;for(let i=0;i<15;i++)await call('auth/login','POST',{login:'does-not-exist',password:'BadPassword'},undefined,401);await call('auth/login','POST',{login:'does-not-exist',password:'BadPassword'},undefined,429);
const html=await mf.dispatchFetch('https://lumina.test/');assert.equal(html.status,200);assert.ok(html.headers.get('content-security-policy').includes("object-src 'none'"));assert.ok((await html.text()).includes('LUMINA'));count++;


// Real HTTP bridge: cookies, JSON, multipart uploads, static assets and database health.
const health=await fetch('http://127.0.0.1:3199/healthz');assert.equal(health.status,200);count++;
const loginHttp=await fetch('http://127.0.0.1:3199/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3199'},body:JSON.stringify({login:'admin',password})});assert.equal(loginHttp.status,200);count++;
const cookieHttp=loginHttp.headers.get('set-cookie')!.split(';')[0];
assert.ok(loginHttp.headers.get('set-cookie')!.includes('HttpOnly'));
assert.ok(!loginHttp.headers.get('set-cookie')!.includes('Secure'));
const bootHttp=await fetch('http://127.0.0.1:3199/api/bootstrap',{headers:{Cookie:cookieHttp}});assert.equal(bootHttp.status,200);const userHttp=(await bootHttp.json()).user;count++;
const httpForm=new FormData();httpForm.append('file',new File([png],'http.png',{type:'image/png'}));
const uploaded=await fetch('http://127.0.0.1:3199/api/upload',{method:'POST',headers:{Cookie:cookieHttp,'X-CSRF-Token':userHttp.csrf,Origin:'http://127.0.0.1:3199'},body:httpForm});assert.equal(uploaded.status,200);count++;
const uploadedUrl=(await uploaded.json()).url;
assert.equal((await fetch('http://127.0.0.1:3199'+uploadedUrl,{headers:{Cookie:cookieHttp}})).status,200);count++;
assert.equal((await fetch('http://127.0.0.1:3199/api/bootstrap')).status,200);count++;
// The same backend accepts both local hosts, directly and with Vite's preserved Host/port.
// Fetch controls Host itself; use Node HTTP to reproduce the headers forwarded by Vite.
function localRequest(path:string, options:{method?:string;headers:Record<string,string>;body?:string}):Promise<Response> {
  return new Promise((resolve,reject)=>{
    const req=httpRequest({hostname:'127.0.0.1',port:3199,path,method:options.method || 'GET',headers:options.headers},res=>{
      const chunks:Buffer[]=[];
      res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);
      res.on('end',()=>resolve(new Response(Buffer.concat(chunks).toString(),{status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).filter(([,v])=>v!==undefined).map(([k,v])=>[k,Array.isArray(v)?v.join(','):v]))})));
    });
    req.on('error',reject);req.end(options.body);
  });
}
for(const host of ['localhost:3199','127.0.0.1:3199','localhost:5173','127.0.0.1:5174']) {
  const origin='http://'+host;
  const localLogin=await localRequest('/api/auth/login',{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({login:'admin',password})});
  assert.equal(localLogin.status,200,host+' login');count++;
  assert.ok(localLogin.headers.get('set-cookie')!.includes('HttpOnly'));
  assert.ok(!localLogin.headers.get('set-cookie')!.includes('Secure'));
  const cookie=localLogin.headers.get('set-cookie')!.split(';')[0];
  const boot=await localRequest('/api/bootstrap',{headers:{Host:host,Cookie:cookie}});
  assert.equal(boot.status,200);const localUser=(await boot.json()).user;assert.equal(localUser.role,'Admin');count++;
  const update=await localRequest('/api/profile',{method:'PUT',headers:{Host:host,Origin:origin,Cookie:cookie,'X-CSRF-Token':localUser.csrf,'Content-Type':'application/json'},body:JSON.stringify({name:localUser.name,email:localUser.email,phone:localUser.phone || ''})});
  assert.equal(update.status,200,host+' authenticated write');count++;
}
for(const origin of ['http://evil.test','http://localhost:5174','http://127.0.0.1:5173','null']) {
  const rejected=await localRequest('/api/auth/login',{method:'POST',headers:{Host:'localhost:5173',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({login:'admin',password})});
  assert.equal(rejected.status,403,'CSRF must reject '+origin);count++;
}
const badToken=await localRequest('/api/profile',{method:'PUT',headers:{Host:'localhost:5173',Origin:'http://localhost:5173',Cookie:cookieHttp,'X-CSRF-Token':'invalid','Content-Type':'application/json'},body:'{}'});
assert.equal(badToken.status,403);count++;
// Exercise the exact Vercel adapter and middleware, including rewrite/query preservation.
const vercel=(await import('../api/index')).default;
const rewritten=await vercel.fetch(new Request('https://lumina.test/api/index?path=bootstrap',{headers:{Cookie:admin.cookie}}));
assert.equal(rewritten.status,200);assert.equal((await rewritten.json()).user.role,'Admin');count++;
const searchViaRewrite=await vercel.fetch(new Request('https://lumina.test/api/index?path=search&q=LM',{headers:{Cookie:admin.cookie}}));
assert.equal(searchViaRewrite.status,200);assert.ok((await searchViaRewrite.json()).length);count++;
const invalidJson=await vercel.fetch(new Request('https://lumina.test/api/index?path=auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}));
assert.equal(invalidJson.status,400);count++;
const crossSite=await vercel.fetch(new Request('https://lumina.test/api/index?path=bootstrap',{headers:{'Sec-Fetch-Site':'cross-site'}}));assert.equal(crossSite.status,403);count++;
const unsupported=await vercel.fetch(new Request('https://lumina.test/api/index?path=bootstrap',{method:'PATCH'}));assert.equal(unsupported.status,405);count++;
const wrongType=await vercel.fetch(new Request('https://lumina.test/api/index?path=auth/login',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'}));assert.equal(wrongType.status,415);count++;
const oversized=await vercel.fetch(new Request('https://lumina.test/api/index?path=auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'a'.repeat(3*1024*1024+1)}));assert.equal(oversized.status,413);count++;
const corruptForm=new FormData();corruptForm.append('file',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l4sAAAAASUVORK5CYII=','base64')],'corrupt.png',{type:'image/png'}));
const corrupt=await vercel.fetch(new Request('https://lumina.test/api/index?path=upload',{method:'POST',headers:{Cookie:admin.cookie,'X-CSRF-Token':admin.csrf},body:corruptForm}));assert.equal(corrupt.status,422);count++;
console.log(JSON.stringify({passed:count,database:'PostgreSQL',assertions:'Auth, RBAC, CSRF, CRUD, variants, inventory rollback/concurrency, orders, reports, seed idempotency, password reset, uploads, account lockouts and real HTTP'}));
} finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();}

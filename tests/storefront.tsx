import assert from 'node:assert/strict';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:5173/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:class{observe(){}unobserve(){}disconnect(){}}});
let session:any=null,quoteWrites=0,checkouts=0;
const reads:string[]=[],writes:string[]=[];
const p={id:1,name:'Linen Everyday',sku:'LINEN',category:'Áo',category_id:1,description:'Áo linen nhẹ',price:200000,available:true,image:null};
const variant={id:11,sku:'LINEN-M',size:'M',color:'Beige',available:true};
const policy={shipping_fee:30000,free_shipping_threshold:500000,support_email:'',support_phone:''};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status});
let ownOrders:any[]=[];
globalThis.fetch=async(url,options)=>{
 const path=String(url).replace('/api/',''),method=options?.method||'GET';
 if(method!=='GET'){
  writes.push(path);const d=JSON.parse(String(options?.body||'{}'));
  if(path==='auth/login'){const role=d.login==='admin'?'Admin':d.login==='employee'?'Employee':'Guest';session={id:role==='Admin'?1:role==='Employee'?2:3,username:d.login,name:'Khách LUMINA',email:'buyer@example.test',phone:'0901234567',role,permissions:['product.view','notification.view'],csrf:'test'};return json({ok:true});}
  if(path==='auth/logout'){session=null;return json({ok:true});}
  if(!session)return json({error:'Vui lòng đăng nhập.'},401);
  if(path==='checkout/quote'){quoteWrites++;return json({items:[{...p,...variant,variant_id:11,quantity:1,price:200000}],subtotal:200000,shipping_fee:30000,total:230000,quote_hash:'a'.repeat(64)});}
  if(path==='checkout'){checkouts++;const order={id:40,code:'LM-STOREFRONT',status:'Pending',payment:'Unpaid',total:230000,subtotal:200000,shipping_fee:30000,shipping_name:d.shipping.name,shipping_phone:d.shipping.phone,shipping_address:d.shipping.address,shipping_email:d.shipping.email,items:[{...p,...variant,variant_id:11,quantity:1,price:200000}]};ownOrders=[order];return json(order);}
  if(path==='my-orders/40/cancel'){ownOrders=[{...ownOrders[0],status:'Cancelled'}];return json({ok:true});}
  throw new Error('Unexpected write '+path);
 }
 reads.push(path);
 if(path==='bootstrap')return json({user:session,demo:false});
 if(path==='store/policy')return json(policy);
 if(path==='store/products')return json([p,{...p,id:2,name:'Sold Out Shirt',price:600000,available:false,category:'Áo khoác'}]);
 if(path==='store/products/1')return json({...p,variants:[variant]});
 if(!session)return json({error:'Vui lòng đăng nhập.'},401);
 if(path==='products/1')return json({...p,status:'Active',variants:[variant]});
 if(path==='my-orders')return json(ownOrders);
 if(path==='my-orders/40')return json(ownOrders[0]);
 if(path==='notifications')return json([]);
 if(path==='checkout/address')return json(null);
 if(path==='shop-policy')return json(policy);
 if(path==='dashboard')return json({counts:{products:1},limited:true,categories:[]});
 if(path==='users')return json([]);
 throw new Error('Unexpected read '+path);
};
const {createRoot}=await import('react-dom/client');
const {default:App}=await import('../frontend/src/App');
const root=createRoot(document.getElementById('root')!);
const tick=()=>new Promise(r=>setTimeout(r,0));
async function flush(action:()=>void){await act(async()=>{action();await tick();await tick();});}
async function click(selector:string){const el=document.querySelector<HTMLButtonElement>(selector);assert.ok(el,'Missing '+selector);assert.equal(el.disabled,false);await flush(()=>el.click());}
async function input(selector:string,value:string){const el=document.querySelector<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>(selector)!;assert.ok(el,'Missing '+selector);const proto=el.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?dom.window.HTMLTextAreaElement.prototype:dom.window.HTMLInputElement.prototype;await flush(()=>{Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
async function route(page:string){await flush(()=>{window.location.hash=page;});}
async function login(name='guest'){await input('input[name="login"]',name);await input('input[name="password"]','Example!123');await click('.auth-form button[type="submit"], .auth-form .full');}
function noWorkspace(){assert.equal(document.querySelector('.sidebar'),null);assert.equal(document.querySelector('.navbar'),null);assert.equal(document.querySelector('button[title="Users"]'),null);}
try{
 await flush(()=>root.render(<React.StrictMode><App/></React.StrictMode>));
 assert.ok(document.querySelector('.store-hero'));assert.equal(document.querySelector('.auth-layout'),null);assert.equal(document.querySelectorAll('.store-product-card').length,2);noWorkspace();
 assert.equal(reads.some(p=>['dashboard','products','users','orders','inventory'].includes(p)),false);
 await click('button[aria-label="Xem Linen Everyday"]');assert.ok(document.querySelector('.store-detail'));assert.ok(document.querySelector('.store-variants')?.textContent?.includes('Còn hàng'));assert.equal(writes.length,0);
 await click('.detail-shop');assert.ok(document.querySelector('.auth-layout'));assert.equal(quoteWrites,0);assert.equal(checkouts,0);noWorkspace();
 await login();assert.equal(session.role,'Guest');noWorkspace();assert.ok(document.querySelector('select[aria-label="Chọn size và màu"]'),'Login resumes product choice');
 await click('.modal .primary');assert.ok(document.querySelector('.store-feedback')?.textContent?.includes('Đã thêm'));await click('.store-header-actions button[title="Giỏ hàng"]');assert.equal(document.querySelectorAll('.cart-item').length,1);
 await click('.checkout-link');await input('textarea[name="address"]','123 Đường LUMINA, Việt Nam');await click('.checkout-review');await click('.checkout-form input[type="checkbox"]');await click('.checkout-place');
 assert.equal(checkouts,1);assert.equal(window.location.hash,'#my-orders/40');assert.ok(document.querySelector('.modal')?.textContent?.includes('LM-STOREFRONT'));noWorkspace();
 const cancelButton=Array.from(document.querySelectorAll<HTMLButtonElement>('.modal button')).find(b=>b.textContent==='Hủy đơn hàng')!;await flush(()=>cancelButton.click());await click('.cancel-order-confirm .danger-btn');assert.ok(document.querySelector('.modal')?.textContent?.includes('Đã hủy'));
 await click('.modal header button');await route('users');assert.ok(document.querySelector('.store-main')?.textContent?.includes('Trang này không có'));noWorkspace();assert.equal(reads.includes('users'),false);
 await click('.store-header-actions button[title="Đăng xuất"]');assert.equal(session,null);noWorkspace();assert.ok(document.querySelector('.store-hero'));
 await route('my-orders/40');assert.ok(document.querySelector('.store-login-gate'));assert.equal(document.querySelector('.customer-orders'),null);assert.equal(document.querySelector('.modal'),null);
 await route('products');await input('input[aria-label="Giá từ"]','300000');assert.equal(document.querySelectorAll('.store-product-card').length,1);await input('input[aria-label="Giá từ"]','');
 await click('.store-login');await login('admin');assert.ok(document.querySelector('.sidebar'));assert.ok(document.querySelector('button[title="Users"]'));assert.equal(document.querySelector('.storefront'),null);
 await click('.logout');assert.ok(document.querySelector('.storefront'));await click('.store-login');await login('employee');assert.ok(document.querySelector('.sidebar'));assert.equal(document.querySelector('button[title="Users"]'),null);
 await click('.logout');await route('shop-policy');assert.ok(document.querySelector('.shop-policy'));assert.equal(document.querySelector('.auth-layout'),null);
 console.log('Passed storefront: anonymous home/detail/policy, login gate, resumed cart, Guest COD/cancel, no management UI/API, logout isolation, filters and Admin/Employee routing.');
}finally{await flush(()=>root.unmount());dom.window.close();}

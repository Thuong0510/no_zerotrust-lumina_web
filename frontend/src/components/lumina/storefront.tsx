import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, LogOut, Search, ShoppingBag, ShoppingCart, UserRound } from 'lucide-react';
import { api, money, date } from '../../lib/client';
import { useCart, cartCount } from '../../lib/cart';
import AuthScreen from './auth-screen';
import { AddToCart, CartPage, CheckoutPage } from './shopping';
import { MyOrdersPage, PolicyContent } from './customer-shopping';
import { ProfilePage } from './system-pages';
import { Empty, ErrorBox, Modal, ProductArt } from './ui';

type Route={page:string;id?:number};
type Navigate=(page:string,id?:number)=>void;
type Intent={page:string;id?:number;shopId?:number};
const privatePages=new Set(['cart','checkout','my-orders','profile','notifications']);
const publicPages=new Set(['home','products','shop-policy']);

function ProductDetail({id,onClose,onShop}:{id:number;onClose:()=>void;onShop:(id:number)=>void}) {
    const [state,setState]=useState<{id:number;product?:any;error?:string}>();
    useEffect(()=>{let live=true;api('store/products/'+id).then(product=>{if(live)setState({id,product});}).catch(e=>{if(live)setState({id,error:e.message});});return()=>{live=false;};},[id]);
    const product=state?.id===id?state.product:undefined;
    return <Modal title={product?.name||'Chi tiết sản phẩm'} onClose={onClose} wide>
        <ErrorBox error={state?.id===id?state.error:undefined}/>{state?.id!==id&&<p role="status">Đang tải sản phẩm…</p>}
        {product&&<div className="store-detail"><ProductArt image={product.image} name={product.name} category={product.category_id}/><div><span className="eyebrow">{product.category}</span><h2>{product.name}</h2><strong className="store-price">{money(product.price)}</strong><p className="store-description">{product.description||'Khám phá phong cách và lựa chọn size, màu phù hợp với bạn.'}</p>
            <h3>Size và màu</h3><div className="store-variants">{product.variants.map((v:any)=><span key={v.id} className={v.available?'':'sold-out'}>{v.size} / {v.color} · {v.available?'Còn hàng':'Hết hàng'}</span>)}</div>
            <button className="btn primary detail-shop" disabled={!product.available} onClick={()=>onShop(product.id)}><ShoppingCart size={17}/>{product.available?'Thêm vào giỏ hàng':'Tạm hết hàng'}</button><p className="help-text">Chọn số lượng ở bước tiếp theo. Giá và tồn được xác nhận lại khi đặt hàng.</p>
        </div></div>}
    </Modal>;
}

function Catalog({rows,home,navigate,onShop}:{rows:any[];home:boolean;navigate:Navigate;onShop:(id:number)=>void}) {
    const [search,setSearch]=useState(''),[category,setCategory]=useState(''),[min,setMin]=useState(''),[max,setMax]=useState(''),[available,setAvailable]=useState(false),[sort,setSort]=useState('new'),[page,setPage]=useState(1);
    useEffect(()=>setPage(1),[search,category,min,max,available,sort]);
    const categories=Array.from(new Set<string>(rows.map(p=>p.category).filter(Boolean)));
    const filtered=useMemo(()=>rows.filter(p=>(!category||p.category===category)&&(!min||p.price>=Number(min))&&(!max||p.price<=Number(max))&&(!available||p.available)&&[p.name,p.sku,p.description,p.category].some(v=>String(v||'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))).sort((a,b)=>sort==='low'?a.price-b.price:sort==='high'?b.price-a.price:b.id-a.id),[rows,search,category,min,max,available,sort]);
    const pageCount=Math.max(1,Math.ceil(filtered.length/12)),currentPage=Math.min(page,pageCount);
    return <>
        {home&&<section className="store-hero"><div><span className="eyebrow">LUMINA / EVERYDAY COLLECTION</span><h1>Phong cách của bạn.<br/><em>Mỗi ngày một cảm hứng.</em></h1><p>Khám phá những thiết kế dễ mặc, chọn màu sắc yêu thích và tìm phong cách dành riêng cho bạn.</p><button className="btn primary" onClick={()=>navigate('products')}>Khám phá bộ sưu tập <ArrowRight size={17}/></button></div><div className="store-hero-art" aria-hidden="true"><ProductArt category={1}/><ProductArt category={2}/><span>MADE FOR YOUR EVERYDAY</span></div></section>}
        <section className="store-catalog"><div className="store-section-heading"><div><span className="eyebrow">THE COLLECTION</span><h1>{home?'Tìm lựa chọn yêu thích':'Bộ sưu tập sản phẩm'}</h1><p>{filtered.length} sản phẩm · Chọn size và màu theo phong cách của bạn.</p></div></div>
            <div className="store-filters"><label className="store-search"><Search size={18}/><input aria-label="Tìm sản phẩm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên sản phẩm, danh mục…"/></label><label>Danh mục<select aria-label="Lọc danh mục" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Giá từ<input aria-label="Giá từ" type="number" min={0} value={min} onChange={e=>setMin(e.target.value)}/></label><label>Giá đến<input aria-label="Giá đến" type="number" min={0} value={max} onChange={e=>setMax(e.target.value)}/></label><label>Sắp xếp<select aria-label="Sắp xếp sản phẩm" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">Mới nhất</option><option value="low">Giá tăng dần</option><option value="high">Giá giảm dần</option></select></label><label className="checkbox"><input type="checkbox" checked={available} onChange={e=>setAvailable(e.target.checked)}/>Còn hàng</label></div>
            {filtered.length?<div className="store-product-grid">{filtered.slice((currentPage-1)*12,currentPage*12).map(p=><article className="store-product-card" key={p.id}><button className="store-card-image" title="Xem chi tiết" aria-label={'Xem '+p.name} onClick={()=>navigate('products',p.id)}><ProductArt image={p.image} category={p.category_id} name={p.name}/>{!p.available&&<span className="store-stock-label">Tạm hết hàng</span>}</button><div className="store-card-info"><span>{p.category}</span><button className="store-product-name" onClick={()=>navigate('products',p.id)}>{p.name}</button><div><strong>{money(p.price)}</strong><button className="icon-btn" title="Thêm vào giỏ hàng" aria-label={'Thêm '+p.name+' vào giỏ hàng'} disabled={!p.available} onClick={()=>onShop(p.id)}><ShoppingCart size={19}/></button></div></div></article>)}</div>:<section className="panel shopping-empty"><Empty text="Chưa tìm thấy sản phẩm phù hợp" hint="Thử thay đổi từ khóa, danh mục hoặc khoảng giá."/></section>}
            {pageCount>1&&<nav className="store-pagination" aria-label="Phân trang sản phẩm"><button className="btn" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>Trang trước</button><span>{currentPage} / {pageCount}</span><button className="btn" disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)}>Trang sau</button></nav>}
        </section>
    </>;
}

export default function Storefront({user,demo,current,navigate,cart,onLogin,onLogout,onProfileSaved,onSessionExpired}:{user:any;demo:boolean;current:Route;navigate:Navigate;cart:ReturnType<typeof useCart>;onLogin:()=>Promise<any>;onLogout:()=>Promise<void>;onProfileSaved:()=>Promise<any>;onSessionExpired:()=>void}) {
    const page=current.page==='dashboard'||(user&&current.page==='login')?'home':current.page;
    const resetToken=new URLSearchParams(window.location.search).get('reset');
    const showAuth=!user&&(page==='login'||Boolean(resetToken));
    const [intent,setIntent]=useState<Intent>(),[shopProduct,setShopProduct]=useState<number>(),[notice,setNotice]=useState(''),[policy,setPolicy]=useState<any>(),[policyError,setPolicyError]=useState(''),[revision,setRevision]=useState(0);
    const scope=page+':'+(user?.id||'public');
    const [state,setState]=useState<{scope:string;data?:any;error?:string;loading:boolean}>();
    const needsLogin=!user&&privatePages.has(page);
    useEffect(()=>{let live=true;api('store/policy').then(p=>{if(live)setPolicy(p);}).catch(e=>{if(live)setPolicyError(e.message);});return()=>{live=false;};},[]);
    useEffect(()=>{setShopProduct(undefined);setNotice('');if(user&&intent){if(intent.shopId)setShopProduct(intent.shopId);setIntent(undefined);}},[user?.id]);
    useEffect(()=>{
        let live=true;
        if(showAuth||needsLogin){setState({scope,loading:false});return()=>{live=false;};}
        const endpoint=['home','products'].includes(page)?'store/products':user&&['my-orders','notifications'].includes(page)?page:undefined;
        setState({scope,loading:Boolean(endpoint)});
        if(endpoint)api(endpoint).then(data=>{if(live)setState({scope,data,loading:false});}).catch(e=>{if(live){setState({scope,error:e.message,loading:false});if(e.status===401&&user)onSessionExpired();}});
        return()=>{live=false;};
    },[scope,revision,showAuth,needsLogin]);
    const matches=state?.scope===scope,data=matches?state.data:undefined,error=matches?state.error:undefined,loading=!matches||state.loading;
    const reload=()=>setRevision(v=>v+1);
    function login(target:Intent={page:'home'}){setIntent(target);navigate('login');}
    function shop(id:number){if(!user){login({page:'products',shopId:id});return;}setShopProduct(id);}
    function notify(message:string){setNotice(message);}
    async function loggedIn(){const active=await onLogin();if(active)navigate(active.role==='Guest'?(intent?.page||'home'):'dashboard',active.role==='Guest'?intent?.id:undefined);}
    function leaveAuth(){if(resetToken)window.history.replaceState(null,'',window.location.pathname+'#home');setIntent(undefined);navigate('home');}
    return <div className="storefront">
        <div className="store-announcement">{policy?`COD · Phí giao hàng ${money(policy.shipping_fee)} · Miễn phí từ ${money(policy.free_shipping_threshold)}`:'LUMINA FASHION · Phong cách dành cho mỗi ngày'}</div>
        <header className="store-header"><button className="store-brand" onClick={()=>navigate('home')}>LUMINA<span>F A S H I O N</span></button><nav className="store-nav" aria-label="Điều hướng mua sắm"><button className={page==='home'?'active':''} onClick={()=>navigate('home')}>Trang chủ</button><button className={page==='products'?'active':''} title="Sản phẩm" onClick={()=>navigate('products')}>Sản phẩm</button><button className={page==='shop-policy'?'active':''} onClick={()=>navigate('shop-policy')}>Chính sách</button>{user&&<button title="Đơn của tôi" onClick={()=>navigate('my-orders')}>Đơn của tôi</button>}</nav><div className="store-header-actions">
            <button className="icon-btn" title="Giỏ hàng" aria-label={'Giỏ hàng, '+cartCount(cart.items)+' sản phẩm'} onClick={()=>user?navigate('cart'):login({page:'cart'})}><ShoppingCart size={21}/>{cartCount(cart.items)>0&&<b className="store-cart-count">{cartCount(cart.items)}</b>}</button>
            {user?<><button className="icon-btn" title="Thông báo" aria-label="Thông báo" onClick={()=>navigate('notifications')}><Bell size={20}/></button><button className="store-account" onClick={()=>navigate('profile')}><UserRound size={19}/><span>{user.name}</span></button><button className="icon-btn" title="Đăng xuất" aria-label="Đăng xuất" onClick={()=>onLogout().catch(e=>notify(e.message))}><LogOut size={19}/></button></>:<button className="btn store-login" onClick={()=>login()}><UserRound size={17}/>Đăng nhập</button>}
        </div></header>
        {showAuth?<div className="store-auth"><div className="store-auth-back"><button className="text-btn" onClick={leaveAuth}>← Tiếp tục xem sản phẩm</button>{intent?.shopId&&<p>Đăng nhập để chọn size, màu và thêm sản phẩm vào giỏ hàng.</p>}</div><AuthScreen demo={demo} onLogin={loggedIn}/></div>:<main className="store-main">
            {notice&&<div className="store-feedback" role="status">{notice}<button className="text-btn" onClick={()=>setNotice('')}>Đóng</button></div>}
            {needsLogin?<section className="panel store-login-gate"><ShoppingBag size={36}/><h1>Đăng nhập để tiếp tục mua sắm</h1><p>Giỏ hàng, đặt hàng, đơn cá nhân và hồ sơ cần tài khoản đã đăng nhập.</p><button className="btn primary" onClick={()=>login({page,id:current.id})}>Đăng nhập</button><button className="text-btn" onClick={()=>navigate('products')}>Tiếp tục xem sản phẩm</button></section>:<>
                <ErrorBox error={error}/>{error&&<button className="btn" onClick={reload}>Thử lại</button>}
                {loading?<p className="store-loading" role="status">Đang tải cửa hàng…</p>:<>
                    {['home','products'].includes(page)&&Array.isArray(data)&&<Catalog key={page} rows={data} home={page==='home'} navigate={navigate} onShop={shop}/>}
                    {page==='shop-policy'&&<section className="panel checkout-section"><h1>Chính sách mua hàng</h1><ErrorBox error={policyError}/>{policy?<PolicyContent policy={policy}/>:!policyError&&<p role="status">Đang tải chính sách…</p>}</section>}
                    {user&&page==='cart'&&<CartPage {...cart} navigate={navigate}/>}
                    {user&&page==='checkout'&&<CheckoutPage key={user.id} items={cart.items} user={user} navigate={navigate} onPlaced={cart.clear}/>}
                    {user&&page==='my-orders'&&Array.isArray(data)&&<MyOrdersPage key={user.id} rows={data} initialDetail={current.id} reload={reload} navigate={navigate}/>}
                    {user&&page==='profile'&&<ProfilePage key={user.id} user={user} onSaved={onProfileSaved} notify={notify}/>}
                    {user&&page==='notifications'&&Array.isArray(data)&&<section className="panel store-notifications"><h1>Thông báo của bạn</h1>{data.length?data.map(n=><article key={n.id}><small>{date(n.created_at)} · {n.read_status==='Unread'?'Chưa đọc':'Đã đọc'}</small><h3>{n.title}</h3><p>{n.message}</p>{n.read_status==='Unread'&&<button className="text-btn" onClick={async()=>{try{await api('notifications/'+n.id+'/read','POST',{});reload();}catch(e:any){notify(e.message);}}}>Đánh dấu đã đọc</button>}</article>):<Empty text="Chưa có thông báo" hint="Thông tin về đơn hàng sẽ xuất hiện tại đây."/>}</section>}
                    {!publicPages.has(page)&&!privatePages.has(page)&&<section className="panel shopping-empty"><h1>Trang này không có trong cửa hàng</h1><button className="btn primary" onClick={()=>navigate('home')}>Về trang chủ</button></section>}
                </>}
            </>}
        </main>}
        <footer className="store-footer"><div><strong>LUMINA FASHION</strong><p>Phong cách giản dị. Lựa chọn dành cho bạn.</p></div><div><button className="text-btn" onClick={()=>navigate('shop-policy')}>Giao hàng, hủy đơn và đổi trả</button>{policy?.support_email&&<a href={'mailto:'+policy.support_email}>{policy.support_email}</a>}{policy?.support_phone&&<a href={'tel:'+policy.support_phone}>{policy.support_phone}</a>}<small>© 2026 LUMINA FASHION</small></div></footer>
        {!showAuth&&page==='products'&&current.id&&!shopProduct&&<ProductDetail id={current.id} onClose={()=>navigate('products')} onShop={id=>{navigate('products');shop(id);}}/>}
        {user&&shopProduct&&<AddToCart key={shopProduct} productId={shopProduct} items={cart.items} onClose={()=>setShopProduct(undefined)} onAdd={item=>{cart.add(item);notify('Đã thêm sản phẩm vào giỏ hàng.');}}/>}
    </div>;
}

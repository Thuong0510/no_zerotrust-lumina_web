'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Layers, Warehouse, ShoppingBag, Users, Truck, UserRound, UserCog, ShieldCheck, ChartNoAxesCombined, Bell, History, LogOut, Search, ChevronDown, ChevronsLeft, Menu, X, ArrowUpRight, ArrowRight, CheckCircle2, Command, LifeBuoy, ArrowLeft } from 'lucide-react';
import { api, setCsrf, APIError } from './lib/client';
import { entities, Entity } from '../../shared/entities';
import Storefront from './components/lumina/storefront';
import Dashboard from './components/lumina/dashboard';
import EntityPage, { allowed } from './components/lumina/entity-page';
import { InventoryPage, OrdersPage, CreateOrder } from './components/lumina/operations';
import { RolesPage, ReportsPage, ProfilePage, ActivityPage } from './components/lumina/system-pages';
import { ErrorBox } from './components/lumina/ui';
import { useCart, cartCount } from './lib/cart';
import { AddToCart, CartPage, CheckoutPage } from './components/lumina/shopping';
import { MyOrdersPage, ShopPolicyPage } from './components/lumina/customer-shopping';
const sections = [{ label: '', items: [['dashboard', 'Dashboard', LayoutDashboard, '']] }, { label: 'MANAGEMENT', items: [['products', 'Products', Package, 'product.view'], ['categories', 'Categories', Layers, 'category.view'], ['inventory', 'Inventory', Warehouse, 'inventory.view'], ['orders', 'Orders', ShoppingBag, 'order.view'], ['customers', 'Customers', Users, 'customer.view'], ['suppliers', 'Suppliers', Truck, 'supplier.view']] }, { label: 'SHOPPING', items: [['my-orders', 'Đơn của tôi', ShoppingBag, ''], ['shop-policy', 'Chính sách mua hàng', LifeBuoy, ''], ['cart', 'Giỏ hàng', ShoppingCart, '']] }, { label: 'ORGANIZATION', items: [['employees', 'Employees', UserRound, 'employee.view'], ['users', 'Users', UserCog, 'user.manage'], ['roles', 'Roles & Permissions', ShieldCheck, 'role.manage']] }, { label: 'ANALYTICS', items: [['reports', 'Reports', ChartNoAxesCombined, 'report.view']] }, { label: 'SYSTEM', items: [['notifications', 'Notifications', Bell, 'notification.view'], ['activity', 'Activity Logs', History, 'activity.view']] }];
const titles: Record<string, string> = { 'my-orders': 'Đơn của tôi', 'shop-policy': 'Chính sách mua hàng', cart: 'Giỏ hàng', checkout: 'Thanh toán', dashboard: 'Dashboard', inventory: 'Inventory', orders: 'Orders', roles: 'Roles & Permissions', reports: 'Reports & Analytics', activity: 'Activity Logs', profile: 'My Profile', ...Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, v.title])) };
function route() { if (typeof window === 'undefined')
    return { page: 'dashboard', id: undefined }; const [page, id] = window.location.hash.replace('#', '').split('/'); return { page: page || 'dashboard', id: id ? Number(id) : undefined }; }
export default function App() {
    const [user, setUser] = useState<any>(null), [ready, setReady] = useState(false), [demo, setDemo] = useState(false), [current, setCurrent] = useState<{
        page: string;
        id?: number;
    }>({ page: 'dashboard' }), [error, setError] = useState<any>(null), [collapsed, setCollapsed] = useState(false), [mobile, setMobile] = useState(false), [q, setQ] = useState(''), [results, setResults] = useState<any[]>([]), [notifications, setNotifications] = useState<any[]>([]), [notice, setNotice] = useState(''), [create, setCreate] = useState(false);
    const [pageState, setPageState] = useState<{ page: string; user: any; data?: any; error?: any; loading: boolean }>();
    const requestId = useRef(0);
    const bootstrapVersion = useRef(0);
    const cart = useCart(user);
    const [shopProduct, setShopProduct] = useState<number>();
    useEffect(() => { setShopProduct(undefined); }, [user?.id, user?.username]);
    // Navigation renders before its effect runs. Never pass the previous page's payload to the new page.
    const matchesPage = pageState?.page === current.page && pageState?.user === user;
    const data = matchesPage ? pageState.data : undefined;
    const pageError = matchesPage ? pageState.error : undefined;
    const loading = !matchesPage || pageState.loading;
    const bootstrap = useCallback(async () => {
      const version = ++bootstrapVersion.current;
      try {
        requestId.current++;
        const r = await api('bootstrap');
        if (version !== bootstrapVersion.current) return;
        setUser(r.user);
        setCsrf(r.user?.csrf || '');
        setDemo(r.demo);
        setError(null);
        return r.user;
    }
    catch (e: any) {
        if (version !== bootstrapVersion.current) return;
        if (e.status === 401) { setUser(null); setCsrf(''); }
        else setError(e);
    }
    finally {
        if (version === bootstrapVersion.current) setReady(true);
    } }, []);
    useEffect(() => { bootstrap(); const sync = () => { setCurrent(route()); setMobile(false); setQ(''); }; sync(); window.addEventListener('hashchange', sync); return () => { bootstrapVersion.current++; window.removeEventListener('hashchange', sync); }; }, [bootstrap]);
    const navigate = (page: string, id?: number) => { window.location.hash = page + (id ? '/' + id : ''); setCurrent({ page, id }); setMobile(false); setQ(''); };
    function notify(s: string) { setNotice(s); window.setTimeout(() => setNotice(''), 5000); }
    const load = useCallback(async () => { if (!user || user.role === 'Guest')
        return;
        const id = ++requestId.current;
        const page = current.page;
        const isCurrent = () => id === requestId.current;
        setPageState({ page, user, loading: true });
        try {
        if (!titles[current.page])
            throw new APIError(404, 'Page Not Found');
        const r = ['profile', 'reports', 'cart', 'checkout', 'shop-policy'].includes(page) ? undefined : await api(page);
        if (!isCurrent()) return;
        setPageState({ page, user, data: r, loading: false });
        if (allowed(user, 'notification.view')) {
            const notices = page === 'notifications' ? r : await api('notifications');
            if (isCurrent()) setNotifications(notices);
        }
    }
    catch (e: any) {
        if (!isCurrent()) return;
        if (e.status === 401) {
            setUser(null);
            setCsrf('');
        }
        else
            setPageState({ page, user, error: e, loading: false });
    } }, [current.page, user]);
    useEffect(() => {
        load();
        // Ignore pending responses after navigation, logout, unmount, and StrictMode cleanup.
        return () => { requestId.current++; };
    }, [load]);
    useEffect(() => { if (!user || user.role === 'Guest' || q.trim().length < 2) {
        setResults([]);
        return;
    } let live = true; const t = setTimeout(() => api('search?q=' + encodeURIComponent(q)).then(r => { if (live)
        setResults(r); }).catch(() => setResults([])), 250); return () => { live = false; clearTimeout(t); }; }, [q, user]);
    async function logout() { try {
        bootstrapVersion.current++;
        await api('auth/logout', 'POST', {});
        setUser(null);
        setCsrf('');
        navigate('dashboard');
    }
    catch (e: any) {
        if (user?.role === 'Guest') throw e;
        notify(e.message);
    } }
    if (!ready)
        return <div className="boot"><div className="brand">LUMINA<span>F A S H I O N</span></div><p>Đang tải LUMINA…</p></div>;
    if (error)
        return <main className="standalone-error"><h1>Không thể kết nối hệ thống</h1><ErrorBox error={error.message}/><button className="btn primary" onClick={() => { setError(null); bootstrap(); }}>Thử lại</button></main>;
    if (!user || user.role === 'Guest')
        return <Storefront user={user} demo={demo} current={current} navigate={navigate} cart={cart} onLogin={bootstrap} onLogout={logout} onProfileSaved={bootstrap} onSessionExpired={()=>{setUser(null);setCsrf('');}}/>;
    const unread = notifications.filter(r => r.read_status === 'Unread').length;
    return <div className={'app-shell ' + (collapsed ? 'sidebar-collapsed' : '')}><aside className={'sidebar ' + (mobile ? 'mobile-open' : '')}><div className="sidebar-brand"><div className="brand">LUMINA<span>F A S H I O N</span></div><button className="icon-btn collapse-btn" aria-label="Thu gọn menu" onClick={() => setCollapsed(!collapsed)}><ChevronsLeft size={17}/></button><button className="icon-btn mobile-close" aria-label="Đóng menu" onClick={() => setMobile(false)}><X size={18}/></button></div><div className="workspace-label"><span className="workspace-icon">L</span><div><strong>Company workspace</strong><small>Lumina Fashion Co.</small></div><ChevronDown size={13}/></div><nav className="sidebar-nav">{sections.filter(section => section.items.some((item: any) => !item[3] || allowed(user, item[3]))).map(section => <div className="nav-section" key={section.label}>{section.label && <span className="nav-label">{section.label}</span>}{section.items.filter((item: any) => !item[3] || allowed(user, item[3])).map(([key, label, Icon]: any) => <button key={key} title={label} className={current.page === key ? 'active' : ''} onClick={() => navigate(key)}><Icon size={17}/><span>{label}</span>{key === 'cart' && cartCount(cart.items) > 0 && <b className="nav-count">{cartCount(cart.items)}</b>}{key === 'notifications' && unread > 0 && <b className="nav-count">{unread}</b>}{current.page === key && <span className="active-dot"/>}</button>)}</div>)}</nav><div className="sidebar-bottom"><div className="workspace-note"><span className="status-dot"/><span>Workspace hoạt động</span><small>v1.0</small></div><button className={'profile-nav ' + (current.page === 'profile' ? 'active' : '')} onClick={() => navigate('profile')}><span className="avatar">{user.avatar ? <img src={user.avatar} alt=""/> : user.name.split(' ').slice(-2).map((v: string) => v[0]).join('')}</span><div><strong>{user.name}</strong><small>{user.role}</small></div><ChevronDown size={14}/></button><button className="logout" onClick={logout}><LogOut size={16}/><span>Đăng xuất</span></button></div></aside>{mobile && <div className="sidebar-shade" onClick={() => setMobile(false)}/>}<div className="main-wrap"><header className="navbar"><div className="navbar-left"><button className="icon-btn mobile-menu" aria-label="Mở menu" onClick={() => setMobile(true)}><Menu size={19}/></button><span className="breadcrumb">Workspace <span>/</span> <strong>{titles[current.page] || 'Unknown'}</strong></span></div><div className="navbar-actions"><div className="global-search"><Search size={16}/><input aria-label="Tìm toàn hệ thống" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm kiếm trong workspace…"/><span className="search-key"><Command size={10}/> K</span>{q.length >= 2 && <div className="search-results">{results.length ? results.map(r => <button key={r.type + r.id} onClick={() => navigate(r.type, r.id)}><div><strong>{r.name}</strong><small>{titles[r.type]}</small></div><ArrowUpRight size={14}/></button>) : <p>Không có kết quả phù hợp.</p>}</div>}</div><button className="cart-nav-btn icon-btn" title="Giỏ hàng" aria-label={'Giỏ hàng, ' + cartCount(cart.items) + ' sản phẩm'} onClick={() => navigate('cart')}><ShoppingCart size={19}/>{cartCount(cart.items) > 0 && <span className="cart-count">{cartCount(cart.items)}</span>}</button><button className="notification-btn icon-btn" title="Thông báo" onClick={() => navigate('notifications')}><Bell size={19}/>{unread > 0 && <span />}</button><div className="navbar-divider"/><button className="navbar-profile" onClick={() => navigate('profile')}><span className="avatar small-avatar">{user.avatar ? <img src={user.avatar} alt=""/> : user.name.split(' ').slice(-2).map((v: string) => v[0]).join('')}</span><div><strong>{user.name}</strong><small>{user.role}</small></div><ChevronDown size={13}/></button></div></header><main className="page-content">{pageError ? <div className="page-error"><div className="error-code">{pageError.status || 500}</div><h1>{pageError.status === 403 ? 'Access Denied' : pageError.status === 404 ? 'Page Not Found' : 'Internal Server Error'}</h1><p>{pageError.message}</p><button className="btn primary" onClick={() => { if (current.page === 'dashboard') load(); else navigate('dashboard'); }}><ArrowLeft size={15}/>Back to Dashboard</button></div> : loading ? <div className="loading-state"><span /><p>Đang cập nhật workspace…</p></div> : <>{current.page === 'dashboard' && <Dashboard data={data} user={user} onNavigate={navigate} onOrder={() => setCreate(true)}/>} {current.page in entities && Array.isArray(data) && <EntityPage key={current.page} entity={current.page as Entity} rows={data} user={user} onReload={load} notify={notify} initialDetail={current.id} onShop={setShopProduct}/>} {current.page === 'inventory' && Array.isArray(data) && <InventoryPage rows={data} user={user} reload={load} notify={notify}/>} {current.page === 'orders' && Array.isArray(data) && <OrdersPage rows={data} user={user} reload={load} notify={notify} initialDetail={current.id}/>} {current.page === 'roles' && data?.roles && <RolesPage data={data} reload={load} notify={notify}/>} {current.page === 'reports' && <ReportsPage notify={notify}/>} {current.page === 'profile' && <ProfilePage user={user} onSaved={bootstrap} notify={notify}/>} {current.page === 'activity' && Array.isArray(data) && <ActivityPage rows={data}/>} {current.page === 'cart' && <CartPage {...cart} navigate={navigate}/>} {current.page === 'my-orders' && Array.isArray(data) && <MyOrdersPage rows={data} initialDetail={current.id} reload={load} navigate={navigate}/>} {current.page === 'shop-policy' && <ShopPolicyPage/>} {current.page === 'checkout' && <CheckoutPage items={cart.items} user={user} navigate={navigate} onPlaced={cart.clear} key={user.id}/>}</>}</main><footer className="app-footer"><span>© 2026 LUMINA FASHION</span><span>Designed for the way you work.</span><span><span className="status-dot"/> {demo ? 'Demo workspace' : 'Internal workspace'}</span></footer></div>{notice && <div className="toast" role="status"><CheckCircle2 size={19}/>{notice}<button onClick={() => setNotice('')} aria-label="Đóng"><X size={14}/></button></div>}{shopProduct && <AddToCart key={shopProduct} productId={shopProduct} items={cart.items} onClose={() => setShopProduct(undefined)} onAdd={item => { cart.add(item); notify('Đã thêm sản phẩm vào giỏ hàng.'); }}/>} {create && <CreateOrder onClose={() => setCreate(false)} onSaved={() => { load(); notify('Đã tạo đơn hàng.'); }}/>}</div>;
}

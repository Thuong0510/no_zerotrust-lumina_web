'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, SlidersHorizontal, MoreHorizontal, Eye, Pencil, Trash2, Download, Upload, ChevronDown, Check, LockKeyhole, ShoppingCart } from 'lucide-react';
import { entities, Entity, labels } from '../../../../shared/entities';
import { api, money, date, downloadCSV } from '../../lib/client';
import { Badge, PageTitle, Table, Pager, Modal, ErrorBox, ProductArt, DetailGrid } from './ui';
const manage: Record<string, string> = { categories: 'category.manage', suppliers: 'supplier.manage', customers: 'customer.manage', employees: 'employee.manage', users: 'user.manage', notifications: 'notification.manage' };
export function allowed(user: any, p: string) { const adminOnly=['employee.view','employee.manage','user.manage','role.manage','report.view','activity.view','supplier.view','supplier.manage','category.manage','customer.manage','notification.manage'];
    return user.role === 'Admin' || (!adminOnly.includes(p) && (user.role !== 'Guest' || ['product.view','notification.view'].includes(p)) && user.permissions.includes(p)); }
export function useList(rows: any[], search: string, filter: string, sort: {
    key: string;
    asc: boolean;
}) { return useMemo(() => rows.filter(r => (filter === 'All' || r.status === filter || r.read_status === filter || r.department === filter) && Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search.toLowerCase()))).sort((a, b) => { const x = a[sort.key] ?? '', y = b[sort.key] ?? ''; return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * (sort.asc ? 1 : -1); }), [rows, search, filter, sort]); }
export function EntityForm({ entity, row, onClose, onSaved }: {
    entity: Entity;
    row: any;
    onClose: () => void;
    onSaved: () => void;
}) { const config = entities[entity], [error, setError] = useState(''), [busy, setBusy] = useState(false), [refs, setRefs] = useState<any>({}), [images, setImages] = useState<Record<string, string>>({}); useEffect(() => { const refs = Object.values(config.fields).filter(v => v.startsWith('ref:')).map(v => v.split(':')[1].replace('!', '')); Promise.all(refs.map(async (key) => [key, await api(key)])).then(p => setRefs(Object.fromEntries(p))).catch(e => setError(e.message)); }, [entity]); async function upload(key: string, file?: File) { if (!file)
    return; try {
    const form = new FormData();
    form.append('file', file);
    const r = await api('upload', 'POST', form);
    setImages(v => ({ ...v, [key]: r.url }));
}
catch (e: any) {
    setError(e.message);
} } async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); setError(''); const d = { ...Object.fromEntries(new FormData(e.currentTarget)), ...images }; try {
    await api(entity + (row ? '/' + row.id : ''), row ? 'PUT' : 'POST', d);
    onSaved();
    onClose();
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} } return <Modal title={(row ? 'Chỉnh sửa ' : 'Thêm ') + config.subtitle.toLowerCase()} subtitle="Thông tin được kiểm tra và lưu trực tiếp vào hệ thống." onClose={onClose}><form onSubmit={submit}><ErrorBox error={error}/><div className="form-grid">{Object.entries(config.fields).map(([key, spec]) => <label key={key} className={['description', 'message', 'address'].includes(key) ? 'span-2' : ''}>{labels[key] || key}{spec.includes('!') && <span className="required"> *</span>}{spec.startsWith('ref:') ? <select required={spec.includes('!')} name={key} defaultValue={row?.[key] || ''}><option value="">Chọn {labels[key]?.toLowerCase()}</option>{(refs[spec.split(':')[1].replace('!', '')] || []).map((r: any) => <option value={r.id} key={r.id}>{r.name}</option>)}</select> : spec.includes('|') ? <select name={key} defaultValue={row?.[key] || spec.split('|')[0]}>{spec.split('|').map(v => <option key={v}>{v}</option>)}</select> : spec.startsWith('textarea') ? <textarea name={key} required={spec.includes('!')} defaultValue={row?.[key] || ''} rows={3}/> : spec === 'image' ? <div className="upload-field"><input type="hidden" name={key} value={images[key] ?? row?.[key] ?? ''}/><input type="file" accept="image/png,image/jpeg" onChange={e => upload(key, e.target.files?.[0])}/>{(images[key] || row?.[key]) && <img src={images[key] || row[key]} alt="Ảnh đã tải"/>}<small>PNG/JPEG · Tối đa 2 MB</small></div> : <input name={key} type={spec.replace('!', '')} required={spec.includes('!') || (key === 'password' && !row)} defaultValue={key === 'password' ? '' : row?.[key] ?? ''} min={spec.startsWith('number') ? 0 : undefined} minLength={key === 'password' ? 8 : undefined} maxLength={key === 'password' ? 128 : undefined} step={spec.startsWith('number') ? '1' : undefined}/>}</label>)}</div><footer className="modal-footer"><button type="button" className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thông tin'}<Check size={15}/></button></footer></form></Modal>; }
export function EntityDetail({ entity, id, onClose, user, onSaved, onShop }: {
    entity: Entity;
    id: number;
    onClose: () => void;
    user: any;
    onSaved: () => void;
    onShop?: (id: number) => void;
}) { const [data, setData] = useState<any>(null), [error, setError] = useState(''), [adding, setAdding] = useState(false), [busy, setBusy] = useState(false); const load = () => api(entity + '/' + id).then(setData).catch(e => setError(e.message)); useEffect(() => { load(); }, [entity, id]); async function addVariant(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setBusy(true); try {
    await api('products/' + id + '/variants', 'POST', Object.fromEntries(new FormData(e.currentTarget)));
    setAdding(false);
    load();
    onSaved();
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} } return <Modal title={data?.name || data?.title || 'Chi tiết'} subtitle={entities[entity].subtitle + ' · #' + id} onClose={onClose} wide><ErrorBox error={error}/>{data && <><div className="detail-head">{entity === 'products' && <ProductArt category={data.category_id} image={data.image} name={data.name}/>}<DetailGrid data={data}/></div>{entity === 'products' && onShop && <button className="btn primary detail-shop" disabled={data.status !== 'Active'} onClick={() => { onClose(); onShop(data.id); }}><ShoppingCart size={16}/>Thêm vào giỏ hàng</button>}{data.variants && <><div className="section-title"><h3>Biến thể sản phẩm</h3>{allowed(user, 'product.edit') && <button className="btn small-btn" onClick={() => setAdding(!adding)}><Plus size={14}/>Thêm biến thể</button>}</div><Table rows={data.variants} columns={[{ key: 'sku', label: 'SKU' }, { key: 'size', label: 'Size' }, { key: 'color', label: 'Màu' }, ...(user.role === 'Guest' ? [{ key: 'available', label: 'Còn hàng', render: (v: any) => v.available ? 'Còn hàng' : 'Hết hàng' }] : [{ key: 'quantity', label: 'Tồn kho' }])]}/>{adding && <form onSubmit={addVariant} className="variant-form"><div className="form-grid">{['sku', 'size', 'color', 'quantity'].map(key => <label key={key}>{key}<input name={key} required type={key === 'quantity' ? 'number' : 'text'} min={0} defaultValue={key === 'quantity' ? 0 : ''}/></label>)}</div><button className="btn primary" disabled={busy}>Lưu biến thể</button></form>}</>}{data.orders && <><h3 className="section-title">Lịch sử đơn hàng</h3><Table rows={data.orders} columns={[{ key: 'code', label: 'Mã đơn' }, { key: 'total', label: 'Giá trị', render: r => money(r.total) }, { key: 'status', label: 'Trạng thái', render: r => <Badge>{r.status}</Badge> }, { key: 'created_at', label: 'Ngày', render: r => date(r.created_at) }]}/></>}{data.products && <><h3 className="section-title">Sản phẩm cung cấp</h3><Table rows={data.products} columns={[{ key: 'name', label: 'Sản phẩm' }, { key: 'sku', label: 'SKU' }, { key: 'status', label: 'Trạng thái', render: r => <Badge>{r.status}</Badge> }]}/></>}</>}</Modal>; }
export default function EntityPage({ entity, rows, user, onReload, notify, initialDetail, onShop }: {
    entity: Entity;
    rows: any[];
    user: any;
    onReload: () => void;
    notify: (s: string) => void;
    initialDetail?: number;
    onShop?: (id: number) => void;
}) {
    const [search, setSearch] = useState(''), [filter, setFilter] = useState('All'), [sort, setSort] = useState({ key: 'id', asc: false }), [page, setPage] = useState(1), [form, setForm] = useState<any>(undefined), [detail, setDetail] = useState<number | undefined>(initialDetail), [remove, setRemove] = useState<any>(null), [error, setError] = useState('');
    const [removalMode, setRemovalMode] = useState<'delete' | 'lock'>('delete'), [actionBusy, setActionBusy] = useState(false);
    useEffect(() => { setDetail(initialDetail); }, [initialDetail]);
    useEffect(() => setPage(1), [search, filter, rows.length]);
    const [shopCategory,setShopCategory]=useState(''),[minPrice,setMinPrice]=useState(''),[maxPrice,setMaxPrice]=useState(''),[inStock,setInStock]=useState(false);
    useEffect(()=>setPage(1),[shopCategory,minPrice,maxPrice,inStock]);
    const config = entities[entity], searched = useList(rows, search, filter, sort);
    const filtered = entity==='products' ? searched.filter(r=>(!shopCategory||r.category===shopCategory)&&(!minPrice||r.price>=Number(minPrice))&&(!maxPrice||r.price<=Number(maxPrice))&&(!inStock||r.available)) : searched;
    const canCreate = allowed(user, entity === 'products' ? 'product.create' : manage[entity]), canEdit = allowed(user, entity === 'products' ? 'product.edit' : manage[entity]), canDelete = allowed(user, entity === 'products' ? 'product.delete' : manage[entity]);
    const cols: any[] = [];
    if (entity === 'products') {
        cols.push({ key: 'name', label: 'Sản phẩm', render: (r: any) => <button className="product-cell" onClick={() => setDetail(r.id)}><ProductArt category={r.category_id} image={r.image} small/><div><strong>{r.name}</strong><small>#{String(r.id).padStart(4, '0')} · {r.sku}</small></div></button> }, { key: 'category', label: 'Danh mục' }, { key: 'price', label: 'Giá bán', render: (r: any) => money(r.price) });
        if (user.role !== 'Guest')
            cols.push({ key: 'stock', label: 'Tồn kho', render: (r: any) => <span className={r.stock <= 10 ? 'stock-warning' : ''}>{r.stock} <small>items</small></span> });
        cols.push({ key: 'status', label: 'Trạng thái', render: (r: any) => <Badge>{r.status}</Badge> });
    }
    else if (entity === 'customers') {
        cols.push({ key: 'name', label: 'Khách hàng', render: (r: any) => <div className="person-cell"><span className="mini-avatar">{String(r.name ?? '').slice(-1)}</span><div><strong>{r.name}</strong><small>KH-{String(r.id).padStart(3, '0')}</small></div></div> }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Điện thoại' }, { key: 'total_orders', label: 'Đơn hàng' }, { key: 'total_spending', label: 'Tổng chi tiêu', render: (r: any) => money(r.total_spending) });
    }
    else if (entity === 'employees') {
        cols.push({ key: 'name', label: 'Nhân viên', render: (r: any) => <div className="person-cell">{r.avatar ? <img className="mini-avatar" src={r.avatar} alt=""/> : <span className="mini-avatar">{String(r.name ?? '').slice(-1)}</span>}<div><strong>{r.name}</strong><small>EMP-{String(r.id).padStart(3, '0')}</small></div></div> }, { key: 'email', label: 'Email' }, { key: 'department', label: 'Phòng ban' }, { key: 'position', label: 'Chức vụ' }, { key: 'status', label: 'Trạng thái', render: (r: any) => <Badge>{r.status}</Badge> });
    }
    else if (entity === 'users') {
        cols.push({ key: 'name', label: 'Họ và tên' }, { key: 'username', label: 'Username', render: (r: any) => <strong>{r.username}</strong> }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Số điện thoại' }, { key: 'created_at', label: 'Ngày đăng ký', render: (r: any) => date(r.created_at) }, { key: 'employee', label: 'Nhân viên' }, { key: 'role', label: 'Vai trò', render: (r: any) => <Badge>{r.role}</Badge> }, { key: 'status', label: 'Trạng thái', render: (r: any) => <Badge>{r.status}</Badge> }, { key: 'last_login', label: 'Đăng nhập cuối', render: (r: any) => date(r.last_login) });
    }
    else if (entity === 'notifications') {
        cols.push({ key: 'title', label: 'Thông báo', render: (r: any) => <div><strong>{r.title}</strong><small>{String(r.message ?? '').slice(0, 80)}</small></div> }, { key: 'audience', label: 'Người nhận' }, { key: 'created_at', label: 'Ngày', render: (r: any) => date(r.created_at) }, { key: 'read_status', label: 'Trạng thái', render: (r: any) => <Badge>{r.read_status}</Badge> });
    }
    else {
        Object.keys(config.fields).filter(k => !['description', 'address', 'image', 'avatar'].includes(k)).slice(0, 6).forEach(key => cols.push({ key, label: labels[key] || key, ...(key === 'status' ? { render: (r: any) => <Badge>{r.status}</Badge> } : {}) }));
    }
    async function updateUserStatus(row: any, status: 'Active' | 'Locked') {
        await api('users/' + row.id, 'PUT', {
            name: row.name, username: row.username, email: row.email, phone: row.phone,
            employee_id: row.employee_id, role: row.role, status,
        });
    }
    async function approveUser(row: any) {
        setActionBusy(true); setError('');
        try {
            await updateUserStatus(row, 'Active');
            notify('Đã duyệt tài khoản.'); onReload();
        } catch (e: any) { setError(e.message); }
        finally { setActionBusy(false); }
    }
    async function deleteRow() {
        setActionBusy(true); setError('');
        try {
            if (entity === 'users' && removalMode === 'lock') {
                await updateUserStatus(remove, 'Locked');
                notify('Đã khóa tài khoản.');
            } else {
                await api(entity + '/' + remove.id, 'DELETE');
                notify(entity === 'users' ? 'Đã xóa tài khoản. Email và username có thể đăng ký lại.' : entity === 'employees' ? 'Đã vô hiệu hóa bản ghi.' : 'Đã xóa bản ghi.');
            }
            setRemove(null); onReload();
        } catch (e: any) { setError(e.message); }
        finally { setActionBusy(false); }
    }
    return <><PageTitle eyebrow="MANAGEMENT / LUMINA" title={config.title} subtitle={config.subtitle + ' · Tổ chức dữ liệu, vận hành liền mạch.'}>{user.role !== 'Guest' && <button className="btn" onClick={() => downloadCSV(filtered, entity)}><Download size={15}/>Xuất CSV</button>}{canCreate && <button className="btn primary" onClick={() => setForm(null)}><Plus size={16}/>Thêm {config.subtitle.toLowerCase()}</button>}</PageTitle><ErrorBox error={error}/><section className="panel list-panel">{entity === 'products' && <div className="shop-filters"><label>Danh mục<select aria-label="Lọc danh mục" value={shopCategory} onChange={e=>setShopCategory(e.target.value)}><option value="">Tất cả</option>{Array.from(new Set(rows.map(r=>r.category))).filter(Boolean).map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Giá từ<input aria-label="Giá từ" type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/></label><label>Giá đến<input aria-label="Giá đến" type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label><label className="checkbox"><input type="checkbox" checked={inStock} onChange={e=>setInStock(e.target.checked)}/>Còn hàng</label></div>}<div className="list-toolbar"><div className="list-tab">Tất cả {config.subtitle.toLowerCase()} <span className="count-pill">{rows.length}</span></div><div className="toolbar-controls"><div className="search-input"><Search size={15}/><input aria-label="Tìm kiếm" placeholder={'Tìm ' + config.subtitle.toLowerCase() + '…'} value={search} onChange={e => setSearch(e.target.value)}/></div>{rows.some(r => r.status || r.read_status) && <select aria-label="Lọc trạng thái" value={filter} onChange={e => setFilter(e.target.value)}><option value="All">Tất cả trạng thái</option>{Array.from(new Set(rows.map(r => r.status || r.read_status))).filter(Boolean).map((v: any) => <option key={v}>{v}</option>)}</select>}</div></div><Table rows={filtered.slice((page - 1) * 8, page * 8)} columns={cols} onSort={key => setSort({ key, asc: sort.key === key ? !sort.asc : true })} actions={r => <>{entity === 'products' && onShop && <button className="icon-btn" title="Thêm vào giỏ hàng" aria-label={'Thêm ' + r.name + ' vào giỏ hàng'} disabled={r.status !== 'Active'} onClick={() => onShop(r.id)}><ShoppingCart size={16}/></button>}<button className="icon-btn" title="Xem chi tiết" onClick={() => setDetail(r.id)}><Eye size={15}/></button>{entity === 'notifications' && r.read_status === 'Unread' && <button className="icon-btn" title="Đánh dấu đã đọc" onClick={async () => { try {
        await api('notifications/' + r.id + '/read', 'POST', {});
        onReload();
    }
    catch (e: any) {
        setError(e.message);
    } }}><Check size={15}/></button>}{canEdit && <button className="icon-btn" title="Chỉnh sửa" onClick={() => setForm(r)}><Pencil size={14}/></button>}{entity === 'users' && canEdit && r.status === 'Pending' && <button className="icon-btn" title="Duyệt tài khoản" aria-label={'Duyệt tài khoản ' + r.username} disabled={actionBusy} onClick={() => approveUser(r)}><Check size={15}/></button>}{entity === 'users' && canEdit && !['Locked', 'Disabled'].includes(r.status) && <button className="icon-btn danger" title="Khóa tài khoản" aria-label={'Khóa tài khoản ' + r.username} disabled={actionBusy || r.id === user.id} onClick={() => { setError(''); setRemovalMode('lock'); setRemove(r); }}><LockKeyhole size={14}/></button>}{canDelete && <button className="icon-btn danger" title={entity === 'users' ? 'Xóa tài khoản' : entity === 'employees' ? 'Vô hiệu hóa' : 'Xóa'} aria-label={entity === 'users' ? 'Xóa tài khoản ' + r.username : undefined} disabled={actionBusy || (entity === 'users' && r.id === user.id)} onClick={() => { setError(''); setRemovalMode('delete'); setRemove(r); }}>{entity === 'employees' ? <LockKeyhole size={14}/> : <Trash2 size={14}/>}</button>}</>}/><Pager page={page} total={filtered.length} setPage={setPage}/></section>{form !== undefined && <EntityForm entity={entity} row={form} onClose={() => setForm(undefined)} onSaved={() => { notify('Đã lưu thông tin.'); onReload(); }}/>}{detail && <EntityDetail entity={entity} id={detail} user={user} onClose={() => setDetail(undefined)} onSaved={onReload} onShop={onShop}/>} {remove && <Modal title={entity === 'users' ? (removalMode === 'lock' ? 'Khóa tài khoản?' : 'Xóa tài khoản?') : entity === 'employees' ? 'Vô hiệu hóa bản ghi?' : 'Xóa bản ghi?'} onClose={() => { if (!actionBusy) setRemove(null); }}><ErrorBox error={error}/><p className="confirm-copy"><strong>{remove.name || remove.username || remove.title}</strong>{entity === 'users' ? (removalMode === 'lock' ? ' sẽ bị khóa và kết thúc các phiên đăng nhập. Email và username vẫn được giữ cho tài khoản này.' : ' sẽ bị xóa khỏi danh sách tài khoản và kết thúc các phiên đăng nhập. Email và username có thể dùng để đăng ký tài khoản mới chờ duyệt. Lịch sử đơn hàng và hoạt động cũ vẫn được giữ. Thao tác này không thể hoàn tác trong giao diện.') : entity === 'employees' ? ' sẽ được vô hiệu hóa.' : ' sẽ được xóa khỏi hệ thống. Dữ liệu đang được sử dụng sẽ được bảo vệ bởi ràng buộc database.'}</p><div className="modal-footer"><button className="btn" disabled={actionBusy} onClick={() => setRemove(null)}>Hủy</button><button className="btn danger-btn" disabled={actionBusy} onClick={deleteRow}>{actionBusy ? 'Đang xử lý…' : entity === 'users' ? (removalMode === 'lock' ? 'Khóa tài khoản' : 'Xóa tài khoản') : 'Xác nhận'}</button></div></Modal>}</>;
}

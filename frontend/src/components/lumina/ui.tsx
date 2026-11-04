'use client';
import { useEffect, useRef } from 'react';
import { X, ArrowUpRight, ChevronLeft, ChevronRight, Search, ArrowUpDown, Package, Shirt, ShoppingBag, Footprints } from 'lucide-react';
import { money, date } from '../../lib/client';
export function Badge({ children }: {
    children: any;
}) { return <span className={'badge ' + (/Completed|Active|Paid|In Stock|Read|Confirmed/.test(String(children)) ? 'green' : /Low Stock|Pending|Processing|Unpaid|Unread/.test(String(children)) ? 'amber' : /Cancelled|Disabled|Locked|Out of Stock|Inactive/.test(String(children)) ? 'red' : 'neutral')}>{children}</span>; }
export function ProductArt({ category = 1, name = '', image, small = false }: {
    category?: number;
    name?: string;
    image?: string;
    small?: boolean;
}) { if (image)
    return <div className={'product-art ' + (small ? 'small' : '')}><img src={image} alt={name}/></div>; return <div className={'product-art art-' + category + ' ' + (small ? 'small' : '')}><svg viewBox="0 0 100 100" aria-label={name} role="img">{category === 1 ? <><path d="M31 17 16 28 8 45 25 53 29 40 29 86 72 86 72 40 76 53 93 45 85 28 69 17 59 22 42 22Z" fill="currentColor"/><path d="M42 22q8 12 17 0M31 32v48M68 32v48" fill="none" stroke="#ffffff50" strokeWidth="2"/></> : category === 2 ? <><path d="M29 12h42l5 74H55l-5-43-6 43H24z" fill="currentColor"/><path d="M30 25h39M50 15v29M34 26l-4 12M66 26l4 12" stroke="#ffffff60" fill="none" strokeWidth="2"/></> : category === 3 ? <><path d="m40 10-10 8 8 22-20 48h64L62 40l8-22-10-8-10 13z" fill="currentColor"/><path d="M38 40h24M30 79h40" stroke="#ffffff70" fill="none" strokeWidth="2"/></> : category === 4 ? <><path d="m21 39 12 15 20 3 6-20 10 5 3 14 17 13-3 14H12L8 67z" fill="currentColor"/><path d="M12 76h75M55 53l16 5M53 61l13 5" stroke="#fff9" fill="none" strokeWidth="3"/></> : category === 5 ? <><path d="M22 38h56l6 49H16z" fill="currentColor"/><path d="M34 40V27c0-19 32-19 32 0v13" stroke="currentColor" strokeWidth="6" fill="none"/><rect x="45" y="50" width="10" height="8" rx="2" fill="#d8bd86"/></> : <><path d="M21 62c-2-44 56-44 58 0z" fill="currentColor"/><path d="M21 62h58l15 13H37z" fill="currentColor" opacity=".75"/><path d="M49 25v32" stroke="#ffffff50" strokeWidth="2"/></>}</svg></div>; }
export function Modal({ title, subtitle, children, onClose, wide = false }: {
    title: string;
    subtitle?: string;
    children: any;
    onClose: () => void;
    wide?: boolean;
}) { const ref = useRef<HTMLDivElement>(null); useEffect(() => { const old = document.activeElement as HTMLElement; ref.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
    onClose(); if (e.key === 'Tab') {
    const elements = ref.current?.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]');
    if (!elements?.length)
        return;
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
} }; document.addEventListener('keydown', key); return () => { document.removeEventListener('keydown', key); old?.focus(); }; }, [onClose]); return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={'modal ' + (wide ? 'wide' : '')}><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={20}/></button></header>{children}</div></div>; }
export function ErrorBox({ error }: {
    error?: string;
}) { return error ? <div role="alert" className="error-box">{error}</div> : null; }
export function Empty({ text = 'Chưa có dữ liệu', hint = 'Thử thay đổi bộ lọc hoặc thêm bản ghi mới.' }: {
    text?: string;
    hint?: string;
}) { return <div className="empty"><Package size={32}/><h3>{text}</h3><p>{hint}</p></div>; }
export function PageTitle({ eyebrow, title, subtitle, children }: {
    eyebrow?: string;
    title: string;
    subtitle: string;
    children?: any;
}) { return <div className="page-title"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{subtitle}</p></div><div className="title-actions">{children}</div></div>; }
export function Metric({ title, value, icon: Icon, note }: {
    title: string;
    value: any;
    icon: any;
    note?: string;
}) { return <div className="metric"><div><span>{title}</span><Icon size={18}/></div><strong>{value}</strong><small>{note || 'Dữ liệu cập nhật từ hệ thống'}</small></div>; }
export function Table({ rows, columns, actions, onSort }: {
    rows: any[];
    columns: {
        key: string;
        label: string;
        render?: (r: any) => any;
    }[];
    actions?: (r: any) => any;
    onSort?: (key: string) => void;
}) { return <div className="table-scroll"><table><thead><tr>{columns.map(c => <th key={c.key}>{onSort ? <button onClick={() => onSort(c.key)}>{c.label}<ArrowUpDown size={11}/></button> : c.label}</th>)}{actions && <th className="align-right">Thao tác</th>}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id ?? i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}{actions && <td><div className="row-actions">{actions(r)}</div></td>}</tr>)}</tbody></table>{!rows.length && <Empty />}</div>; }
export function Pager({ page, total, size = 8, setPage }: {
    page: number;
    total: number;
    size?: number;
    setPage: (v: number) => void;
}) { return <footer className="pager"><span>Hiển thị {total ? ((page - 1) * size + 1) : 0}–{Math.min(page * size, total)} / {total} kết quả</span><div><button disabled={page === 1} className="icon-btn" aria-label="Trang trước" onClick={() => setPage(page - 1)}><ChevronLeft size={16}/></button><span className="page-number">{page}</span><button disabled={page * size >= total} className="icon-btn" aria-label="Trang sau" onClick={() => setPage(page + 1)}><ChevronRight size={16}/></button></div></footer>; }
export function DetailGrid({ data, keys }: {
    data: any;
    keys?: string[];
}) { return <dl className="detail-grid">{(keys || Object.keys(data).filter(k => !['id', 'image', 'avatar', 'variants', 'orders', 'products', 'items'].includes(k) && !Array.isArray(data[k]))).map(k => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{/price|cost|total|spending/.test(k) ? money(data[k]) : /created_at|updated_at|last_login/.test(k) ? date(data[k]) : data[k] ?? '—'}</dd></div>)}</dl>; }

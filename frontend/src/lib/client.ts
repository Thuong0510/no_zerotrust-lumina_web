let csrfToken = '';
export const setCsrf = (v: string) => { csrfToken = v; };
export class APIError extends Error {
    constructor(public status: number, message: string, public code?: string, public requestId?: string) { super(message); }
}
export async function api(path: string, method = 'GET', data?: any): Promise<any> {
    if (!/^[a-z0-9-]+(?:\/[^?#]*)?(?:\?[^#]*)?$/.test(path) || /(?:^|\/)\.\.(?:\/|$)|[\\\r\n]/.test(path)) throw new APIError(400, 'Đường dẫn API không hợp lệ.');
    const form = data instanceof FormData;
    let response: Response;
    try {
        response = await fetch('/api/' + path, {
            method, credentials: 'same-origin', redirect: 'manual', cache: 'no-store',
            headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': csrfToken }) },
            body: data === undefined ? undefined : form ? data : JSON.stringify(data)
        });
    } catch (error) {
        throw new APIError(0, error instanceof Error && error.message ? error.message : 'Không thể kết nối. Kiểm tra mạng rồi thử lại.', 'NETWORK_ERROR');
    }
    if (response.type === 'opaqueredirect' || response.redirected || (response.status >= 300 && response.status < 400)) {
        throw new APIError(502, 'Phản hồi chuyển hướng từ API không hợp lệ.', 'API_INVALID_RESPONSE');
    }
    let body: any;
    try { body = await response.json(); }
    catch { throw new APIError(502, 'Phản hồi từ máy chủ không hợp lệ.', 'API_INVALID_RESPONSE'); }
    if (!response.ok) throw new APIError(response.status, body?.error || 'Có lỗi xảy ra.', body?.code, body?.requestId || response.headers?.get('X-Request-ID'));
    return body;
}
export const money = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v || 0);
export const date = (s: string) => s ? new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').toLocaleDateString('vi-VN') : '—';
export function downloadCSV(rows: any[], name: string) { if (!rows.length)
    return; const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object'); const esc = (v: any) => '"' + String(v ?? '').replace(/^(?:[\s]*[=+@-]|[\t\r\n])/, "'$&").replace(/"/g, '""') + '"'; const text = '\uFEFF' + [keys.map(esc).join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' })); a.download = name + '.csv'; a.click(); URL.revokeObjectURL(a.href); }

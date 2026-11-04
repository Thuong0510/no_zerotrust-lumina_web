import {transaction} from '../models/database.js';
import * as securityModel from '../models/securityModel.js';
import { requiredApiPermission } from '../config/accessPolicy.js';
import { sessionToken } from './sessionToken.js';
export class AppError extends Error {
    constructor(public status: number, message: string, public code?: string) { super(message); }
}

export function assertRequestAccess(req: Request, user: any) {
    const permission = requiredApiPermission(req.method, new URL(req.url).pathname);
    if (permission) authorize(user, permission);
}
export { db, one, all, run, stmt } from '../models/database.js';
import { db, one, all, run, stmt } from '../models/database.js';
export const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), v => v.toString(16).padStart(2, '0')).join('');
export const digest = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), v => v.toString(16).padStart(2, '0')).join('');
export async function hashPassword(password: string, salt = random(), iterations = 600000, legacy = false) {
    const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations,hash:'SHA-256'},key,256);
    const value=Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('');
    return legacy ? salt+':'+value : 'pbkdf2_sha256:'+iterations+':'+salt+':'+value;
}
export async function verifyPassword(password: string, stored: string) {
    const parts=stored.split(':');const legacy=parts.length===2;
    const iterations=legacy?100000:Number(parts[1]);const salt=legacy?parts[0]:parts[2];
    if(!/^[a-f0-9]{64}$/.test(salt || '') || (!legacy && parts[0]!=='pbkdf2_sha256') || ![100000,600000].includes(iterations))return false;
    const candidate=await hashPassword(password,salt,iterations,legacy);
    let diff=candidate.length ^ stored.length;
    for(let i=0;i<candidate.length;i++)diff|=candidate.charCodeAt(i)^stored.charCodeAt(i);
    return diff===0;
}
export async function throttle(key: string, max = 15) { return transaction(async()=> { const window = Math.floor(Date.now() / 900000); await securityModel.throttleQuery1(key, window); const row = await securityModel.throttleQuery2(key); if (row.count > max)
    throw new AppError(429, 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.'); }); }
export const ip = (req: Request) => req.headers.get('x-lumina-client-ip') || 'local';
export async function audit(req: Request, user: number | null, action: string, resource: string) { await securityModel.auditQuery1(user, action, resource, ip(req)); }
export async function currentUser(req: Request) { const token = sessionToken(req); if (!token)
    return null; const row = await securityModel.currentUserQuery1(await digest(token), Date.now()); if (!row)
    return null; row.permissions = (await securityModel.currentUserQuery2(row.id)).map((p: any) => p.name); return row; }
export const adminPermissions = ['employee.view','employee.manage','user.manage','role.manage','report.view','activity.view','supplier.view','supplier.manage','category.manage','customer.manage','notification.manage'];
export function authorize(user: any, permission: string) { if (!user)
    throw new AppError(401, 'Vui lòng đăng nhập.'); if (!['Admin','Employee','Guest'].includes(user.role) || (user.role !== 'Admin' && (adminPermissions.includes(permission) || (user.role === 'Guest' && !['product.view','notification.view'].includes(permission)) || !user.permissions.includes(permission))))
    throw new AppError(403, "You don't have permission to access this resource."); }
export function hasPermission(user: any, permission: string) {
    try { authorize(user, permission); return true; }
    catch (error) { if (error instanceof AppError && [401,403].includes(error.status)) return false; throw error; }
}
export function csrf(req: Request, user: any) { const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin)
    throw new AppError(403, 'Yêu cầu không hợp lệ.'); if (user && req.headers.get('x-csrf-token') !== user.csrf)
            throw new AppError(403, 'Phiên xác thực đã thay đổi. Vui lòng tải lại trang.', 'CSRF_INVALID'); }
export async function startSession(req: Request, userId: number, remember: boolean) { const token = random(), csrfToken = random(), maxAge = remember ? 2592000 : 28800; await securityModel.startSessionQuery1(await digest(token), userId, csrfToken, Date.now() + maxAge * 1000); return { token, csrfToken, cookie: `lumina_session=${token}; Path=/; HttpOnly; SameSite=Lax; ${new URL(req.url).protocol === 'https:' ? 'Secure; ' : ''}${remember ? 'Max-Age=' + maxAge + '; ' : ''}` }; }
export const safeUser = (u: any) => { if (!u)
    return null; const { token_hash, ...safe } = u; return safe; };

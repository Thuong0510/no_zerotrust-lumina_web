import * as systemModel from '../models/systemModel.js';
import { env } from '../config/runtime.js';
import { apiPath } from '../config/apiPath.js';
import { updateProfile } from '../services/profileService.js';
import { assertMediaAccess, recordUpload } from '../services/mediaService.js';
import { checkoutQuote, checkoutAddress, placeCheckout, myOrders, cancelMyOrder } from '../services/shoppingService.js';
import { publicProducts, publicMedia, shopPolicy } from '../services/storeService.js';
import { z } from 'zod';
import sharp from 'sharp';
import { entities, Entity } from '../../../shared/entities.js';
import { AppError, currentUser, safeUser, csrf, authorize, hasPermission, one, all, run, db, stmt, audit, random, adminPermissions, assertRequestAccess } from '../middleware/security.js';
import { auth } from '../services/authService.js';
import { listEntity, detailEntity, mutateEntity, variants } from '../services/catalogService.js';
import { inventory, stock, orders, orderDetail, createOrder, updateOrder, editOrderItems, dashboard, reports } from '../services/businessService.js';
import { parse } from '../services/validation.js';
const securityHeaders = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
function response(body: any, status = 200, cookie?: string) { const headers: any = { ...securityHeaders, 'Content-Type': 'application/json' }; if (cookie)
    headers['Set-Cookie'] = cookie; return new Response(JSON.stringify(body), { status, headers }); }
export async function handle(req: Request) {
    try {
        const url = new URL(req.url);
        const path = apiPath(url.pathname);
        if (!path) throw new AppError(404,'Page Not Found');
        const [resource, arg, extra] = path;
        if(path.length>3) throw new AppError(404,'Page Not Found');
        if((Object.hasOwn(entities,resource) || resource==='orders' || resource==='my-orders') && arg && (!/^[1-9][0-9]*$/.test(arg) || !Number.isSafeInteger(Number(arg)) || Number(arg)>2147483647)) throw new AppError(400,'ID không hợp lệ.');
        if(resource==='media' && arg && !/^[a-f0-9]{64}\.(png|jpg)$/.test(arg)) throw new AppError(404,'Không tìm thấy tệp.');
        // Public read-only storefront is separate from all management APIs.
        if(resource==='store') {
            if(req.method!=='GET')throw new AppError(405,'Cửa hàng công khai chỉ hỗ trợ xem thông tin.');
            if(arg==='policy'&&!extra)return response(shopPolicy());
            if(arg==='products') {
                if(extra&&(!/^[1-9][0-9]*$/.test(extra)||!Number.isSafeInteger(Number(extra))||Number(extra)>2147483647))throw new AppError(400,'ID không hợp lệ.');
                return response(await publicProducts(extra?Number(extra):undefined));
            }
            if(arg==='media'&&extra) {
                await publicMedia(extra);
                const obj=await env.BUCKET.get('uploads/'+extra);
                if(!obj)throw new AppError(404,'Không tìm thấy ảnh sản phẩm.');
                return new Response(obj.body,{headers:{...securityHeaders,'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream'}});
            }
            throw new AppError(404,'Không tìm thấy trang cửa hàng.');
        }
        const user = await currentUser(req);
        assertRequestAccess(req, user);
        const method = req.method;
        const write = !['GET', 'HEAD'].includes(method);
        if (write && Number(req.headers.get('content-length') || 0) > 3 * 1024 * 1024)
            throw new AppError(413, 'Tệp quá lớn.');
        if (resource === 'auth' && method === 'POST') {
            const result = await auth(req, arg, await req.json(), user);
            return response(result.body, 200, result.cookie);
        }
        if (!user && resource !== 'bootstrap')
            throw new AppError(401, 'Vui lòng đăng nhập.');
        if (write)
            csrf(req, user);
        if (resource === 'bootstrap' && method === 'GET')
            return response({ user: safeUser(user), demo: env.DEMO_MODE === 'true' });
        if (resource === 'dashboard' && method === 'GET')
            return response(await dashboard(user));
        if (resource === 'shop-policy' && !arg && method === 'GET')
            return response(shopPolicy());
        if (resource === 'checkout' && !extra) {
            if (arg === 'address' && method === 'GET') return response(await checkoutAddress(user));
            if (arg === 'quote' && method === 'POST') return response(await checkoutQuote(user,await req.json()));
            if (!arg && method === 'POST') return response(await placeCheckout(req,user,await req.json()));
        }
        if (resource === 'my-orders') {
            if (method === 'GET' && !extra) return response(await myOrders(user,arg ? Number(arg) : undefined));
            if (method === 'POST' && arg && extra === 'cancel') return response(await cancelMyOrder(req,user,Number(arg)));
        }
        if (resource === 'profile') {
            if (method === 'GET')
                return response(safeUser(user));
            if (method === 'PUT') {
                return response(await updateProfile(req,user,await req.json()));
            }
        }
        if (resource === 'media' && arg && method === 'GET') {
            await assertMediaAccess(user, '/api/media/' + arg);
            const obj = await env.BUCKET.get('uploads/' + arg);
            if (!obj)
                throw new AppError(404, 'Không tìm thấy tệp.');
            return new Response(obj.body, { headers: { ...securityHeaders, 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' } });
        }
        if (resource === 'upload' && method === 'POST') {
            let form: FormData;
            try { form = await req.formData(); }
            catch { throw new AppError(400, 'Dữ liệu multipart không hợp lệ.'); }
            const file = form.get('file');
            if (!(file instanceof File) || file.size > 2 * 1024 * 1024 || file.size === 0)
                throw new AppError(422, 'Ảnh phải nhỏ hơn 2 MB.');
            const bytes = new Uint8Array(await file.arrayBuffer());
            let type = '';
            if (bytes.length >= 45 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && String.fromCharCode(...bytes.slice(-8, -4)) === 'IEND') {
                const view = new DataView(bytes.buffer);
                if (view.getUint32(16) > 0 && view.getUint32(20) > 0 && view.getUint32(16) <= 8000 && view.getUint32(20) <= 8000)
                    type = 'image/png';
            }
            if (bytes.length > 20 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217)
                type = 'image/jpeg';
            if (!type || type !== file.type)
                throw new AppError(422, 'Chỉ chấp nhận PNG/JPEG hợp lệ.');
            const key = random() + '.' + (type === 'image/png' ? 'png' : 'jpg');
            // Decode and re-encode: reject malformed images, strip metadata and trailing payloads.
            let safeBytes: Uint8Array;
            try {
                const image = sharp(bytes, {limitInputPixels: 32000000, failOn:'warning'});
                const metadata = await image.metadata();
                if ((type === 'image/png' && metadata.format !== 'png') || (type === 'image/jpeg' && metadata.format !== 'jpeg')) throw new Error('Invalid image');
                safeBytes = new Uint8Array(await (type === 'image/png' ? image.png() : image.jpeg()).toBuffer());
                if(safeBytes.length > 2*1024*1024) throw new Error('Image too large');
            } catch { throw new AppError(422,'Ảnh PNG/JPEG bị lỗi hoặc quá lớn.'); }
            await env.BUCKET.put('uploads/' + key, safeBytes, { httpMetadata: { contentType: type } });
            await recordUpload(req, user, '/api/media/' + key);
            return response({ url: '/api/media/' + key });
        }
        if (Object.hasOwn(entities, resource)) {
            const entity = resource as Entity;
            const id = arg ? Number(arg) : undefined;
            if (arg && !Number.isInteger(id))
                throw new AppError(400, 'ID không hợp lệ.');
            if (extra === 'variants' && method === 'POST' && entity === 'products')
                return response(await variants(req, id!, user, await req.json()));
            if (extra === 'read' && method === 'POST' && entity === 'notifications') {
                authorize(user, 'notification.view');
                await detailEntity(entity, id!, user);
                await systemModel.handleQuery3(user.id, id);
                return response({ ok: true });
            }
            if (method === 'GET')
                return response(id ? await detailEntity(entity, id, user) : await listEntity(entity, user));
            if (['POST', 'PUT', 'DELETE'].includes(method))
                return response(await mutateEntity(req, entity, id, user, method === 'DELETE' ? {} : await req.json(), method));
        }
        if (resource === 'inventory') {
            if (arg === 'history' && method === 'GET') {
                authorize(user, 'inventory.view');
                return response(await systemModel.handleQuery4());
            }
            if (method === 'GET')
                return response(await inventory(user));
            if (method === 'POST')
                return response(await stock(req, user, await req.json()));
        }
        if (resource === 'orders') {
            if (extra === 'items' && method === 'PUT')
                return response(await editOrderItems(req, user, Number(arg), await req.json()));
            if (method === 'GET')
                return response(arg ? await orderDetail(user, Number(arg)) : await orders(user));
            if (method === 'POST')
                return response(await createOrder(req, user, await req.json()));
            if (method === 'PUT')
                return response(await updateOrder(req, user, Number(arg), await req.json()));
        }
        if (resource === 'roles') {
            authorize(user, 'role.manage');
            if (method === 'GET')
                return response({ roles: await systemModel.handleQuery5(), permissions: await systemModel.handleQuery6(), assignments: await systemModel.handleQuery7() });
            if (method === 'PUT') {
                const d = parse(z.object({ role_id: z.number().int().min(2).max(3), permission_ids: z.array(z.number().int().positive()).max(50) }), await req.json());
                const permissionRows = await systemModel.handleQuery8();
            const allowed = permissionRows.filter((p:any)=>!adminPermissions.includes(p.name) && (d.role_id !== 3 || ['product.view','notification.view'].includes(p.name))).map((p:any)=>p.id);
                if (d.permission_ids.some((id: number) => !allowed.includes(id)))
                    throw new AppError(422, 'Quyền không tồn tại.');
                await db().batch([systemModel.handleQuery9(d.role_id), ...Array.from(new Set<number>(d.permission_ids)).map(id => systemModel.handleQuery10(d.role_id, id))]);
                await audit(req, user.id, 'CHANGE_PERMISSION', 'role:' + d.role_id);
                return response({ ok: true });
            }
        }
        if (resource === 'activity' && method === 'GET') {
            authorize(user, 'activity.view');
            return response(await systemModel.handleQuery11());
        }
        if (resource === 'reports' && method === 'GET')
            return response(await reports(user, url));
        if (resource === 'search' && method === 'GET') {
            const query = (url.searchParams.get('q') || '').slice(0, 80);
            const out: any[] = [];
            if (query.trim()) {
                for (const entity of ['products', 'customers', 'employees'] as Entity[]) {
                    try {
                        authorize(user, ({ products: 'product.view', customers: 'customer.view', employees: 'employee.view' } as any)[entity]);
                        const rows = await systemModel.handleQuery12(entity, entity === 'products' && user.role === 'Guest' ? "AND status='Active'" : '', '%' + query + '%');
                        out.push(...rows.map((r: any) => ({ ...r, type: entity })));
                    }
                    catch (e) {
                        if (!(e instanceof AppError && e.status === 403))
                            throw e;
                    }
                }
                if (hasPermission(user, 'order.view'))
                    out.push(...(await systemModel.handleQuery13('%' + query + '%')).map((r: any) => ({ ...r, type: 'orders' })));
            }
            return response(out);
        }
        throw new AppError(404, 'Page Not Found');
    }
    catch (e: any) {
        if (e instanceof AppError)
            return response({ error: e.message, code: e.code }, e.status);
        if(e instanceof SyntaxError) return response({error:'JSON không hợp lệ.'},400);
        if(e?.code === '42P01' || e?.code === '3F000') return response({error:'Database chưa được khởi tạo. Chạy migration trước khi sử dụng.'},503);
        if(['22P02','22003','22007'].includes(e?.code)) return response({error:'Giá trị dữ liệu không hợp lệ.'},400);
        const message = String(e?.message || '');
        if (e?.code === '23505' || /UNIQUE constraint/i.test(message))
            return response({ error: 'Dữ liệu bị trùng. Kiểm tra email, username, SKU hoặc biến thể.' }, 409);
        if (e?.code === '23503' || /FOREIGN KEY constraint/i.test(message))
            return response({ error: 'Dữ liệu đang được liên kết. Hãy vô hiệu hóa thay vì xóa, hoặc kiểm tra bản ghi tham chiếu.' }, 409);
        if (e?.code === '23514' || /CHECK constraint/i.test(message))
            return response({ error: 'Không đủ tồn kho hoặc số lượng không hợp lệ. Thao tác đã được hoàn tác.' }, 409);
        if(process.env.NODE_ENV==='test')console.error(e.stack);
        console.error('LUMINA request failed', { name: e?.name, code: e?.code });
        return response({ error: 'Internal Server Error. Vui lòng thử lại.' }, 500);
    }
}

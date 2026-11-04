import * as businessModel from '../models/businessModel.js';
import { z } from 'zod';
import { notifyBuyer } from '../models/shoppingModel.js';
import { parse } from './validation.js';
import { AppError, authorize, hasPermission, one, all, run, db, stmt, audit, random } from '../middleware/security.js';
export async function inventory(user: any) { authorize(user, 'inventory.view'); return businessModel.inventoryQuery1(); }
export async function stock(req: Request, user: any, data: any) { authorize(user, 'inventory.edit'); const d = parse(z.object({ variant_id: z.coerce.number().int().positive(), action: z.enum(['Stock In', 'Stock Out', 'Adjustment']), quantity: z.coerce.number().int().min(0).max(100000), note: z.string().min(2).max(500) }), data); if (!await businessModel.stockQuery1(d.variant_id))
    throw new AppError(404, 'Không tìm thấy biến thể.'); if (d.action !== 'Adjustment' && d.quantity === 0)
    throw new AppError(422, 'Số lượng phải lớn hơn 0.'); const delta = d.action === 'Stock Out' ? -d.quantity : d.quantity; await db().batch([businessModel.stockQuery2(d.action, d.action, d.quantity, delta, user.id, d.note, d.variant_id), businessModel.stockQuery3(d.action === 'Adjustment' ? '?' : 'quantity+?', d.action === 'Adjustment' ? d.quantity : delta, d.variant_id)]); await audit(req, user.id, 'INVENTORY_' + d.action.toUpperCase(), 'variant:' + d.variant_id); return { ok: true }; }
export async function orders(user: any) { authorize(user, 'order.view'); return businessModel.ordersQuery1(); }
export async function orderDetail(user: any, id: number) { authorize(user, 'order.view'); const row = await businessModel.orderDetailQuery1(id); if (!row)
    throw new AppError(404, 'Không tìm thấy đơn hàng.'); row.items = await businessModel.orderDetailQuery2(id); return row; }
export async function createOrder(req: Request, user: any, data: any) { authorize(user, 'order.create'); const d = parse(z.object({ customer_id: z.coerce.number().int().positive(), payment_method: z.enum(['Bank Transfer', 'Cash', 'Card']), payment: z.enum(['Paid', 'Unpaid']), items: z.array(z.object({ variant_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).max(10000) })).min(1).max(50) }), data); if (!await businessModel.createOrderQuery1(d.customer_id))
    throw new AppError(422, 'Khách hàng không tồn tại.'); const merged = new Map<number, number>(); for (const item of d.items)
    merged.set(item.variant_id, (merged.get(item.variant_id) || 0) + item.quantity); let total = 0; const items = []; for (const [variant_id, quantity] of merged) {
    const row = await businessModel.createOrderQuery2(variant_id);
    if (!row || row.status !== 'Active' || row.quantity < quantity)
        throw new AppError(409, 'Sản phẩm ngưng bán hoặc không đủ tồn kho.');
    total += row.price * quantity;
    items.push({ variant_id, quantity, price: row.price });
} const code = 'LM-' + Date.now().toString(36).toUpperCase() + '-' + random().slice(0, 4).toUpperCase(); const batch = [businessModel.createOrderQuery3(code, d.customer_id, total, d.payment_method, d.payment, user.id)]; for (const item of items) {
    batch.push(businessModel.createOrderQuery4(item.quantity, item.variant_id));
    batch.push(businessModel.createOrderQuery5(item.variant_id, item.quantity, item.price, code));
    batch.push(businessModel.createOrderQuery6(item.variant_id, -item.quantity, user.id, code));
} batch.push(businessModel.createOrderQuery7('Đơn hàng ' + code + ' đã được tạo.')); await db().batch(batch); await audit(req, user.id, 'CREATE_ORDER', code); return { id: (await businessModel.createOrderQuery8(code)).id, code }; }
const transitions: Record<string, string[]> = { Pending: ['Confirmed', 'Cancelled'], Confirmed: ['Processing', 'Cancelled'], Processing: ['Shipped', 'Cancelled'], Shipped: ['Completed'], Completed: [], Cancelled: [] };
export async function updateOrder(req: Request, user: any, id: number, data: any) {
    authorize(user, 'order.edit');
    const d = parse(z.object({ status: z.enum(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Completed', 'Cancelled']), payment: z.enum(['Paid', 'Unpaid']), payment_method: z.enum(['Bank Transfer', 'Cash', 'Card']) }), data);
    const old = await businessModel.updateOrderQuery1(id);
    if (!old)
        throw new AppError(404, 'Không tìm thấy đơn hàng.');
    if (d.status !== old.status && !transitions[old.status].includes(d.status))
        throw new AppError(422, 'Chuyển trạng thái không hợp lệ.');
    if (['Completed', 'Cancelled'].includes(old.status))
        throw new AppError(422, 'Đơn đã kết thúc, không thể chỉnh sửa.');
    if (d.status === 'Completed' && d.payment !== 'Paid')
        throw new AppError(422, 'Đơn hoàn tất cần thanh toán đầy đủ.');
    const batch = [];
    if (d.status === 'Cancelled') {
        batch.push(businessModel.updateOrderQuery2(user.id, 'Hoàn kho ' + old.code, id, old.status, old.revision));
        batch.push(businessModel.updateOrderQuery3(id, old.status, old.revision, id));
        batch.push(businessModel.updateOrderQuery4(old.code, id, old.status, old.revision));
    }
    batch.push(businessModel.updateOrderQuery5(d.status, d.payment, d.payment_method, id, old.status, old.revision));
    const results = await db().batch(batch);
    if (!results[results.length - 1].meta.changes)
        throw new AppError(409, 'Đơn đã thay đổi, hãy tải lại.');
    await audit(req, user.id, 'UPDATE_ORDER', old.code + ' → ' + d.status);
    if (old.buyer_id && d.status !== old.status) await notifyBuyer(old.buyer_id,'Cập nhật đơn hàng',`Đơn ${old.code}: ${d.status}.`);
    return { ok: true };
}
export async function dashboard(user: any) { if (!user)
    throw new AppError(401, 'Vui lòng đăng nhập.'); const counts: any = { products: (await businessModel.dashboardQuery1()).n }; const categories = await businessModel.dashboardQuery2(); if (!hasPermission(user,'report.view'))
    return { counts, categories, limited: true }; counts.employees = (await businessModel.dashboardQuery3()).n; counts.customers = (await businessModel.dashboardQuery4()).n; counts.orders = (await businessModel.dashboardQuery5()).n; counts.revenue = (await businessModel.dashboardQuery6()).n; counts.low_stock = (await businessModel.dashboardQuery7()).n; const monthly = await businessModel.dashboardQuery8(); const recent = user.role === 'Admin' || user.permissions.includes('order.view') ? await businessModel.dashboardQuery9() : []; const lowStock = user.role === 'Admin' || user.permissions.includes('inventory.view') ? await businessModel.dashboardQuery10() : []; const best = await businessModel.dashboardQuery11(); return { counts, categories, monthly, recent, lowStock, best }; }
export async function reports(user: any, url: URL) { authorize(user, 'report.view'); const from = url.searchParams.get('from') || '2000-01-01', to = url.searchParams.get('to') || '2100-12-31'; if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to)
    throw new AppError(422, 'Khoảng ngày không hợp lệ.'); const sales = await businessModel.reportsQuery1(from, to); const monthly = await businessModel.reportsQuery2(from, to); const products = await businessModel.reportsQuery3(from, to); const customers = await businessModel.reportsQuery4(from, to); return { sales, monthly, products, customers, inventory: await inventory(user) }; }
export async function editOrderItems(req: Request, user: any, id: number, data: any) {
    authorize(user, 'order.edit');
    const d = parse(z.object({ items: z.array(z.object({ variant_id: z.coerce.number().int().positive(), quantity: z.coerce.number().int().min(1).max(10000) })).min(1).max(50) }).strict(), data);
    const old = await businessModel.editOrderItemsQuery1(id);
    if (!old)
        throw new AppError(404, 'Không tìm thấy đơn hàng.');
    if (!['Pending', 'Confirmed'].includes(old.status))
        throw new AppError(422, 'Chỉ sửa sản phẩm khi đơn đang Pending hoặc Confirmed.');
    const previous = await businessModel.editOrderItemsQuery2(id);
    const merged = new Map<number, number>();
    for (const item of d.items)
        merged.set(item.variant_id, (merged.get(item.variant_id) || 0) + item.quantity);
    let total = 0;
    const items = [];
    for (const [variant_id, quantity] of merged) {
        const row = await businessModel.editOrderItemsQuery3(variant_id);
        const reserved = previous.filter((r: any) => r.variant_id === variant_id).reduce((s: number, r: any) => s + r.quantity, 0);
        if (!row || row.status !== 'Active' || row.quantity + reserved < quantity)
            throw new AppError(409, 'Sản phẩm ngưng bán hoặc không đủ tồn kho.');
        total += row.price * quantity;
        items.push({ variant_id, quantity, price: row.price });
    }
    const guard = businessModel.orderRevisionGuard;
    const args = [id, old.revision, old.status];
    const batch = [];
    for (const row of previous) {
        batch.push(businessModel.editOrderItemsQuery4(guard, row.quantity, row.variant_id, ...args));
        batch.push(businessModel.editOrderItemsQuery5(guard, row.variant_id, row.quantity, user.id, 'Sửa đơn: hoàn ' + old.code, ...args));
    }
    batch.push(businessModel.editOrderItemsQuery6(guard, id, ...args));
    for (const row of items) {
        batch.push(businessModel.editOrderItemsQuery7(guard, row.quantity, row.variant_id, ...args));
        batch.push(businessModel.editOrderItemsQuery8(guard, id, row.variant_id, row.quantity, row.price, ...args));
        batch.push(businessModel.editOrderItemsQuery9(guard, row.variant_id, -row.quantity, user.id, 'Sửa đơn: xuất ' + old.code, ...args));
    }
    batch.push(businessModel.editOrderItemsQuery10(total + Number(old.shipping_fee || 0), ...args));
    const results = await db().batch(batch);
    if (!results[results.length - 1].meta.changes)
        throw new AppError(409, 'Đơn đã thay đổi, hãy tải lại.');
    await audit(req, user.id, 'UPDATE_ORDER_ITEMS', old.code);
    if (old.buyer_id) await notifyBuyer(old.buyer_id,'Cập nhật sản phẩm trong đơn',`Đơn ${old.code} đã được cập nhật sản phẩm/số lượng. Tổng tiền: ${total + Number(old.shipping_fee || 0)}đ.`);
    return { ok: true, id };
}


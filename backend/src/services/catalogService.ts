import * as catalogModel from '../models/catalogModel.js';
import { entities, Entity } from '../../../shared/entities.js';
import * as authModel from '../models/authModel.js';
import { assertMediaAccess } from './mediaService.js';
import { z } from 'zod';
import { parse, entityData, password } from './validation.js';
import { AppError, authorize, one, all, run, db, stmt, hashPassword, audit } from '../middleware/security.js';
export const viewPermission: Record<string, string> = { products: 'product.view', categories: 'category.view', suppliers: 'supplier.view', customers: 'customer.view', employees: 'employee.view', users: 'user.manage', notifications: 'notification.view' };
const managePermission: Record<string, string> = { categories: 'category.manage', suppliers: 'supplier.manage', customers: 'customer.manage', employees: 'employee.manage', users: 'user.manage', notifications: 'notification.manage' };
export async function listEntity(entity: Entity, user: any) { authorize(user, viewPermission[entity]); if (entity === 'users')
    return catalogModel.listEntityQuery1(); if (entity === 'products') {
    const rows = await catalogModel.listEntityQuery2(user.role === 'Guest' ? "WHERE p.status='Active'" : '');
    return rows.map((p: any) => { p.available = p.stock > 0; if (user.role === 'Guest') {
        delete p.cost;
        delete p.supplier_id;
        delete p.supplier;
        delete p.stock;
    } return p; });
} if (entity === 'customers')
    return catalogModel.listEntityQuery3(); if (entity === 'notifications')
    return catalogModel.listEntityQuery4(user.id, user.role, user.role); return catalogModel.listEntityQuery5(entity); }
export async function detailEntity(entity: Entity, id: number, user: any) { const row = (await listEntity(entity, user)).find((r: any) => r.id === id); if (!row)
    throw new AppError(404, 'Không tìm thấy dữ liệu.'); if (entity === 'products') {
    row.variants = (await catalogModel.detailEntityQuery1(id)).map((v: any) => ({ ...v, available: v.quantity > 0 }));
    if (user.role === 'Guest')
        row.variants = row.variants.map((v: any) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, available: v.available }));
} if (entity === 'customers')
    row.orders = await catalogModel.detailEntityQuery2(id); if (entity === 'suppliers')
    row.products = await catalogModel.detailEntityQuery3(id); return row; }
export async function mutateEntity(req: Request, entity: Entity, id: number | undefined, user: any, data: any, method: string) {
    authorize(user, entity === 'products' ? 'product.' + (method === 'DELETE' ? 'delete' : id ? 'edit' : 'create') : managePermission[entity]);
    if (['PUT', 'DELETE'].includes(method) && !id)
        throw new AppError(400, 'Vui lòng chỉ định bản ghi cần thay đổi.');
    if (id && !await catalogModel.mutateEntityQuery1(entity, id))
        throw new AppError(404, 'Không tìm thấy dữ liệu.');
    if (method === 'DELETE') {
        if (entity === 'users') {
            if (id === user.id)
                throw new AppError(400, 'Không thể xóa tài khoản của chính mình.');
            await catalogModel.softDeleteUser(id!);
            await db().batch([authModel.authQuery13(id), authModel.authQuery12(id)]);
        }
        else if (entity === 'employees')
            await catalogModel.mutateEntityQuery2(entity, 'Inactive', id);
        else
            await catalogModel.mutateEntityQuery4(entity, id);
        await audit(req, user.id, 'DELETE_' + entity.toUpperCase(), entity + ':' + id);
        return { ok: true };
    }
    let role;
    let hash;
    data = parse(z.record(z.string(), z.unknown()), data);
    if (entity === 'users') {
        role = parse(z.enum(['Admin', 'Employee', 'Guest']), data.role);
        if (id === user.id && (role !== 'Admin' || data.status !== 'Active'))
            throw new AppError(400, 'Không thể hủy quyền hoặc khóa tài khoản của chính mình.');
        if (data.password)
            hash = await hashPassword(parse(password, data.password));
        else if (!id)
            throw new AppError(422, 'Tài khoản mới cần mật khẩu.');
    }
    const clean = entityData(entity, data);
    if (clean.image || clean.avatar) await assertMediaAccess(user, clean.image || clean.avatar);
    const keys = Object.keys(clean);
    if (entity === 'products' && Number(clean.cost) > Number(clean.price))
        throw new AppError(422, 'Giá vốn không thể lớn hơn giá bán.');
    if (hash) {
        clean.password_hash = hash;
        keys.push('password_hash');
    }
    let recordId = id;
    if (id)
        await catalogModel.mutateEntityQuery5(entity, keys.map(k => k + '=?').join(','), ...keys.map(k => clean[k]), id);
    else {
        const result = await catalogModel.mutateEntityQuery6(entity, keys.join(','), keys.map(() => '?').join(','), ...keys.map(k => clean[k]));
        recordId = Number(result.meta.last_row_id);
    }
    if (entity === 'users') {
        await db().batch([catalogModel.mutateEntityQuery7(recordId), catalogModel.mutateEntityQuery8(recordId, role), catalogModel.mutateEntityQuery9(recordId)]);
        await db().batch([authModel.authQuery12(recordId!)]);
        await audit(req, user.id, 'CHANGE_ROLE', 'users:' + recordId + ' → ' + role);
    }
    await audit(req, user.id, (id ? 'UPDATE_' : 'CREATE_') + entity.toUpperCase(), entity + ':' + recordId);
    return { id: recordId, ok: true };
}
export async function variants(req: Request, id: number, user: any, data: any) { authorize(user, 'product.edit'); if (!await catalogModel.variantsQuery1(id))
    throw new AppError(404, 'Không tìm thấy sản phẩm.'); const d = parse(z.object({ size: z.string().min(1).max(20), color: z.string().min(1).max(30), sku: z.string().min(1).max(80), quantity: z.coerce.number().int().min(0).max(100000) }), data); await db().batch([catalogModel.variantsQuery2(id, d.sku, d.size, d.color), catalogModel.variantsQuery3(d.quantity, d.sku), catalogModel.variantsQuery4(d.quantity, user.id, d.sku)]); await audit(req, user.id, 'CREATE_VARIANT', 'products:' + id); return { ok: true }; }


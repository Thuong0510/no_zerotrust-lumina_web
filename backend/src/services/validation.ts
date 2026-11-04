import { z } from 'zod';
import { entities, Entity } from '../../../shared/entities.js';
import { AppError } from '../middleware/security.js';
export function parse(schema: z.ZodTypeAny, data: unknown): any { const r = schema.safeParse(data); if (!r.success)
    throw new AppError(422, r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' · ')); return r.data; }
export const password = z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự').max(128);
export const registerSchema = z.object({ name: z.string().min(2).max(100), username: z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/), email: z.string().email().max(150).transform(v => v.toLowerCase()), phone: z.string().regex(/^[+0-9 ()-]{8,20}$/), password, confirm: z.string(), terms: z.literal(true) }).refine(v => v.password === v.confirm, { message: 'Mật khẩu xác nhận không trùng khớp', path: ['confirm'] });
export function entityData(entity: Entity, data: any) { const shape: Record<string, z.ZodTypeAny> = {}; for (const [key, spec] of Object.entries(entities[entity].fields)) {
    if (key === 'password' || key === 'role')
        continue;
    let t: z.ZodTypeAny = spec.startsWith('ref:') ? z.coerce.number().int().positive() : spec.startsWith('number') ? z.coerce.number().min(0).max(1000000000) : spec.includes('|') ? z.enum(spec.split('|') as [
        string,
        ...string[]
    ]) : spec.startsWith('email') ? z.string().email().max(150).transform(v => v.toLowerCase()) : spec.startsWith('date') ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/) : z.string().max(key === 'description' || key === 'message' ? 4000 : 300);
    if (key === 'username')
        t = z.string().regex(/^[a-zA-Z0-9_.-]{3,40}$/).transform(v => v.toLowerCase());
    if (key === 'image' || key === 'avatar')
        t = z.union([z.string().regex(/^\/api\/media\/[a-f0-9]{64}\.(png|jpg)$/), z.literal(''), z.null()]);
    if (spec.includes('!') && !spec.startsWith('ref:') && !spec.startsWith('number') && !spec.startsWith('date'))
        t = (t as any).pipe(z.string().min(1, 'Không được để trống'));
    if (!spec.includes('!') && !spec.includes('|'))
        t = z.union([t, z.literal(''), z.null()]).optional().transform(v => v === undefined || v === '' ? null : v);
    shape[key] = t;
} return parse(z.object(shape).strict(), Object.fromEntries(Object.keys(shape).filter(k => k in data).map(k => [k, data[k]]))); }


import * as authModel from '../models/authModel.js';
import { env } from '../config/runtime.js';
import { sendResetEmail } from './mailService.js';
import { z } from 'zod';
import { AppError, one, run, db, stmt, digest, random, hashPassword, verifyPassword, throttle, audit, ip, startSession, currentUser, safeUser, csrf } from '../middleware/security.js';
import { parse, password, registerSchema } from './validation.js';
export async function auth(req: Request, action: string, data: any, user: any) {
    csrf(req, action === 'logout' || action === 'change-password' ? user : null);
    if (action === 'login') {
        const d = parse(z.object({ login: z.string().min(1).max(150), password: z.string().max(128), remember: z.boolean().optional() }), data);
        const u = await authModel.authQuery1(d.login, d.login);
        const fallback = 'pbkdf2_sha256:600000:' + '0'.repeat(64) + ':' + '0'.repeat(64);
        const valid = await verifyPassword(d.password, u?.password_hash || fallback);
        if (u?.locked_until > Date.now())
            throw new AppError(429, 'Tài khoản tạm khóa. Thử lại sau 15 phút.');
        if (!u || !valid) {
            await audit(req,u?.id || null,'LOGIN_FAILED','Session');
            if (u)
                await authModel.authQuery2(Date.now() + 900000, u.id);
            throw new AppError(401, 'Email hoặc mật khẩu không chính xác.');
        }
        if (u.status !== 'Active')
            throw new AppError(403, 'Tài khoản đang chờ duyệt, bị khóa hoặc đã ngừng hoạt động.');
        await authModel.authQuery3(u.id);
        if(u.password_hash.split(':').length===2) await authModel.upgradePasswordHash(await hashPassword(d.password),u.id);
        const s = await startSession(req, u.id, !!d.remember);
        await audit(req, u.id, 'LOGIN', 'Session');
        return { body: { ok: true }, cookie: s.cookie };
    }
    if (action === 'register') {
        const d = parse(registerSchema, data);
        // Equal public reply and password derivation for existing/new identifiers.
        const body = { message: 'Yêu cầu đăng ký đã được xử lý. Nếu thông tin chưa được sử dụng, tài khoản sẽ chờ Admin duyệt. Nếu đã có tài khoản, vui lòng đăng nhập hoặc đặt lại mật khẩu.' };
        const hash = await hashPassword(d.password);
        if (await authModel.authQuery4(d.email, d.username))
            return { body };
        const result = await authModel.authQuery5(d.name, d.username.toLowerCase(), d.email, d.phone, hash, 'Pending');
        const id = Number(result.meta.last_row_id);
        await authModel.authQuery6(id);
        await audit(req, id, 'REGISTER', 'Pending account');
        await authModel.authQuery7(d.name + ' (@' + d.username + ', ' + d.email + ') đã đăng ký và đang chờ duyệt.');
        return { body };
    }
    if (action === 'forgot') {
        const d = parse(z.object({ email: z.string().email() }), data);
        const u = await authModel.authQuery8(d.email);
        let resetUrl;
        if (u) {
            const token = random();
            await db().batch([authModel.authQuery12(u.id)]);
            await authModel.authQuery9(await digest(token), u.id, Date.now() + 900000);
            if (env.DEMO_MODE === 'true')
                resetUrl = '/?reset=' + token;
            else if(process.env.SMTP_HOST) {
                try { await sendResetEmail(d.email,token); }
                catch {
                    // The public reply must not reveal account existence or SMTP details.
                    console.warn('Security event',{action:'PASSWORD_RESET_DELIVERY_FAILED',userId:u.id});
                }
            }
        }
        return { body: { message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi. Liên kết có hiệu lực 15 phút. Nếu chưa cấu hình email, hãy liên hệ Admin để đặt lại mật khẩu.', resetUrl: resetUrl?.replace('/ ?', '/?') } };
    }
    if (action === 'reset') {
        const d = parse(z.object({ token: z.string().length(64), password, confirm: z.string() }).refine(v => v.password === v.confirm, { message: 'Mật khẩu xác nhận không trùng khớp' }), data);
        const tokenHash = await digest(d.token);
        const t = await authModel.authQuery10(tokenHash, Date.now());
        if (!t)
            throw new AppError(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
        const result = await db().batch([authModel.authQuery11(await hashPassword(d.password), t.user_id, tokenHash, Date.now()), authModel.authQuery12(t.user_id), authModel.authQuery13(t.user_id)]);
        if (!result[0].meta.changes)
            throw new AppError(400, 'Liên kết đã được sử dụng.');
        await audit(req, t.user_id, 'RESET_PASSWORD', 'Account');
        return { body: { message: 'Đã đổi mật khẩu. Bạn có thể đăng nhập.' } };
    }
    if (!user)
        throw new AppError(401, 'Vui lòng đăng nhập.');
    if (action === 'logout') {
        await authModel.authQuery14(user.token_hash);
        await audit(req, user.id, 'LOGOUT', 'Session');
        return { body: { ok: true }, cookie: 'lumina_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (new URL(req.url).protocol === 'https:' ? '; Secure' : '') };
    }
    if (action === 'change-password') {
        const d = parse(z.object({ old_password: z.string().max(128), password, confirm: z.string().max(128) }).refine(v => v.password === v.confirm, { message: 'Mật khẩu xác nhận không trùng khớp' }), data);
        const u = await authModel.authQuery15(user.id);
        if (!await verifyPassword(d.old_password, u.password_hash))
            throw new AppError(400, 'Mật khẩu hiện tại không chính xác.');
        await db().batch([authModel.authQuery16(await hashPassword(d.password), user.id), authModel.authQuery17(user.id, user.token_hash), authModel.authQuery12(user.id)]);
        await audit(req, user.id, 'CHANGE_PASSWORD', 'Account');
        return { body: { message: 'Đã đổi mật khẩu và kết thúc các phiên khác.' } };
    }
    throw new AppError(404, 'Không tìm thấy chức năng.');
}


// Run through tests/embedded.ts accounts; never reads .env or hosted data.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
if (!process.env.TEST_DATABASE_URL || !/^lumina_test(?:_[a-z0-9]+)?$/.test(new URL(process.env.TEST_DATABASE_URL).pathname.slice(1))) throw new Error('Disposable test database required');
process.env.DEMO_MODE = 'true';
process.env.DEMO_PASSWORD = 'Accounts-Test!12345';
const { pool, one, run } = await import('../backend/src/models/database');
const { migrate } = await import('../backend/src/models/migrate');
const { initialize } = await import('../backend/src/services/initializeService');
const { dispatch } = await import('../backend/src/app');
const { digest } = await import('../backend/src/middleware/security');
type Session = { cookie: string; csrf: string; user: any };
let checks = 0;
async function call(route: string, method = 'GET', body?: any, session?: Session, status = 200, extra = {}) {
    const res = await dispatch(new Request('http://localhost:3000/api/' + route, {
        method, headers: { 'Content-Type': 'application/json', ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf } : {}), ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), 'accounts-' + (++checks));
    const data = await res.json();
    assert.equal(res.status, status, route + ': ' + JSON.stringify(data));
    return { res, data };
}
async function login(login: string, password = process.env.DEMO_PASSWORD): Promise<Session> {
    const { res } = await call('auth/login', 'POST', { login, password });
    const cookie = res.headers.get('Set-Cookie')!.split(';')[0];
    const { data } = await call('bootstrap', 'GET', undefined, { cookie, csrf: '', user: null });
    return { cookie, csrf: data.user.csrf, user: data.user };
}
const registration = (overrides = {}) => ({ name: 'New Account', username: 'guest01', email: 'replacement@example.com', phone: '0987654321', password: 'New-Password!123', confirm: 'New-Password!123', terms: true, ...overrides });
const fields = (u: any, status = u.status, role = u.role) => ({ name: u.name, username: u.username, email: u.email, phone: u.phone, employee_id: u.employee_id, status, role });
try {
    await migrate(); await initialize(); await migrate();
    const admin = await login('admin'), employee = await login('employee01'), old = await login('guest01');
    const oldUser = old.user;
    const oldCount = (await one('SELECT COUNT(*) n FROM users')).n;
    const oldHash = (await one('SELECT password_hash FROM users WHERE id=?', oldUser.id)).password_hash;
    const oldRegistration = registration({ email: oldUser.email.toUpperCase(), username: oldUser.username.toUpperCase() });

    // Preserve a real checkout, private notification, saved address, and audit history.
    const variant = await one("SELECT v.id FROM product_variants v JOIN products p ON p.id=v.product_id JOIN inventory i ON i.variant_id=v.id WHERE p.status='Active' AND i.quantity>0 LIMIT 1");
    const items = [{ variant_id: variant.id, quantity: 1 }];
    const { data: quote } = await call('checkout/quote', 'POST', { items }, old);
    const { data: order } = await call('checkout', 'POST', {
        items, quote_hash: quote.quote_hash, idempotency_key: randomUUID(), accept_policy: true,
        shipping: { name: oldUser.name, email: oldUser.email, phone: '0901234567', address: '123 Old Address', notes: '' },
    }, old);
    const privateNotice = await one('SELECT id FROM notifications WHERE target_user_id=? ORDER BY id DESC LIMIT 1', oldUser.id);
    const customer = await one('SELECT id FROM customers WHERE user_id=?', oldUser.id);

    // Neither non-admins, CSRF failures nor self-deletion may mutate the account.
    await call('users/' + oldUser.id, 'DELETE', undefined, employee, 403);
    await call('users/' + admin.user.id, 'DELETE', undefined, admin, 400);
    await call('users/' + oldUser.id, 'DELETE', undefined, admin, 403, { 'X-CSRF-Token': 'wrong' });
    await call('users/' + admin.user.id, 'PUT', fields(admin.user, 'Locked'), admin, 400);
    await call('auth/register', 'POST', oldRegistration);
    assert.equal((await one('SELECT COUNT(*) n FROM users')).n, oldCount);

    // Lock/disable reserve both identifiers and revoke sessions; they do not delete.
    for (const status of ['Locked', 'Disabled', 'Pending']) {
        await call('users/' + oldUser.id, 'PUT', fields(oldUser, status), admin);
        await call('auth/register', 'POST', oldRegistration);
        assert.equal((await one('SELECT COUNT(*) n FROM users')).n, oldCount);
        assert.equal((await one('SELECT deleted_at FROM users WHERE id=?', oldUser.id)).deleted_at, null);
        await call('auth/login', 'POST', { login: oldUser.email, password: process.env.DEMO_PASSWORD }, undefined, 403);
    }
    await call('profile', 'GET', undefined, old, 401);
    await call('users/' + oldUser.id, 'PUT', fields(oldUser, 'Active'), admin);
    const oldSession = await login(oldUser.email);
    const { data: recovery } = await call('auth/forgot', 'POST', { email: oldUser.email });
    const oldToken = new URL('http://localhost:3000' + recovery.resetUrl).searchParams.get('reset');

    await call('users/' + oldUser.id, 'DELETE', undefined, admin);
    const deleted = await one('SELECT * FROM users WHERE id=?', oldUser.id);
    assert.ok(deleted.deleted_at); assert.equal(deleted.status, 'Disabled');
    assert.equal(deleted.password_hash, oldHash);
    assert.equal((await one('SELECT COUNT(*) n FROM sessions WHERE user_id=?', oldUser.id)).n, 0);
    assert.equal((await one('SELECT COUNT(*) n FROM password_reset_tokens WHERE user_id=? AND used=0', oldUser.id)).n, 0);
    await call('profile', 'GET', undefined, oldSession, 401);
    assert.equal((await call('bootstrap', 'GET', undefined, oldSession)).data.user, null);
    await call('users/' + oldUser.id, 'GET', undefined, admin, 404);
    await call('users/' + oldUser.id, 'PUT', fields(oldUser, 'Active'), admin, 404);
    await call('users/' + oldUser.id, 'DELETE', undefined, admin, 404);
    await call('auth/login', 'POST', { login: oldUser.email, password: process.env.DEMO_PASSWORD }, undefined, 401);
    const tokenCount = (await one('SELECT COUNT(*) n FROM password_reset_tokens')).n;
    assert.equal((await call('auth/forgot', 'POST', { email: oldUser.email })).data.resetUrl, undefined);
    assert.equal((await one('SELECT COUNT(*) n FROM password_reset_tokens')).n, tokenCount);
    await call('auth/reset', 'POST', { token: oldToken, password: 'Stale-Password!123', confirm: 'Stale-Password!123' }, undefined, 400);

    // Register the same email AND username (including uppercase input) as a fresh Pending Guest.
    const publicReply = (await call('auth/register', 'POST', oldRegistration)).data;
    let users = (await call('users', 'GET', undefined, admin)).data;
    assert.equal(users.some(u => u.id === oldUser.id), false);
    const fresh = users.find(u => u.username === oldUser.username);
    assert.ok(fresh); assert.notEqual(fresh.id, oldUser.id);
    assert.equal(fresh.name, oldRegistration.name); assert.equal(fresh.phone, oldRegistration.phone);
    assert.equal(fresh.email, oldUser.email.toLowerCase()); assert.ok(fresh.created_at);
    assert.equal(fresh.status, 'Pending'); assert.equal(fresh.role, 'Guest'); assert.equal(fresh.employee_id, null);
    assert.equal(fresh.last_login, null);
    assert.deepEqual((await call('auth/register', 'POST', oldRegistration)).data, publicReply);
    // Either occupied identifier must independently prevent a duplicate live account.
    await call('auth/register', 'POST', registration({ username: 'differentname', email: fresh.email.toUpperCase() }));
    await call('auth/register', 'POST', registration({ username: fresh.username.toUpperCase(), email: 'different@example.com' }));
    assert.equal((await one('SELECT COUNT(*) n FROM users WHERE deleted_at IS NULL')).n, oldCount);
    await call('auth/login', 'POST', { login: fresh.email, password: oldRegistration.password }, undefined, 403);
    assert.ok((await call('notifications', 'GET', undefined, admin)).data.some(n => n.title === 'Tài khoản mới chờ duyệt' && n.message.includes(fresh.email) && n.message.includes(fresh.name)));

    await call('users/' + fresh.id, 'PUT', fields(fresh, 'Active'), admin);
    const freshSession = await login(fresh.email.toUpperCase(), oldRegistration.password);
    assert.equal(freshSession.user.id, fresh.id);
    await call('auth/login', 'POST', { login: fresh.email, password: process.env.DEMO_PASSWORD }, undefined, 401);
    assert.deepEqual((await call('my-orders', 'GET', undefined, freshSession)).data, []);
    assert.equal((await call('checkout/address', 'GET', undefined, freshSession)).data, null);
    await call('my-orders/' + order.id, 'GET', undefined, freshSession, 404);
    await call('notifications/' + privateNotice.id + '/read', 'POST', {}, freshSession, 404);
    assert.equal((await one('SELECT buyer_id FROM orders WHERE id=?', order.id)).buyer_id, oldUser.id);
    assert.equal((await one('SELECT user_id FROM customers WHERE id=?', customer.id)).user_id, oldUser.id);
    assert.equal((await call('orders/' + order.id, 'GET', undefined, admin)).data.created_by_name, oldUser.name);
    assert.ok((await call('activity', 'GET', undefined, admin)).data.some(l => l.user_id === oldUser.id && l.action === 'CHECKOUT_COD'));

    // Recovery now targets the new ID; an old token cannot change the replacement's password.
    const newRecovery = (await call('auth/forgot', 'POST', { email: fresh.email.toUpperCase() })).data;
    const newToken = new URL('http://localhost:3000' + newRecovery.resetUrl).searchParams.get('reset');
    assert.equal((await one('SELECT user_id FROM password_reset_tokens WHERE token_hash=?', await digest(newToken!))).user_id, fresh.id);
    await call('auth/reset', 'POST', { token: oldToken, password: 'Stale-Password!123', confirm: 'Stale-Password!123' }, undefined, 400);
    await call('auth/reset', 'POST', { token: newToken, password: 'Recovered-Password!123', confirm: 'Recovered-Password!123' });
    await login(fresh.username, 'Recovered-Password!123');

    // Repeated deletion/reuse works, and admin creation/profile changes also ignore tombstones.
    await call('users/' + fresh.id, 'DELETE', undefined, admin);
    await call('auth/register', 'POST', registration({ username: 'thirdaccount', email: fresh.email }));
    const third = (await call('users', 'GET', undefined, admin)).data.find(u => u.username === 'thirdaccount');
    assert.ok(third); assert.equal(third.status, 'Pending');
    const adminCreated = (await call('users', 'POST', { ...fields(fresh, 'Active'), email: 'admin-created@example.com', password: 'Created-Password!123' }, admin)).data;
    assert.notEqual(adminCreated.id, fresh.id);
    await call('users/' + third.id, 'DELETE', undefined, admin);
    const createdSession = await login(fresh.username, 'Created-Password!123');
    await call('profile', 'PUT', { name: 'New profile', phone: '0987654321', email: fresh.email, current_password: 'Created-Password!123' }, createdSession);
    assert.equal((await login(fresh.email, 'Created-Password!123')).user.id, adminCreated.id);
    // Database uniqueness still protects concurrent/direct writes to live identifiers.
    await assert.rejects(() => run('INSERT INTO users(name,username,email,password_hash) VALUES(?,?,?,?)', 'Collision', fresh.username.toUpperCase(), 'collision@example.com', oldHash), { code: '23505' });
    await assert.rejects(() => run('INSERT INTO users(name,username,email,password_hash) VALUES(?,?,?,?)', 'Collision', 'collisionname', fresh.email.toUpperCase(), oldHash), { code: '23505' });
    console.log(JSON.stringify({ suite: 'Account deletion and registration', passed: checks, environment: 'Disposable PGlite; no .env/cloud' }));
} finally { await pool.end(); }

import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import('react-dom/client');
const { default: EntityPage } = await import('../frontend/src/components/lumina/entity-page');
const admin = { id: 1, name: 'Admin', username: 'admin', email: 'admin@example.com', role: 'Admin', status: 'Active', permissions: [] };
const pending = { id: 2, name: 'Thông tin đăng ký mới', username: 'replacement', email: 'new@example.com', phone: '0987654321', employee_id: null, role: 'Guest', status: 'Pending', created_at: '2026-10-24T01:00:00Z' };
let rows: any[] = [admin, pending], failDelete = false, hold: Promise<void> | undefined;
const calls: { path: string; method: string; body: any }[] = [], messages: string[] = [];
globalThis.fetch = async (url, init) => {
    const request = { path: String(url), method: init?.method || 'GET', body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(request);
    if (hold) await hold;
    if (request.method === 'DELETE' && failDelete) return new Response(JSON.stringify({ error: 'Thử lại sau' }), { status: 503 });
    if (request.method === 'PUT') rows = rows.map(r => r.id === 2 ? { ...r, ...request.body } : r);
    else if (request.method === 'DELETE') rows = rows.filter(r => r.id !== 2);
    else throw new Error('Unexpected API request: ' + JSON.stringify(request));
    return new Response(JSON.stringify({ ok: true }));
};
const root = createRoot(document.getElementById('root')!);
function render() { root.render(<EntityPage entity="users" rows={rows} user={admin} onReload={render} notify={m => messages.push(m)}/>); }
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function button(title: string) {
    const result = document.querySelector<HTMLButtonElement>('button[title="' + title + '"]');
    assert.ok(result, 'Missing button: ' + title); return result;
}
function dialogButton(text: string) {
    const result = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent === text);
    assert.ok(result, 'Missing dialog button: ' + text); return result;
}
async function click(element: HTMLButtonElement) { await act(async () => { element.click(); await tick(); }); }
try {
    await act(async () => { render(); await tick(); });
    for (const text of [pending.name, pending.phone, pending.email, 'Ngày đăng ký', '24/10/2026']) assert.ok(document.querySelector('table')?.textContent?.includes(text), text);
    assert.equal(document.querySelector<HTMLButtonElement>('[aria-label="Xóa tài khoản admin"]')!.disabled, true);
    assert.equal(document.querySelector<HTMLButtonElement>('[aria-label="Khóa tài khoản admin"]')!.disabled, true);

    await click(document.querySelector<HTMLButtonElement>('[aria-label="Xóa tài khoản replacement"]')!);
    assert.ok(document.querySelector('[role="dialog"]')?.textContent?.includes('Email và username có thể dùng để đăng ký tài khoản mới chờ duyệt'));
    await click(dialogButton('Hủy')); assert.equal(calls.length, 0);
    await click(button('Duyệt tài khoản'));
    assert.equal(calls.length, 1); assert.equal(calls[0].method, 'PUT'); assert.equal(calls[0].path, '/api/users/2');
    assert.equal(calls[0].body.status, 'Active'); assert.equal(calls[0].body.role, 'Guest'); assert.equal(calls[0].body.password, undefined);
    assert.equal(document.querySelector('button[title="Duyệt tài khoản"]'), null);

    await click(document.querySelector<HTMLButtonElement>('[aria-label="Khóa tài khoản replacement"]')!);
    assert.ok(document.querySelector('[role="dialog"]')?.textContent?.includes('Email và username vẫn được giữ'));
    await click(dialogButton('Khóa tài khoản'));
    assert.equal(calls.length, 2); assert.equal(calls[1].method, 'PUT'); assert.equal(calls[1].body.status, 'Locked');
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.querySelector('[aria-label="Khóa tài khoản replacement"]'), null);

    await click(document.querySelector<HTMLButtonElement>('[aria-label="Xóa tài khoản replacement"]')!);
    failDelete = true;
    await click(dialogButton('Xóa tài khoản'));
    assert.equal(calls.at(-1)!.method, 'DELETE'); assert.equal(calls.at(-1)!.body, null);
    assert.ok(document.querySelector('[role="dialog"] [role="alert"]')?.textContent?.includes('Thử lại sau'));
    assert.ok(document.querySelector('tbody')?.textContent?.includes(pending.name));

    failDelete = false;
    let release!: () => void;
    hold = new Promise(resolve => { release = resolve; });
    await click(dialogButton('Xóa tài khoản'));
    assert.equal(dialogButton('Đang xử lý…').disabled, true);
    assert.equal(dialogButton('Hủy').disabled, true);
    const requestCount = calls.length;
    await click(dialogButton('Đang xử lý…')); assert.equal(calls.length, requestCount);
    await act(async () => { release(); await tick(); });
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.querySelector('tbody')?.textContent?.includes(pending.name), false);
    assert.ok(messages.some(m => m.includes('Email và username có thể đăng ký lại')));
    console.log(JSON.stringify({ suite: 'Account management UI', passed: true, checks: 'New profile fields, approve, lock, delete/cancel/retry, pending request, self-protection' }));
} finally { await act(async () => root.unmount()); dom.window.close(); }

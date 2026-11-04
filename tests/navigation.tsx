import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';

// Exercise the real App with controlled API timing, without touching .env or a database.
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/' });
Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
});
const user = { name: 'Test Admin', username: 'admin', email: 'test@example.com', role: 'Admin', permissions: [], csrf: 'test' };
const dashboard = { counts: { products: 1 }, limited: true, categories: [] };
const product = { id: 1, name: 'Navigation product', category: 'Clothing', price: 100, status: 'Active' };
const notices = [{ id: 1, title: 'Navigation notice', message: 'Notice body', read_status: 'Read' }];
type Pending = { path: string; resolve: (response: Response) => void };
const pending: Pending[] = [];
const response = (body: any, status = 200) => new Response(JSON.stringify(body), { status });
globalThis.fetch = async (url) => {
    const path = String(url).replace('/api/', '');
    if (path === 'bootstrap') return response({ user, demo: false });
    return new Promise<Response>(resolve => pending.push({ path, resolve }));
};
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('../frontend/src/App');
const root = createRoot(document.getElementById('root')!);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function settle(path: string, body: any, status = 200) {
    const requests = pending.filter(r => r.path === path);
    assert.ok(requests.length, `Expected a pending request for ${path}`);
    await act(async () => {
        for (const r of requests) {
            pending.splice(pending.indexOf(r), 1);
            r.resolve(response(body, status));
        }
        await tick();
    });
}
async function navigate(title: string) {
    const button = document.querySelector<HTMLButtonElement>(`.sidebar-nav button[title="${title}"]`);
    assert.ok(button, `Missing navigation button: ${title}`);
    await act(async () => { button.click(); await tick(); });
    assert.ok(document.querySelector('.app-shell'), 'App must remain mounted');
}
function loading() { assert.ok(document.querySelector('.loading-state'), 'New page must wait for its own payload'); }
function contains(text: string) { assert.ok(document.querySelector('.page-content')?.textContent?.includes(text), `Expected ${text}`); }
async function clearBadgeRequests() {
    if (pending.some(r => r.path === 'notifications')) await settle('notifications', []);
}

try {
    await act(async () => { root.render(<React.StrictMode><App /></React.StrictMode>); await tick(); });
    await settle('dashboard', dashboard);
    await clearBadgeRequests();

    await navigate('Products'); loading();
    await settle('products', [product]); await clearBadgeRequests(); contains(product.name);
    // Previously the dashboard rendered the product array and threw while accessing counts.products.
    await navigate('Dashboard'); loading();
    await settle('dashboard', dashboard); await clearBadgeRequests(); contains('Xin chào');

    await navigate('Products'); await settle('products', [product]); await clearBadgeRequests();
    // Previously notifications rendered product rows and threw while calling message.slice().
    await navigate('Notifications'); loading();
    await settle('notifications', notices); contains(notices[0].title);

    // Old success must neither stop the current loading state nor overwrite the latest page.
    await navigate('Products'); await navigate('Customers'); loading();
    await settle('products', [product]); loading();
    await settle('customers', [{ id: 2, name: 'Latest customer' }]); await clearBadgeRequests(); contains('Latest customer');
    await navigate('Products'); await navigate('Customers');
    await settle('customers', [{ id: 3, name: 'Newest customer' }]); await clearBadgeRequests();
    await settle('products', [product]); contains('Newest customer');

    // An obsolete auth failure must not log the user out or replace the current page with an error.
    await navigate('Products'); await navigate('Customers');
    await settle('customers', [{ id: 4, name: 'Still signed in' }]); await clearBadgeRequests();
    await settle('products', { error: 'Expired old request' }, 401); contains('Still signed in');
    assert.equal(document.querySelector('.page-error'), null);

    // Check every sidebar destination with its actual response shape.
    for (const [title, path, body] of [
        ['Categories', 'categories', []], ['Inventory', 'inventory', []], ['Orders', 'orders', []],
        ['Suppliers', 'suppliers', []], ['Employees', 'employees', []], ['Users', 'users', []],
        ['Roles & Permissions', 'roles', { roles: [{ id: 2, name: 'Employee' }], permissions: [], assignments: [] }],
        ['Activity Logs', 'activity', []],
    ] as const) {
        await navigate(title); loading(); await settle(path, body); await clearBadgeRequests();
        assert.ok(document.querySelector('.page-content h1'), `${title} must render`);
    }
    await navigate('Reports');
    const reportPath = pending.find(r => r.path.startsWith('reports?'))!.path;
    await settle(reportPath, { sales: [], monthly: [], products: [], inventory: [], customers: [] });
    await clearBadgeRequests(); contains('Reports & Analytics');
    await act(async () => { document.querySelector<HTMLButtonElement>('.profile-nav')!.click(); await tick(); });
    await clearBadgeRequests(); contains('My Profile');
    const recoveryPassword=document.querySelector<HTMLInputElement>('input[name="current_password"]');
    assert.ok(recoveryPassword,'Profile must offer reauthentication for recovery email changes');
    assert.equal(recoveryPassword.type,'password');

    // Hash navigation (including browser history) goes through the same safe loading path.
    await act(async () => { window.location.hash = 'dashboard'; await tick(); await tick(); });
    loading(); await settle('dashboard', dashboard); await clearBadgeRequests(); contains('Xin chào');

    // Active errors remain visible, and returning to Dashboard does not reload the failed route.
    await navigate('Products'); await settle('products', { error: 'Current request failed' }, 500);
    contains('Current request failed');
    await act(async () => { document.querySelector<HTMLButtonElement>('.page-error button')!.click(); await tick(); });
    loading();
    assert.equal(pending.filter(r => r.path === 'products').length, 0);
    await settle('dashboard', dashboard); await clearBadgeRequests(); contains('Xin chào');

    await navigate('Products');
    await act(async () => { root.unmount(); });
    await settle('products', [product]);
    assert.equal(document.getElementById('root')!.innerHTML, '');
    console.log('Passed: all sidebar pages, profile, hash navigation, stale payloads, reversed responses, stale 401, error recovery, unmount (StrictMode).');
} finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
}

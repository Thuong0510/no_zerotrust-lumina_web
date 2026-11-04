import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { money } from '../frontend/src/lib/client';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost:5173/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
});
let user: any;
let unavailable = false;
let detailFails = false;
const writes: string[] = [];
let placed: any;
let checkoutAttempts=0;
const checkoutBodies:any[]=[];
const reads: string[] = [];
const product = { id: 1, name: 'Linen Shirt', sku: 'SHIRT', price: 250000, status: 'Active', category_id: 1, category: 'Shirts' };
const variants = [
    { id: 11, sku: 'SHIRT-M-BEIGE', size: 'M', color: 'Beige', available: true, quantity: 10 },
    { id: 12, sku: 'SHIRT-L-BEIGE', size: 'L', color: 'Beige', available: true, quantity: 10 },
    { id: 13, sku: 'SHIRT-M-BLACK', size: 'M', color: 'Black', available: false, quantity: 0 },
];
globalThis.fetch = async (url, options) => {
    const path = String(url).replace('/api/', '');
    if (options?.method !== 'GET') {
        writes.push(path);
        const data=JSON.parse(String(options?.body));
        if(path==='checkout/quote') {
            const items=data.items.map((i:any)=>({...variants.find(v=>v.id===i.variant_id),...i,name:product.name,price:product.price}));
            const subtotal=items.reduce((s:number,i:any)=>s+i.price*i.quantity,0);
            return new Response(JSON.stringify({items,subtotal,shipping_fee:subtotal>=500000?0:30000,total:subtotal+(subtotal>=500000?0:30000),quote_hash:'a'.repeat(64)}));
        }
        if(path==='checkout') {
            checkoutBodies.push(data);checkoutAttempts++;
            const subtotal=data.items.reduce((s:number,i:any)=>s+i.quantity*product.price,0);
            placed={id:100,code:'LM-COD-TEST',status:'Pending',payment:'Unpaid',subtotal,shipping_fee:subtotal>=500000?0:30000,total:subtotal+(subtotal>=500000?0:30000),shipping_name:data.shipping.name,shipping_email:data.shipping.email,shipping_phone:data.shipping.phone,shipping_address:data.shipping.address,items:data.items.map((i:any)=>({...i,...variants.find(v=>v.id===i.variant_id),name:product.name,price:product.price}))};
            if(checkoutAttempts===1)throw new TypeError('Connection lost');
            return new Response(JSON.stringify(placed));
        }
        throw new Error('Shopping must not write management APIs: '+path);
    }
    reads.push(path);
    const body = path === 'bootstrap' ? { user, demo: false } : path === 'dashboard' ? { counts: { products: 1 }, limited: true, categories: [] } :
        path === 'products' ? (user.role === 'Guest' ? [product] : [product, { ...product, id: 2, name: 'Draft Shirt', status: 'Draft' }]) :
        path === 'products/1' ? { ...product, variants: variants.map(v => user.role === 'Guest' ? { id: v.id, sku: v.sku, size: v.size, color: v.color, available: !unavailable && v.available } : { ...v, available: !unavailable && v.available }) } :
        path === 'shop-policy' ? {shipping_fee:30000,free_shipping_threshold:500000,support_email:'',support_phone:''} : path === 'checkout/address' ? null : path === 'my-orders' ? (placed?[placed]:[]) : path === 'my-orders/100' ? placed : [];
    return new Response(JSON.stringify(path === 'products/1' && detailFails ? { error: 'Product temporarily unavailable' } : body), { status: path === 'products/1' && detailFails ? 503 : 200 });
};
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('../frontend/src/App');
let root: ReturnType<typeof createRoot>;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function flush(action: () => void) { await act(async () => { action(); await tick(); await tick(); }); }
async function mount(role: string, id: number) {
    user = { id, name: 'Shopping Tester', username: 'user' + id, role, email: 'test@example.com', phone: '0901234567', permissions: ['product.view', 'notification.view'], csrf: 'test' };
    window.history.replaceState(null, '', '/#products');
    root = createRoot(document.getElementById('root')!);
    await flush(() => root.render(<React.StrictMode><App /></React.StrictMode>));
}
async function click(selector: string) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, `Missing ${selector}`);
    assert.equal(button.disabled, false, `Disabled ${selector}`);
    await flush(() => button.click());
}
async function input(selector: string, value: string) {
    const element = document.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)!;
    assert.ok(element, `Missing ${selector}`);
    const prototype = element.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    await flush(() => {
        Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
        element.dispatchEvent(new dom.window.Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
}
async function add(quantity = '1', variant = '11') {
    await click('button[aria-label="Thêm Linen Shirt vào giỏ hàng"]');
    await input('select[aria-label="Chọn size và màu"]', variant);
    await input('input[aria-label="Số lượng thêm vào giỏ"]', quantity);
    await click('.modal button[type="submit"], .modal .modal-footer .primary');
    assert.equal(document.querySelector('.modal'), null);
}
function total(expected: number) {
    assert.equal(document.querySelector('.shopping-summary .shopping-subtotal strong')?.textContent, money(expected));
}
async function unmount() { await flush(() => root.unmount()); }

try {
    // Staff workspace shopping; anonymous/Guest storefront is covered in storefront.tsx.
    for (const [index, role] of ['Admin', 'Employee'].entries()) {
        const id = index + 1;
        await mount(role, id);
        assert.ok(document.querySelector('.sidebar-nav button[title="Giỏ hàng"]'), `${role} cart access`);
        if (role === 'Guest') assert.equal(document.querySelector('button[title="Chỉnh sửa"]'), null);
        if (role !== 'Guest') assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Thêm Draft Shirt vào giỏ hàng"]')!.disabled, true, 'Draft products cannot be added');
        await click('.sidebar-nav button[title="Giỏ hàng"]');
        assert.ok(document.querySelector('.shopping-empty'));
        await flush(() => { window.location.hash = 'checkout'; });
        assert.ok(document.querySelector('.shopping-empty'));
        assert.equal(document.querySelector('.checkout-form'), null);
        await click('.shopping-empty .primary');

        await click('button[aria-label="Thêm Linen Shirt vào giỏ hàng"]');
        assert.equal(document.querySelector<HTMLOptionElement>('option[value="13"]')!.disabled, true, 'Sold-out variant is disabled for all roles');
        await input('input[aria-label="Số lượng thêm vào giỏ"]', '0');
        assert.equal(document.querySelector<HTMLButtonElement>('.modal .primary')!.disabled, true);
        await input('input[aria-label="Số lượng thêm vào giỏ"]', '2');
        assert.equal(document.querySelector('.modal .shopping-subtotal strong')!.textContent, money(500000));
        await click('.modal .primary');
        assert.equal(document.querySelector('.cart-count')!.textContent, '2');

        await add('1'); // Same variant merges, a different size remains a separate item.
        await add('1', '12');
        await click('.sidebar-nav button[title="Giỏ hàng"]');
        assert.equal(document.querySelectorAll('.cart-item').length, 2);
        total(1000000);
        await click('button[aria-label="Tăng số lượng SHIRT-M-BEIGE"]'); total(1250000);
        await input('input[aria-label="Số lượng SHIRT-M-BEIGE"]', '100'); total(1250000);
        await input('input[aria-label="Số lượng SHIRT-M-BEIGE"]', '99');
        assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Tăng số lượng SHIRT-M-BEIGE"]')!.disabled, true);
        await input('input[aria-label="Số lượng SHIRT-M-BEIGE"]', '3');
        await click('button[aria-label="Xóa SHIRT-L-BEIGE khỏi giỏ"]'); total(750000);
        await click('.checkout-link');
        assert.equal(document.querySelector('.shopping-summary .shopping-subtotal strong')?.textContent,'Chưa xác nhận');
        const form = document.querySelector<HTMLFormElement>('.checkout-form')!;
        assert.equal(form.checkValidity(), false, 'Delivery address is required');
        await input('textarea[name="address"]', '     ');
        await click('.checkout-review');
        assert.equal(document.querySelector('.checkout-reviewed'), null, 'Whitespace-only delivery addresses are rejected');
        await input('textarea[name="address"]', '123 Test Street');
        await click('.checkout-review');
        assert.ok(document.querySelector('.checkout-reviewed')?.textContent?.includes('Chưa thu tiền trực tuyến'));
        assert.ok(document.querySelector('.checkout-reviewed')?.textContent?.includes(money(750000)));
        assert.equal(writes.includes('checkout'), false, 'Review alone must not create an order');
        await input('textarea[name="address"]', '456 New Street');
        assert.equal(document.querySelector('.checkout-reviewed'), null, 'Edited details invalidate the previous review');
        await click('.checkout-review');
        assert.equal(document.querySelector<HTMLButtonElement>('.checkout-place')!.disabled,true,'Policy acceptance required');
        assert.ok(document.querySelector('.checkout-form')?.textContent?.includes('Thanh toán khi nhận hàng'));

        await unmount(); await mount(role, id);
        await click('.sidebar-nav button[title="Giỏ hàng"]'); total(750000);
        assert.equal(document.querySelectorAll('.cart-item').length, 1, 'Cart survives app reload');
        await click('.cart-panel .text-btn');
        assert.ok(document.querySelector('.shopping-empty'));
        await click('.shopping-empty .primary');
        // The detail modal hands over to the variant selector without stacking dialogs.
        await click('tbody tr:last-child button[title="Xem chi tiết"]'); await click('.detail-shop');
        assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
        await click('.modal .primary');
        await unmount();
        await mount('Employee', id + 100);
        await click('.sidebar-nav button[title="Giỏ hàng"]');
        assert.ok(document.querySelector('.shopping-empty'), 'A different account must not see the previous cart');
        await unmount();
        console.log(`Passed ${role}: variants, merge, quantities, totals, checkout, payment previews, persistence, account isolation.`);
    }
    await mount('Employee', 200);
    unavailable = true;
    await click('button[aria-label="Thêm Linen Shirt vào giỏ hàng"]');
    assert.equal(document.querySelector<HTMLButtonElement>('.modal .primary')!.disabled, true);
    await click('.modal header button');
    unavailable = false; detailFails = true;
    await click('button[aria-label="Thêm Linen Shirt vào giỏ hàng"]');
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes('Product temporarily unavailable'));
    detailFails = false;
    await click('.modal > .btn');
    await click('.modal .primary');
    await unmount();
    window.sessionStorage.setItem('lumina.cart.v1.201', '[null,{"quantity":-1}]');
    await mount('Employee', 201); await click('.sidebar-nav button[title="Giỏ hàng"]');
    assert.ok(document.querySelector('.shopping-empty'), 'Invalid stored carts are ignored');
    await click('.shopping-empty .primary');await add();
    await click('.sidebar-nav button[title="Giỏ hàng"]');await click('.checkout-link');
    await input('textarea[name="address"]','123 Checkout Street');await click('.checkout-review');
    await click('.checkout-form input[type="checkbox"]');await click('.checkout-place');
    assert.ok(document.querySelector('[role="alert"]')?.textContent?.includes('Connection lost'));
    assert.equal(document.querySelectorAll('.cart-item').length,0,'Checkout still mounted for retry');
    await click('.checkout-place');
    assert.equal(checkoutBodies.length,2);assert.deepEqual(checkoutBodies[0],checkoutBodies[1],'Network retry reuses exact payload/key');
    assert.equal(window.location.hash,'#my-orders/100');assert.ok(document.querySelector('[role="dialog"]')?.textContent?.includes('LM-COD-TEST'));
    await click('.modal header button');await click('.sidebar-nav button[title="Giỏ hàng"]');assert.ok(document.querySelector('.shopping-empty'),'Successful order clears cart');
    assert.equal(writes.filter(p=>p!=='checkout/quote'&&p!=='checkout').length,0);
    assert.equal(reads.some(path => ['cart', 'checkout', 'inventory', 'orders', 'customers'].includes(path)), false, 'Shopping must not require management APIs');
    console.log('Passed: stock availability, API retry, invalid storage, COD review, policy consent, network retry, order navigation and cart clearing.');
} finally {
    if (root) await unmount();
    dom.window.close();
}

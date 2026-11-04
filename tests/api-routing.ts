import assert from 'node:assert/strict';
import { vercelRequest } from '../backend/src/config/vercelRequest.js';
import { apiPath } from '../backend/src/config/apiPath.js';
let checks = 0;
for (const [query, pathname] of [['path=bootstrap', '/api/bootstrap'], ['path=products/12', '/api/products/12'], ['path=auth/login', '/api/auth/login'], ['path=store/products&search=dress', '/api/store/products']]) {
    const req = vercelRequest(new Request('https://shop.example/api/index?' + query));
    assert.equal(new URL(req.url).pathname, pathname);
    assert.equal(new URL(req.url).searchParams.has('path'), false);
    checks += 2;
}
for (const query of ['', 'path=bootstrap&path=users', 'path=../users', 'path=products//12', 'path=%2Fusers', 'path=unknown-route', 'path=products%3Fadmin%3Dtrue', 'path=auth/login/extra']) {
    assert.throws(() => vercelRequest(new Request('https://shop.example/api/index?' + query)));
    checks++;
}
for (const pathname of ['/api/products/1', '/api/checkout/quote', '/api/my-orders/1/cancel']) {
    assert.ok(apiPath(pathname)); checks++;
}
const original = new Request('https://shop.example/api/products?search=dress');
assert.equal(vercelRequest(original), original); checks++;
console.log(`Passed ${checks} API routing checks.`);

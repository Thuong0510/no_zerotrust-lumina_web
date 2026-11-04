import assert from 'node:assert/strict';
import { requestUrl } from '../backend/src/config/requestUrl.js';

let checks = 0;
for (const origin of ['http://localhost:3000', 'http://127.0.0.1:5173']) {
    const config = { origin, production: false };
    for (const host of ['localhost:3000', '127.0.0.1:3000', 'localhost:5173', '127.0.0.1:5174', '[::1]:5173']) {
        for (const peer of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
            assert.equal(requestUrl('/api/auth/login?q=1', host, peer, config).href, `http://${host}/api/auth/login?q=1`);
            checks++;
        }
    }
    for (const host of [undefined, 'evil.test:5173', 'localhost.evil.test', 'localhost:70000', 'localhost:5173@evil.test', 'localhost:5173/other', 'localhost:5173?x', 'localhost:5173#x']) {
        assert.equal(requestUrl('/api/auth/login', host, '127.0.0.1', config).origin, origin);
        checks++;
    }
    for (const peer of ['192.168.1.2', '10.0.0.1', undefined]) {
        assert.equal(requestUrl('/api/auth/login', 'localhost:5173', peer, config).origin, origin);
        checks++;
    }
}
for (const config of [{ origin: 'https://lumina.test', production: true }, { origin: 'http://localhost:3000', production: true }, { origin: 'https://lumina.test', production: false }]) {
    assert.equal(requestUrl('/api/bootstrap', '127.0.0.1:5173', '127.0.0.1', config).origin, config.origin);
    checks++;
}
console.log(`Passed ${checks} request URL checks: local aliases, Vite ports, invalid Host, remote peers, production.`);

// An isolated PostgreSQL WASM instance; never reads .env or connects to the real database.
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

process.env.DOTENV_CONFIG_PATH = '.lumina-test-env-' + process.pid;
Object.assign(process.env, { NODE_ENV: 'test', DEMO_MODE: 'false', DATABASE_SSL: 'false', DATABASE_SCHEMA: 'lumina', SUPABASE_URL: '', SUPABASE_STORAGE_KEY: '' });
const port = Number(process.env.FASHION_TEST_PG_PORT || 55434);
process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${port}/fashion_test`;
const db = await PGlite.create();
const socket = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 });
await socket.start();
const { all, one, run, pool, transaction } = await import('../backend/src/models/database.js');
const { migrate } = await import('../backend/src/models/migrate.js');
const { seedFashionDemo } = await import('../backend/src/services/fashionDemoSeedService.js');
const { listEntity } = await import('../backend/src/services/catalogService.js');
const { createOrder, updateOrder, inventory } = await import('../backend/src/services/businessService.js');
const { demoKey } = await import('../backend/src/data/fashionDemo.js');
const tables = ['users', 'roles', 'permissions', 'role_permissions', 'user_roles', 'categories', 'suppliers', 'products', 'product_variants', 'inventory', 'inventory_transactions', 'customers', 'orders', 'order_items', 'notifications', 'activity_logs', 'settings'];
const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, await all(`SELECT * FROM ${table} ORDER BY 1,2`)])));
try {
  await migrate();
  await assert.rejects(() => seedFashionDemo(), /Admin\/Employee/);
  assert.equal(Number((await one('SELECT COUNT(*) n FROM products')).n), 0);
  await run("INSERT INTO roles(id,name) VALUES(1,'Admin')");
  const actor = (await run("INSERT INTO users(name,username,email,password_hash,status) VALUES('Existing owner','owner','owner@example.invalid','unchanged-hash','Active')")).meta.last_row_id;
  await run('INSERT INTO user_roles(user_id,role_id) VALUES(?,1)', actor);
  const cat = (await run("INSERT INTO categories(name) VALUES('Existing category')")).meta.last_row_id;
  const supplier = (await run("INSERT INTO suppliers(name,contact_person,phone,email,address) VALUES('Existing supplier','Existing','000','existing@example.invalid','Existing')")).meta.last_row_id;
  const product = (await run("INSERT INTO products(name,sku,category_id,supplier_id,price,cost) VALUES('Existing product','KEEP-001',?,?,100000,50000)", cat, supplier)).meta.last_row_id;
  const variant = (await run("INSERT INTO product_variants(product_id,sku,size,color) VALUES(?,'KEEP-001-M','M','Đen')", product)).meta.last_row_id;
  await run('INSERT INTO inventory(variant_id,quantity) VALUES(?,23)', variant);
  const customer = (await run("INSERT INTO customers(name,email,phone,address) VALUES('Existing customer','keep@example.invalid','000','Existing')")).meta.last_row_id;
  const order = (await run("INSERT INTO orders(code,customer_id,total,payment_method,created_by) VALUES('KEEP-ORDER',?,100000,'Cash',?)", customer, actor)).meta.last_row_id;
  await run('INSERT INTO order_items(order_id,variant_id,quantity,price) VALUES(?,?,1,100000)', order, variant);
  const original = await snapshot();
  await assert.rejects(() => seedFashionDemo(999999), /Admin\/Employee/);
  assert.deepEqual(await snapshot(), original);

  // Fail after categories/products/variants were written, then verify complete rollback.
  await run("ALTER TABLE customers ADD CONSTRAINT seed_failure_probe CHECK(email<>'lf-demo-customer-03@example.invalid')");
  await assert.rejects(() => seedFashionDemo(), /seed_failure_probe/);
  assert.deepEqual(await snapshot(), original);
  await run('ALTER TABLE customers DROP CONSTRAINT seed_failure_probe');

  // Two callers serialize; only one may add data.
  const results = await Promise.all([seedFashionDemo(), seedFashionDemo()]);
  assert.equal(results.filter(r => !r.skipped).length, 1);
  const summary = results.find(r => !r.skipped)!;
  assert.equal(summary.products, 100);
  assert.equal(summary.variants, 520);
  assert.equal(summary.customers, 30);
  assert.equal(summary.orders, 60);
  const seeded = await snapshot();
  for (const table of tables) for (const row of original[table]) {
    assert.ok(seeded[table].some((current: any) => JSON.stringify(current) === JSON.stringify(row)), `Existing ${table} row changed`);
  }
  assert.equal(Number((await one("SELECT COUNT(*) n FROM products WHERE sku LIKE 'LF-DEMO-%'")).n), 100);
  assert.equal(Number((await one("SELECT COUNT(*) n FROM orders o WHERE code LIKE 'LF-DEMO-%' AND total<>(SELECT SUM(quantity*price) FROM order_items WHERE order_id=o.id)")).n), 0);
  assert.equal(Number((await one("SELECT COUNT(*) n FROM inventory i JOIN product_variants v ON v.id=i.variant_id WHERE v.sku LIKE 'LF-DEMO-%' AND i.quantity<>COALESCE((SELECT SUM(quantity) FROM inventory_transactions WHERE variant_id=v.id),0)")).n), 0);
  assert.equal(Number((await one("SELECT COUNT(*) n FROM orders WHERE code LIKE 'LF-DEMO-%' AND status='Completed' AND payment<>'Paid'")).n), 0);
  assert.equal((await all("SELECT DISTINCT status FROM orders WHERE code LIKE 'LF-DEMO-%'")).length, 6);
  assert.equal((await all("SELECT DISTINCT payment_method FROM orders WHERE code LIKE 'LF-DEMO-%'")).length, 3);

  const admin = { id: actor, role: 'Admin', permissions: [] };
  const guest = { id: actor, role: 'Guest', permissions: ['product.view', 'notification.view'] };
  const employee = { id: actor, role: 'Employee', permissions: ['product.view', 'inventory.view', 'order.view', 'order.create', 'order.edit', 'notification.view'] };
  const visible = (await listEntity('products', guest)).filter(p => p.sku.startsWith('LF-DEMO-'));
  assert.equal(visible.length, 96);
  assert.ok(visible.every(p => !('cost' in p) && !('stock' in p) && !('supplier_id' in p)));
  await assert.rejects(() => inventory(guest), (e: any) => e.status === 403);
  await assert.rejects(() => listEntity('suppliers', employee), (e: any) => e.status === 403);
  for (const user of [admin, employee, guest]) {
    const notices = (await listEntity('notifications', user)).filter(n => n.title.startsWith('[LF-DEMO]'));
    assert.ok(notices.every(n => user.role === 'Admin' || n.audience === 'All' || n.audience === user.role));
    assert.equal(notices.length, user.role === 'Admin' ? 4 : 2);
  }
  const req = new Request('http://localhost/api/orders');
  for (const sku of ['LF-DEMO-001-S-DEN', 'LF-DEMO-097-OneSize-DEN', 'LF-DEMO-099-OneSize-DEN']) {
    const v = await one('SELECT id FROM product_variants WHERE sku=?', sku);
    await assert.rejects(() => createOrder(req, admin, { customer_id: customer, payment_method: 'Cash', payment: 'Unpaid', items: [{ variant_id: v.id, quantity: 1 }] }), (e: any) => e.status === 409);
  }
  const completed = await one("SELECT id FROM orders WHERE code LIKE 'LF-DEMO-%' AND status='Completed' LIMIT 1");
  await assert.rejects(() => updateOrder(req, admin, completed.id, { status: 'Cancelled', payment: 'Paid', payment_method: 'Cash' }), (e: any) => e.status === 422);

  // Simulate a real stock edit after import; a rerun must leave it alone.
  await transaction(async () => {
    const v = await one("SELECT id FROM product_variants WHERE sku='LF-DEMO-001-S-DEN'");
    await run('UPDATE inventory SET quantity=1 WHERE variant_id=?', v.id);
    await run("INSERT INTO inventory_transactions(variant_id,action,quantity,note) VALUES(?,'Stock In',1,'After import')", v.id);
  });
  const edited = await snapshot();
  assert.equal((await seedFashionDemo()).skipped, true);
  assert.deepEqual(await snapshot(), edited);
  const marker = await one('SELECT value FROM settings WHERE key=?', demoKey);
  await run('DELETE FROM settings WHERE key=?', demoKey);
  const collision = await snapshot();
  await assert.rejects(() => seedFashionDemo(), /Namespace LF-DEMO/);
  assert.deepEqual(await snapshot(), collision);
  await run('INSERT INTO settings(key,value) VALUES(?,?)', demoKey, marker.value);
  console.log('PASS: counts, linked totals, stock ledger, preservation, concurrent/rerun safety, collision handling, product/order/role/notification cases.');
} finally {
  await pool.end();
  await socket.stop();
  await db.close();
}
